/**
 * Video Review controller — Frame.io / Vimeo Review style timecoded comments
 * with optional frame drawings, threaded replies, status workflow, and live
 * sync via Socket.IO.
 *
 * Endpoints are mounted twice in the router so the same handlers serve both
 * job-scoped and order-scoped surfaces:
 *   /workspace/projects/:jobId/files/:fileId/review/...
 *   /workspace/orders/:orderId/files/:fileId/review/...
 *
 *   GET    /comments               list all comments + replies
 *   POST   /comments               add a top-level comment at a timestamp
 *   POST   /comments/:id/replies   reply to an existing comment
 *   PATCH  /comments/:id           edit content / drawing
 *   POST   /comments/:id/resolve   mark resolved (or re-open)
 *   DELETE /comments/:id           delete (author or scope owner)
 *   GET    /summary                {open, resolved, total, byTime: [...] }
 *
 * All endpoints validate that the caller is a participant on the parent scope.
 */
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne } from "../db.js";
import logger from "../Utils/logger.js";
import { getIO } from "../socket.js";
import { EVENTS, ROOMS } from "../../../shared/socketEvents.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<unknown> | unknown;

type ScopeKind = "JOB" | "ORDER";
type ScopeRole = "client" | "freelancer";

interface ScopeAccess {
  scopeKind: ScopeKind;
  scopeId: number;
  // Convenience aliases. `jobId` is populated for JOB scope, `orderId` for
  // ORDER scope, but never both — the DB CHECK constraint rejects ambiguous
  // rows. Frontend callers continue to receive a `jobId` field on JOB scopes
  // for backward compatibility.
  jobId: number | null;
  orderId: number | null;
  fileId: number;
  ownerId: number;
  freelancerId: number | null;
  // Caller's role on the scope. "client" for the job poster / order client,
  // "freelancer" for the assigned editor. Used to gate resolve permissions
  // (only the editor decides when feedback is addressed).
  role: ScopeRole;
  fileMime: string | null;
  fileUrl: string | null;
}

async function loadAccess(req: ExpressRequest, next: NextFunction): Promise<ScopeAccess | null> {
  if (!req.user?.id) {
    next(new ApiError(401, "Unauthorized"));
    return null;
  }
  const params = req.params as Record<string, string>;
  const fileId = parseInt(params.fileId, 10);
  if (!Number.isFinite(fileId)) {
    next(new ApiError(400, "Invalid fileId"));
    return null;
  }

  // ── ORDER scope ─────────────────────────────────────────────────────────
  if (params.orderId != null && params.orderId !== "") {
    const orderId = parseInt(params.orderId, 10);
    if (!Number.isFinite(orderId)) {
      next(new ApiError(400, "Invalid orderId"));
      return null;
    }
    const order = await sqlOne(
      `SELECT o."client_id" AS "clientId", fp."user_id" AS "freelancerUserId"
         FROM "Order" o
         LEFT JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
        WHERE o.id = $1 AND o."deletedAt" IS NULL`,
      [orderId]
    );
    if (!order) {
      next(new ApiError(404, "Order not found"));
      return null;
    }
    const clientId = Number(order.clientId);
    const freelancerUserId = order.freelancerUserId == null ? null : Number(order.freelancerUserId);
    if (req.user.id !== clientId && req.user.id !== freelancerUserId) {
      next(new ApiError(403, "You are not a participant on this order"));
      return null;
    }
    const file = await sqlOne(
      `SELECT id, "mimeType", url, "fileKey" FROM "ProjectFile" WHERE id = $1 AND "orderId" = $2`,
      [fileId, orderId]
    );
    if (!file) {
      next(new ApiError(404, "File not found in this order"));
      return null;
    }
    return {
      scopeKind: "ORDER",
      scopeId: orderId,
      jobId: null,
      orderId,
      fileId,
      ownerId: clientId,
      freelancerId: freelancerUserId,
      role: req.user.id === clientId ? "client" : "freelancer",
      fileMime: (file.mimeType as string | null | undefined) ?? null,
      fileUrl: ((file.url || file.fileKey) as string | null | undefined) ?? null,
    };
  }

  // ── JOB scope (default) ─────────────────────────────────────────────────
  const jobId = parseInt(params.jobId, 10);
  if (!Number.isFinite(jobId)) {
    next(new ApiError(400, "Invalid jobId"));
    return null;
  }
  const job = await sqlOne(
    `SELECT j.posted_by_id AS "postedById", j.freelancer_id AS "freelancerId"
       FROM "Job" j
      WHERE j.id = $1 AND j."deletedAt" IS NULL`,
    [jobId]
  );
  if (!job) {
    next(new ApiError(404, "Job not found"));
    return null;
  }
  const postedById = Number(job.postedById);
  const freelancerId = job.freelancerId == null ? null : Number(job.freelancerId);
  if (req.user.id !== postedById && req.user.id !== freelancerId) {
    next(new ApiError(403, "You are not a participant on this job"));
    return null;
  }
  const file = await sqlOne(
    `SELECT id, "mimeType", url FROM "ProjectFile" WHERE id = $1 AND "jobId" = $2`,
    [fileId, jobId]
  );
  if (!file) {
    next(new ApiError(404, "File not found in this project"));
    return null;
  }
  return {
    scopeKind: "JOB",
    scopeId: jobId,
    jobId,
    orderId: null,
    fileId,
    ownerId: postedById,
    freelancerId,
    role: req.user.id === postedById ? "client" : "freelancer",
    fileMime: (file.mimeType as string | null | undefined) ?? null,
    fileUrl: (file.url as string | null | undefined) ?? null,
  };
}

