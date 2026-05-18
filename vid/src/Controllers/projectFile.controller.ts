import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne } from "../db.js";
import logger from "../Utils/logger.js";
import { getPresignedUrl } from "../Utils/s3.js";
import { createOrUpdateMediaAsset, listMediaAssetsForProjectFiles } from "../Services/mediaAsset.service.js";
import { areDevPlaceholdersAllowed } from "../Services/payment.service.js";

type Handler = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

const VALID_CATEGORIES = new Set(["raw", "reference", "deliverable", "final", "asset"]);
const VALID_STATUSES = new Set(["PENDING_REVIEW", "APPROVED", "CHANGES_REQUESTED", "ARCHIVED"]);

function isDevPlaceholderRef(value: string): boolean {
  return value.startsWith("dev-placeholder") || value.startsWith("dev-placeholder://");
}

/**
 * Scope = which container a ProjectFile belongs to. Routes mounted under
 * /workspace/projects/:jobId pass jobId; routes under /workspace/orders/:orderId
 * pass orderId. The DB column lives on the same row (jobId or orderId), so once
 * we know the scope every downstream query just swaps the WHERE clause column.
 */
type WorkspaceScope = { kind: "JOB"; id: number } | { kind: "ORDER"; id: number };

function resolveScope(req: ExpressRequest): WorkspaceScope {
  const params = (req.params || {}) as Record<string, string>;
  if (params.orderId != null && params.orderId !== "") {
    const id = parseInt(params.orderId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      throw new ApiError(400, "Invalid order id");
    }
    return { kind: "ORDER", id };
  }
  const id = parseInt(params.jobId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ApiError(400, "Invalid project id");
  }
  return { kind: "JOB", id };
}

type ScopeRole = "client" | "freelancer";

async function assertJobAccess(jobId: number, userId: number): Promise<{ row: DbRow; role: ScopeRole }> {
  const row = await sqlOne(
    `SELECT id, posted_by_id AS "postedById", freelancer_id AS "freelancerId"
       FROM "Job" WHERE id = $1 AND "deletedAt" IS NULL`,
    [jobId]
  );
  if (!row) throw new ApiError(404, "Project not found");
  const postedById = Number(row.postedById);
  const freelancerId = row.freelancerId == null ? null : Number(row.freelancerId);
  if (postedById !== userId && freelancerId !== userId) {
    throw new ApiError(403, "You are not part of this project");
  }
  return { row, role: postedById === userId ? "client" : "freelancer" };
}

async function assertOrderAccess(orderId: number, userId: number): Promise<{ row: DbRow; role: ScopeRole }> {
  const row = await sqlOne(
    `SELECT o.id,
            o."client_id"      AS "clientId",
            fp."user_id"       AS "freelancerUserId"
       FROM "Order" o
       LEFT JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
      WHERE o.id = $1 AND o."deletedAt" IS NULL`,
    [orderId]
  );
  if (!row) throw new ApiError(404, "Order not found");
  const clientId = Number(row.clientId);
  const freelancerUserId = row.freelancerUserId == null ? null : Number(row.freelancerUserId);
  if (clientId !== userId && freelancerUserId !== userId) {
    throw new ApiError(403, "You are not part of this order");
  }
  return { row, role: clientId === userId ? "client" : "freelancer" };
}

async function assertScopeAccess(scope: WorkspaceScope, userId: number): Promise<ScopeRole> {
  if (scope.kind === "JOB") {
    return (await assertJobAccess(scope.id, userId)).role;
  }
  return (await assertOrderAccess(scope.id, userId)).role;
}

const SCOPE_COLUMN: Record<WorkspaceScope["kind"], "jobId" | "orderId"> = {
  JOB: "jobId",
  ORDER: "orderId",
};

const listProjectFiles: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const scope = resolveScope(req);
    await assertScopeAccess(scope, userId);

    const scopeCol = SCOPE_COLUMN[scope.kind];
    const rows = await sql(
      `SELECT pf.*, u.firstname, u.lastname, u."profilePicture"
         FROM "ProjectFile" pf
         LEFT JOIN "User" u ON u.id = pf."uploaderId"
        WHERE pf."${scopeCol}" = $1
        ORDER BY pf."createdAt" DESC
        LIMIT 200`,
      [scope.id]
    );

    const mediaRows = await listMediaAssetsForProjectFiles(rows.map((r) => Number(r.id)));
    const mediaByFile = new Map(mediaRows.map((m) => [Number(m.projectFileId), m]));

    const out = await Promise.all(
      rows.map(async (r) => {
        // ProjectFile rows can store either a public URL in `url` or an S3 key
        // in `fileKey` (the gig-side delivery flow uses fileKey). Pick whichever
        // is populated and presign once below.
        let url: string = String(r.url || r.fileKey || "");
        if (url && !/^https?:/i.test(url)) {
          try {
            url = await getPresignedUrl(url);
          } catch {
            // leave as-is; client will show broken link
          }
        }
        return {
          id: r.id,
          jobId: r.jobId,
          orderId: r.orderId,
          fileName: r.fileName,
          url,
          mimeType: r.mimeType,
          size: Number(r.size || r.fileSize) || 0,
          category: r.category,
          version: Number(r.version) || 1,
          status: r.status,
          note: r.note,
          openCommentCount: Number(r.openCommentCount) || 0,
          totalCommentCount: Number(r.totalCommentCount) || 0,
          durationSec: r.durationSec == null ? null : Number(r.durationSec),
          media: mediaByFile.get(Number(r.id)) || null,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          uploader: r.uploaderId
            ? {
                id: r.uploaderId,
                firstname: r.firstname,
                lastname: r.lastname,
                avatar: r.profilePicture,
              }
            : null,
        };
      })
    );

    return res.status(200).json(new ApiResponse(200, { files: out, total: out.length }, "Files retrieved"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`listProjectFiles: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to load files"));
  }
};

const createProjectFile: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const scope = resolveScope(req);
    const role = await assertScopeAccess(scope, userId);

    const body = (req.body || {}) as Record<string, unknown>;
    const fileName = String(body.fileName || "").trim();
    const url = String(body.url || "").trim();
    const mimeType = body.mimeType ? String(body.mimeType) : null;
    const size = Number(body.size) || 0;
    const category = String(body.category || "deliverable");
    const note = body.note ? String(body.note) : null;

    if (!fileName) return next(new ApiError(400, "fileName is required"));
    if (!url) return next(new ApiError(400, "url is required (S3 key or absolute URL)"));
    if (isDevPlaceholderRef(url) && !areDevPlaceholdersAllowed()) {
      return next(new ApiError(400, "Development placeholder uploads are disabled"));
    }
    if (!VALID_CATEGORIES.has(category)) return next(new ApiError(400, "Invalid category"));

    // Role-based category gate: clients only ever attach reference material
    // (briefs, brand assets) and the editor is the sole source of deliverables
    // / review cuts. This protects the milestone-completion flow from
    // accidentally treating client uploads as work-product.
    if (role === "client" && category !== "reference") {
      return next(new ApiError(403, "Clients can only upload reference material in the workspace"));
    }
    if (role === "freelancer" && category === "reference") {
      return next(new ApiError(403, "Reference material is owned by the client; ask them to upload it"));
    }

    const scopeCol = SCOPE_COLUMN[scope.kind];

    // Auto-bump version when a file with the same name exists in this scope
    const prev = await sqlOne(
      `SELECT MAX(version) AS v FROM "ProjectFile" WHERE "${scopeCol}" = $1 AND "fileName" = $2`,
      [scope.id, fileName]
    );
    const version = (Number(prev?.v) || 0) + 1;

    // The ProjectFile schema evolved over time and now has both jobId/orderId
    // (nullable) plus a few legacy denormalised columns (uploadedBy, fileKey,
    // fileSize) that other paths read from. Populate them all so list/delivery
    // queries that still reference the legacy columns keep working regardless
    // of which surface created the row.
    const insertJobId = scope.kind === "JOB" ? scope.id : null;
    const insertOrderId = scope.kind === "ORDER" ? scope.id : null;
    const row = await sqlOne(
      `INSERT INTO "ProjectFile"
         ("jobId","orderId","uploaderId","uploadedBy","fileName","url","fileKey","mimeType","size","fileSize","category","version","status","note","createdAt","updatedAt")
       VALUES ($1,$2,$3,$3,$4,$5,$5,$6,$7,$7,$8,$9,'PENDING_REVIEW',$10,NOW(),NOW())
       RETURNING *`,
      [insertJobId, insertOrderId, userId, fileName, url, mimeType, size, category, version, note]
    );

    const media = String(mimeType || "").startsWith("video/")
      ? await createOrUpdateMediaAsset({
          sourceType: "PROJECT_FILE",
          projectFileId: Number(row?.id),
          ownerId: userId,
          scopeType: scope.kind,
          jobId: scope.kind === "JOB" ? scope.id : undefined,
          orderId: scope.kind === "ORDER" ? scope.id : undefined,
          originalKey: url,
          originalUrl: url,
          mimeType,
          fileSize: size,
          metadata: { category, note },
        })
      : null;

    return res.status(201).json(new ApiResponse(201, { ...(row as DbRow), media }, "File added"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`createProjectFile: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to add file"));
  }
};

const setFileStatus: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const scope = resolveScope(req);
    const fileId = parseInt(String(req.params.fileId), 10);
    await assertScopeAccess(scope, userId);

    const status = String((req.body as Record<string, unknown> | undefined)?.status || "");
    const note = (req.body as Record<string, unknown> | undefined)?.note;
    if (!VALID_STATUSES.has(status)) return next(new ApiError(400, "Invalid status"));

    const scopeCol = SCOPE_COLUMN[scope.kind];
    const updated = await sqlOne(
      `UPDATE "ProjectFile"
          SET status = $1,
              note = COALESCE($2, note),
              "updatedAt" = NOW()
        WHERE id = $3 AND "${scopeCol}" = $4
        RETURNING *`,
      [status, note != null ? String(note) : null, fileId, scope.id]
    );

    if (!updated) return next(new ApiError(404, "File not found"));
    return res.status(200).json(new ApiResponse(200, updated, "File status updated"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`setFileStatus: ${(e as Error).message}`);
    return next(new ApiError(500, "Failed to update file"));
  }
};