/**
 * Counts open (top-level) review comments for a given workspace scope.
 * Used by milestone-completion (jobs) and order-completion (gigs) flows to
 * block work-in-progress from being marked done while feedback is still open.
 */
export async function countOpenReviewComments(scope: {
  kind: ScopeKind;
  id: number;
}): Promise<number> {
  const col = scope.kind === "JOB" ? '"jobId"' : '"orderId"';
  const row = await sqlOne(
    `SELECT COUNT(*)::int AS open
       FROM "VideoReviewComment"
      WHERE ${col} = $1 AND status = 'OPEN' AND "parentId" IS NULL`,
    [scope.id]
  );
  return Number(row?.open) || 0;
}

async function refreshFileCounts(fileId: number) {
  await sql(
    `UPDATE "ProjectFile" pf
        SET "openCommentCount"  = COALESCE(c.open_count,  0),
            "totalCommentCount" = COALESCE(c.total_count, 0),
            "updatedAt" = NOW()
       FROM (
         SELECT
           COUNT(*) FILTER (WHERE status = 'OPEN' AND "parentId" IS NULL)::int AS open_count,
           COUNT(*) FILTER (WHERE "parentId" IS NULL)::int                       AS total_count
         FROM "VideoReviewComment"
         WHERE "fileId" = $1
       ) c
      WHERE pf.id = $1`,
    [fileId]
  );
}

function broadcast(ctx: ScopeAccess, event: string, payload: unknown) {
  try {
    // ROOMS.job/order are set up symmetrically in shared/socketEvents.js so we
    // can fan out to the right room without splitting the broadcast call.
    const room = ctx.scopeKind === "JOB" ? ROOMS.job(ctx.scopeId) : ROOMS.order(ctx.scopeId);
    const io = getIO();
    if (!io) return;
    io.to(room).emit(event, payload);
  } catch (e) {
    logger.warn(`review broadcast failed: ${(e as Error).message}`);
  }
}

async function loadAuthorMap(authorIds: number[]) {
  const ids = [...new Set(authorIds.filter((id) => Number.isFinite(id)))];
  if (!ids.length) return new Map<number, Record<string, unknown>>();
  const rows = await sql(
    `SELECT id, firstname, lastname, "profilePicture", role
       FROM "User"
      WHERE id = ANY($1::int[])`,
    [ids]
  );
  return new Map<number, Record<string, unknown>>(
    rows.map((r) => [
      Number(r.id),
      {
        id: Number(r.id),
        firstname: r.firstname,
        lastname: r.lastname,
        name: `${r.firstname || ""} ${r.lastname || ""}`.trim(),
        profilePicture: r.profilePicture,
        role: r.role,
      },
    ])
  );
}

function shapeComment(row: Record<string, unknown>, authorMap: Map<number, Record<string, unknown>>) {
  return {
    id: row.id,
    jobId: row.jobId == null ? null : Number(row.jobId),
    orderId: row.orderId == null ? null : Number(row.orderId),
    fileId: Number(row.fileId),
    parentId: row.parentId ?? null,
    timestampSec: row.timestampSec == null ? 0 : Number(row.timestampSec),
    endTimestampSec: row.endTimestampSec == null ? null : Number(row.endTimestampSec),
    content: row.content,
    drawing: row.drawing ?? null,
    status: row.status,
    resolvedById: row.resolvedById == null ? null : Number(row.resolvedById),
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: authorMap.get(Number(row.authorId)) || { id: Number(row.authorId) },
  };
}