const deleteProjectFile: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const scope = resolveScope(req);
    const fileId = parseInt(String(req.params.fileId), 10);
    const role = await assertScopeAccess(scope, userId);

    const scopeCol = SCOPE_COLUMN[scope.kind];
    const file = await sqlOne(
      `SELECT id, "uploaderId", category FROM "ProjectFile" WHERE id = $1 AND "${scopeCol}" = $2`,
      [fileId, scope.id]
    );
    if (!file) return next(new ApiError(404, "File not found"));

    // Symmetry with createProjectFile: clients can only manage reference
    // material, editors can only manage deliverables/raw/asset/final files.
    if (role === "client" && file.category !== "reference") {
      return next(
        new ApiError(403, "Only the editor can remove review cuts. Request changes inside the review instead.")
      );
    }
    if (role === "freelancer" && file.category === "reference") {
      return next(new ApiError(403, "Reference material is owned by the client; ask them to remove it."));
    }

    // Either the uploader, or the scope owner (job poster / order client) may
    // remove the file. We look up the owner per scope kind so the same
    // permissions semantics apply on both surfaces.
    let ownerId: number | null = null;
    if (scope.kind === "JOB") {
      const job = await sqlOne(`SELECT posted_by_id AS p FROM "Job" WHERE id = $1`, [scope.id]);
      ownerId = Number(job?.p) || null;
    } else {
      const order = await sqlOne(`SELECT client_id AS p FROM "Order" WHERE id = $1`, [scope.id]);
      ownerId = Number(order?.p) || null;
    }
    if (Number(file.uploaderId) !== userId && ownerId !== userId) {
      return next(new ApiError(403, "Only the uploader or the project owner can delete this file"));
    }

    await sql(`DELETE FROM "ProjectFile" WHERE id = $1`, [fileId]);
    return res.status(200).json(new ApiResponse(200, { ok: true }, "File deleted"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`deleteProjectFile: ${(e as Error).message}`);
    return next(new ApiError(500, "Failed to delete file"));
  }
};

// ── Pinned messages ────────────────────────────────────────────────────────

const listPinned: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const scope = resolveScope(req);
    await assertScopeAccess(scope, userId);

    const scopeCol = SCOPE_COLUMN[scope.kind];
    const rows = await sql(
      `SELECT p.*, m.content, m.timestamp, m."senderId",
              u.firstname, u.lastname, u."profilePicture"
         FROM "PinnedMessage" p
         LEFT JOIN "Message" m ON m.id = p."messageId"
         LEFT JOIN "User" u ON u.id = m."senderId"
        WHERE p."${scopeCol}" = $1 AND m.id IS NOT NULL
        ORDER BY p."createdAt" DESC
        LIMIT 50`,
      [scope.id]
    );

    const out = rows.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      orderId: r.orderId,
      messageId: r.messageId,
      pinnedById: r.pinnedById,
      pinnedAt: r.createdAt,
      message: {
        id: r.messageId,
        content: r.content,
        timestamp: r.timestamp,
        sender: {
          id: r.senderId,
          firstname: r.firstname,
          lastname: r.lastname,
          avatar: r.profilePicture,
        },
      },
    }));

    return res.status(200).json(new ApiResponse(200, { pinned: out }, "Pinned messages"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    return next(new ApiError(500, "Failed to load pinned messages"));
  }
};

const togglePin: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const scope = resolveScope(req);
    await assertScopeAccess(scope, userId);

    const messageId = String((req.body as Record<string, unknown> | undefined)?.messageId || "").trim();
    if (!messageId) return next(new ApiError(400, "messageId is required"));

    const scopeCol = SCOPE_COLUMN[scope.kind];
    const exists = await sqlOne(
      `SELECT id FROM "PinnedMessage" WHERE "${scopeCol}" = $1 AND "messageId" = $2`,
      [scope.id, messageId]
    );

    if (exists) {
      await sql(`DELETE FROM "PinnedMessage" WHERE id = $1`, [exists.id]);
      return res.status(200).json(new ApiResponse(200, { pinned: false }, "Unpinned"));
    }

    // The PinnedMessage scope-CHECK constraint requires exactly one of jobId
    // or orderId to be non-null, so we explicitly INSERT only the active one.
    if (scope.kind === "JOB") {
      await sql(
        `INSERT INTO "PinnedMessage" ("jobId","messageId","pinnedById") VALUES ($1,$2,$3)`,
        [scope.id, messageId, userId]
      );
    } else {
      await sql(
        `INSERT INTO "PinnedMessage" ("orderId","messageId","pinnedById") VALUES ($1,$2,$3)`,
        [scope.id, messageId, userId]
      );
    }
    return res.status(200).json(new ApiResponse(200, { pinned: true }, "Pinned"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    return next(new ApiError(500, "Failed to toggle pin"));
  }
};

export {
  listProjectFiles,
  createProjectFile,
  setFileStatus,
  deleteProjectFile,
  listPinned,
  togglePin,
};