const listComments: Handler = async (req, res, next) => {
  try {
    const ctx = await loadAccess(req, next);
    if (!ctx) return;
    const rows = await sql(
      `SELECT * FROM "VideoReviewComment"
        WHERE "fileId" = $1
        ORDER BY COALESCE("parentId"::text, id::text), "createdAt" ASC`,
      [ctx.fileId]
    );
    const authorMap = await loadAuthorMap(rows.map((r) => Number(r.authorId)));
    return res
      .status(200)
      .json(new ApiResponse(200, rows.map((r) => shapeComment(r, authorMap)), "Comments loaded"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`listComments: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, `Failed to list comments: ${(e as Error).message}`));
  }
};

const reviewSummary: Handler = async (req, res, next) => {
  try {
    const ctx = await loadAccess(req, next);
    if (!ctx) return;
    const summaryRow = await sqlOne(
      `SELECT
         COUNT(*)                                                       ::int AS total,
         COUNT(*) FILTER (WHERE status = 'OPEN')                        ::int AS open,
         COUNT(*) FILTER (WHERE status = 'RESOLVED')                    ::int AS resolved,
         COUNT(*) FILTER (WHERE "parentId" IS NULL)                     ::int AS top_level
       FROM "VideoReviewComment"
       WHERE "fileId" = $1`,
      [ctx.fileId]
    );
    const buckets = await sql(
      `SELECT FLOOR("timestampSec" / 5)::int AS bucket,
              COUNT(*)                       ::int AS count
         FROM "VideoReviewComment"
        WHERE "fileId" = $1 AND "parentId" IS NULL
        GROUP BY 1
        ORDER BY 1`,
      [ctx.fileId]
    );
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          total: summaryRow?.total ?? 0,
          open: summaryRow?.open ?? 0,
          resolved: summaryRow?.resolved ?? 0,
          topLevel: summaryRow?.top_level ?? 0,
          buckets: buckets.map((b) => ({
            tStart: Number(b.bucket ?? 0) * 5,
            count: Number(b.count ?? 0),
          })),
        },
        "Review summary"
      )
    );
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`reviewSummary: ${(e as Error).message}`);
    return next(new ApiError(500, `Failed to load summary: ${(e as Error).message}`));
  }
};

const addComment: Handler = async (req, res, next) => {
  try {
    const ctx = await loadAccess(req, next);
    if (!ctx) return;
    const body = (req.body || {}) as Record<string, unknown>;
    const content = String(body.content ?? "").trim();
    const timestampSec = body.timestampSec == null ? 0 : Math.max(0, Number(body.timestampSec));
    const endTimestampSec =
      body.endTimestampSec == null ? null : Math.max(timestampSec, Number(body.endTimestampSec));
    const drawing = body.drawing && typeof body.drawing === "object" ? body.drawing : null;
    const parentId = body.parentId ? String(body.parentId) : null;
    if (!content && !drawing) {
      return next(new ApiError(400, "Comment content or drawing is required"));
    }
    if (!Number.isFinite(timestampSec)) {
      return next(new ApiError(400, "Invalid timestampSec"));
    }
    if (parentId) {
      const parent = await sqlOne(
        `SELECT id, "fileId" FROM "VideoReviewComment" WHERE id = $1`,
        [parentId]
      );
      if (!parent || Number(parent.fileId) !== ctx.fileId) {
        return next(new ApiError(400, "Parent comment not found in this file"));
      }
    }
    // CHECK constraint requires exactly one of jobId/orderId. We store the
    // active scope's id in the matching column and leave the other NULL so the
    // resulting row is unambiguous and the activity feed can join either way.
    const inserted = await sqlOne(
      `INSERT INTO "VideoReviewComment"
         ("jobId","orderId","fileId","authorId","timestampSec","endTimestampSec",content,drawing,"parentId",status,"createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'OPEN',NOW(),NOW())
       RETURNING *`,
      [
        ctx.jobId,
        ctx.orderId,
        ctx.fileId,
        req.user!.id,
        timestampSec,
        endTimestampSec,
        content,
        drawing ? JSON.stringify(drawing) : null,
        parentId,
      ]
    );
    if (!inserted) return next(new ApiError(500, "Insert returned no row"));
    await refreshFileCounts(ctx.fileId);
    const authorMap = await loadAuthorMap([req.user!.id]);
    const shaped = shapeComment(inserted, authorMap);
    broadcast(ctx, EVENTS.REVIEW_COMMENT_ADDED, shaped);
    return res.status(201).json(new ApiResponse(201, shaped, "Comment added"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`addComment: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, `Failed to add comment: ${(e as Error).message}`));
  }
};

const editComment: Handler = async (req, res, next) => {
  try {
    const ctx = await loadAccess(req, next);
    if (!ctx) return;
    const commentId = String((req.params as Record<string, string>).commentId);
    const body = (req.body || {}) as Record<string, unknown>;
    const existing = await sqlOne(
      `SELECT * FROM "VideoReviewComment" WHERE id = $1 AND "fileId" = $2`,
      [commentId, ctx.fileId]
    );
    if (!existing) return next(new ApiError(404, "Comment not found"));
    if (Number(existing.authorId) !== req.user!.id) {
      return next(new ApiError(403, "You can only edit your own comments"));
    }
    const newContent =
      typeof body.content === "string" ? body.content.trim() : (existing.content as string);
    const newDrawing =
      body.drawing === null
        ? null
        : body.drawing && typeof body.drawing === "object"
        ? JSON.stringify(body.drawing)
        : (existing.drawing as unknown);
    const updated = await sqlOne(
      `UPDATE "VideoReviewComment"
          SET content = $1, drawing = $2::jsonb, "updatedAt" = NOW()
        WHERE id = $3
        RETURNING *`,
      [newContent, newDrawing as string | null, commentId]
    );
    const authorMap = await loadAuthorMap([Number(updated!.authorId)]);
    const shaped = shapeComment(updated!, authorMap);
    broadcast(ctx, EVENTS.REVIEW_COMMENT_UPDATED, shaped);
    return res.status(200).json(new ApiResponse(200, shaped, "Comment updated"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`editComment: ${(e as Error).message}`);
    return next(new ApiError(500, `Failed to update comment: ${(e as Error).message}`));
  }
};

const setResolved: Handler = async (req, res, next) => {
  try {
    const ctx = await loadAccess(req, next);
    if (!ctx) return;
    if (ctx.role !== "freelancer") {
      // Only the editor can resolve / re-open feedback. Closing a comment is
      // what unblocks milestone completion (jobs) and order completion (gigs);
      // letting the client toggle that would defeat the gate.
      return next(new ApiError(403, "Only the editor can resolve review comments"));
    }
    const commentId = String((req.params as Record<string, string>).commentId);
    const body = (req.body || {}) as Record<string, unknown>;
    const targetStatus = body.status === "OPEN" ? "OPEN" : "RESOLVED";
    const existing = await sqlOne(
      `SELECT * FROM "VideoReviewComment" WHERE id = $1 AND "fileId" = $2`,
      [commentId, ctx.fileId]
    );
    if (!existing) return next(new ApiError(404, "Comment not found"));
    const updated = await sqlOne(
      `UPDATE "VideoReviewComment"
          SET status = $1,
              "resolvedById" = CASE WHEN $1 = 'RESOLVED' THEN $2::int ELSE NULL END,
              "resolvedAt"   = CASE WHEN $1 = 'RESOLVED' THEN NOW() ELSE NULL END,
              "updatedAt" = NOW()
        WHERE id = $3
        RETURNING *`,
      [targetStatus, req.user!.id, commentId]
    );
    await refreshFileCounts(ctx.fileId);
    const authorMap = await loadAuthorMap([Number(updated!.authorId), req.user!.id]);
    const shaped = shapeComment(updated!, authorMap);
    broadcast(ctx, EVENTS.REVIEW_COMMENT_UPDATED, shaped);
    return res.status(200).json(new ApiResponse(200, shaped, `Comment ${targetStatus.toLowerCase()}`));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`setResolved: ${(e as Error).message}`);
    return next(new ApiError(500, `Failed to update status: ${(e as Error).message}`));
  }
};

const deleteComment: Handler = async (req, res, next) => {
  try {
    const ctx = await loadAccess(req, next);
    if (!ctx) return;
    const commentId = String((req.params as Record<string, string>).commentId);
    const existing = await sqlOne(
      `SELECT * FROM "VideoReviewComment" WHERE id = $1 AND "fileId" = $2`,
      [commentId, ctx.fileId]
    );
    if (!existing) return next(new ApiError(404, "Comment not found"));
    // Either the author or the scope owner (job poster / order client) may delete.
    if (Number(existing.authorId) !== req.user!.id && ctx.ownerId !== req.user!.id) {
      return next(new ApiError(403, "You don't have permission to delete this comment"));
    }
    await sql(`DELETE FROM "VideoReviewComment" WHERE id = $1`, [commentId]);
    await refreshFileCounts(ctx.fileId);
    broadcast(ctx, EVENTS.REVIEW_COMMENT_DELETED, {
      commentId,
      fileId: ctx.fileId,
      jobId: ctx.jobId,
      orderId: ctx.orderId,
      parentId: existing.parentId ?? null,
    });
    return res.status(200).json(new ApiResponse(200, { id: commentId }, "Comment deleted"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`deleteComment: ${(e as Error).message}`);
    return next(new ApiError(500, `Failed to delete comment: ${(e as Error).message}`));
  }
};

export {
  listComments,
  addComment,
  editComment,
  setResolved,
  deleteComment,
  reviewSummary,
};
