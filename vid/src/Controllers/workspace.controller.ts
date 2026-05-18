import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne } from "../db.js";
import logger from "../Utils/logger.js";
import { getPresignedUrl } from "../Utils/s3.js";
import { countOpenReviewComments } from "./videoReview.controller.js";

type Handler = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

/**
 * Resolve & authorize a job + the "peer" (the other side of the conversation).
 * Used by every workspace endpoint so we have one consistent shape.
 */
async function loadJobPeer(jobId: number, userId: number) {
  const job = await sqlOne(
    `SELECT j.id, j.title, j.description, j.status, j."budgetMin", j."budgetMax",
            j.deadline, j.location, j."projectLength", j."requiredSkills",
            j."isVerified", j.category, j."createdAt", j."updatedAt",
            j.posted_by_id   AS "postedById",
            j.freelancer_id  AS "freelancerId",
            client.id        AS client_id,
            client.firstname AS client_fn,
            client.lastname  AS client_ln,
            client."profilePicture" AS client_pp,
            client.company   AS client_co,
            client.email     AS client_email,
            fl.id            AS fl_id,
            fl.firstname     AS fl_fn,
            fl.lastname      AS fl_ln,
            fl."profilePicture" AS fl_pp,
            fl.email         AS fl_email,
            fl.rating        AS fl_rating,
            fp."jobTitle"    AS fp_title,
            fp.skills        AS fp_skills,
            fp."hourlyRate"  AS fp_rate
       FROM "Job" j
       LEFT JOIN "User" client ON client.id = j.posted_by_id
       LEFT JOIN "User" fl     ON fl.id = j.freelancer_id
       LEFT JOIN "FreelancerProfile" fp ON fp.user_id = j.freelancer_id
      WHERE j.id = $1 AND j."deletedAt" IS NULL`,
    [jobId]
  );

  if (!job) throw new ApiError(404, "Project not found");

  const postedById = Number(job.postedById);
  const freelancerId = job.freelancerId == null ? null : Number(job.freelancerId);

  if (postedById !== userId && freelancerId !== userId) {
    throw new ApiError(403, "You are not part of this project");
  }

  const role = postedById === userId ? "client" : "freelancer";
  const peer =
    role === "client"
      ? freelancerId
        ? {
            id: freelancerId,
            firstname: job.fl_fn,
            lastname: job.fl_ln,
            avatar: job.fl_pp,
            profilePicture: job.fl_pp,
            email: job.fl_email,
            rating: job.fl_rating,
            jobTitle: job.fp_title,
            skills: job.fp_skills,
            hourlyRate: job.fp_rate,
            kind: "freelancer",
          }
        : null
      : {
          id: postedById,
          firstname: job.client_fn,
          lastname: job.client_ln,
          avatar: job.client_pp,
          profilePicture: job.client_pp,
          email: job.client_email,
          company: job.client_co,
          kind: "client",
        };

  return {
    role,
    peer,
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      budgetMin: job.budgetMin,
      budgetMax: job.budgetMax,
      deadline: job.deadline,
      location: job.location,
      projectLength: job.projectLength,
      requiredSkills: job.requiredSkills,
      isVerified: job.isVerified,
      category: job.category,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      postedById,
      freelancerId,
    },
  };
}

/**
 * Unified workspace sidebar list. Returns both custom Jobs and Gig Orders the
 * caller participates in, tagged with `kind: "JOB" | "ORDER"` so the frontend
 * can render two segregated sections without re-querying separate endpoints.
 *
 * Each entry is normalised into a common projection (id, title, status, role,
 * peer, deadline, progress, lastMessageAt, unreadHint) plus per-kind extras
 * (`budgetMin/budgetMax/milestoneCount/milestoneDone` for jobs, `orderNumber/
 * package/totalPrice/escrowStatus/revisionsRequested/revisionsCompleted` for
 * orders). Sorted globally by recent activity so chatty conversations float to
 * the top regardless of kind.
 */
const getMyWorkspaceProjects: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;

    const [jobRows, orderRows] = await Promise.all([
      sql(
        `SELECT j.id, j.title, j.status, j."createdAt", j."updatedAt", j.deadline,
                j."budgetMin", j."budgetMax",
                j.posted_by_id    AS "postedById",
                j.freelancer_id   AS "freelancerId",
                client.firstname  AS client_fn, client.lastname  AS client_ln, client."profilePicture" AS client_pp,
                fl.firstname      AS fl_fn,     fl.lastname      AS fl_ln,     fl."profilePicture"     AS fl_pp,
                (SELECT MAX(timestamp) FROM "Message" m WHERE m."jobId" = j.id AND m."deletedAt" IS NULL) AS last_message_at,
                (SELECT COUNT(*)::int FROM "Message" m WHERE m."jobId" = j.id AND m."deletedAt" IS NULL AND m."senderId" <> $1) AS msg_in_count,
                COALESCE((
                  SELECT AVG(t.progress)::int FROM "Timeline" t WHERE t."jobId" = j.id
                ), 0) AS avg_progress,
                (SELECT COUNT(*)::int FROM "Timeline" t WHERE t."jobId" = j.id) AS milestone_count,
                (SELECT COUNT(*)::int FROM "Timeline" t WHERE t."jobId" = j.id AND t."isCompleted" = true) AS milestone_done
           FROM "Job" j
           LEFT JOIN "User" client ON client.id = j.posted_by_id
           LEFT JOIN "User" fl     ON fl.id = j.freelancer_id
          WHERE (j.posted_by_id = $1 OR j.freelancer_id = $1)
            AND j."deletedAt" IS NULL
          ORDER BY COALESCE(
                     (SELECT MAX(timestamp) FROM "Message" m WHERE m."jobId" = j.id),
                     j."updatedAt"
                   ) DESC NULLS LAST
          LIMIT 200`,
        [userId]
      ),
      sql(
        `SELECT o.id,
                o."orderNumber",
                o.status,
                o.package,
                o."totalPrice",
                o.currency,
                o."escrowStatus",
                o."deliveryDeadline" AS deadline,
                o."revisionsRequested",
                o."revisionsCompleted",
                o."createdAt",
                o."updatedAt",
                o."client_id"        AS "clientId",
                fp."user_id"         AS "freelancerUserId",
                g.title              AS gig_title,
                COALESCE(o.title, g.title) AS title,
                client.firstname     AS client_fn, client.lastname AS client_ln, client."profilePicture" AS client_pp,
                fl.firstname         AS fl_fn,    fl.lastname     AS fl_ln,    fl."profilePicture" AS fl_pp,
                fp."jobTitle"        AS fp_title,
                (SELECT MAX(timestamp) FROM "Message" m WHERE m."orderId" = o.id AND m."deletedAt" IS NULL) AS last_message_at,
                (SELECT COUNT(*)::int FROM "Message" m WHERE m."orderId" = o.id AND m."deletedAt" IS NULL AND m."senderId" <> $1) AS msg_in_count
           FROM "Order" o
           LEFT JOIN "Gig" g                ON g.id = o."gig_id"
           LEFT JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
           LEFT JOIN "User" client          ON client.id = o."client_id"
           LEFT JOIN "User" fl              ON fl.id = fp."user_id"
          WHERE (o."client_id" = $1 OR fp."user_id" = $1)
            AND o."deletedAt" IS NULL
          ORDER BY COALESCE(
                     (SELECT MAX(timestamp) FROM "Message" m WHERE m."orderId" = o.id),
                     o."updatedAt"
                   ) DESC NULLS LAST
          LIMIT 200`,
        [userId]
      ),
    ]);

    const jobs = jobRows.map((r) => {
      const role = Number(r.postedById) === userId ? "client" : "freelancer";
      const peer =
        role === "client"
          ? r.freelancerId
            ? {
                id: Number(r.freelancerId),
                firstname: r.fl_fn,
                lastname: r.fl_ln,
                profilePicture: r.fl_pp,
                avatar: r.fl_pp,
                kind: "freelancer",
              }
            : null
          : {
              id: Number(r.postedById),
              firstname: r.client_fn,
              lastname: r.client_ln,
              profilePicture: r.client_pp,
              avatar: r.client_pp,
              kind: "client",
            };

      const milestoneCount = Number(r.milestone_count) || 0;
      const milestoneDone = Number(r.milestone_done) || 0;
      const progress =
        milestoneCount > 0
          ? Math.round((milestoneDone / milestoneCount) * 100)
          : Number(r.avg_progress) || (r.status === "COMPLETED" ? 100 : 0);

      return {
        kind: "JOB" as const,
        id: r.id,
        title: r.title,
        status: r.status,
        role,
        peer,
        deadline: r.deadline,
        budgetMin: r.budgetMin,
        budgetMax: r.budgetMax,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        lastMessageAt: r.last_message_at,
        unreadHint: Number(r.msg_in_count) || 0,
        progress,
        milestoneCount,
        milestoneDone,
      };
    });

    const orders = orderRows.map((r) => {
      const role = Number(r.clientId) === userId ? "client" : "freelancer";
      const peer =
        role === "client"
          ? r.freelancerUserId
            ? {
                id: Number(r.freelancerUserId),
                firstname: r.fl_fn,
                lastname: r.fl_ln,
                profilePicture: r.fl_pp,
                avatar: r.fl_pp,
                jobTitle: r.fp_title,
                kind: "freelancer",
              }
            : null
          : {
              id: Number(r.clientId),
              firstname: r.client_fn,
              lastname: r.client_ln,
              profilePicture: r.client_pp,
              avatar: r.client_pp,
              kind: "client",
            };

      // For gig orders, "progress" is a simple lifecycle estimate. Without
      // milestones the best signal is order.status, so treat PENDING as 5%,
      // CURRENT as 50%, COMPLETED as 100%, REJECTED/DISPUTED as 0%.
      const status = String(r.status || "PENDING").toUpperCase();
      const progress =
        status === "COMPLETED"
          ? 100
          : status === "CURRENT" || status === "ACCEPTED"
          ? 50
          : status === "REJECTED" || status === "DISPUTED"
          ? 0
          : 5;

      return {
        kind: "ORDER" as const,
        id: r.id,
        title: r.title,
        status: r.status,
        role,
        peer,
        deadline: r.deadline,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        lastMessageAt: r.last_message_at,
        unreadHint: Number(r.msg_in_count) || 0,
        progress,
        // Order-only extras
        orderNumber: r.orderNumber,
        package: r.package,
        totalPrice: r.totalPrice == null ? null : Number(r.totalPrice),
        currency: r.currency || "USD",
        escrowStatus: r.escrowStatus || "NONE",
        revisionsRequested: Number(r.revisionsRequested) || 0,
        revisionsCompleted: Number(r.revisionsCompleted) || 0,
      };
    });

    const projects = [...jobs, ...orders].sort((a, b) => {
      const at = a.lastMessageAt || a.updatedAt || 0;
      const bt = b.lastMessageAt || b.updatedAt || 0;
      return new Date(bt as string | number | Date).getTime() - new Date(at as string | number | Date).getTime();
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            projects,
            total: projects.length,
            counts: { jobs: jobs.length, orders: orders.length },
          },
          "Workspace projects retrieved"
        )
      );
  } catch (e) {
    logger.error(`getMyWorkspaceProjects: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to load workspace projects"));
  }
};

/**
 * Single round-trip summary for the workspace center pane: job header,
 * peer, milestones, files, chat preview, activity feed.
 */
const getWorkspaceSummary: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const jobId = parseInt(String(req.params.jobId), 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return next(new ApiError(400, "Invalid project id"));
    }

    const { job, role, peer } = await loadJobPeer(jobId, userId);

    const [milestones, files, lastMessages, activity, unreadCount, openReviewCount] = await Promise.all([
      sql(
        `SELECT id, title, description, "startDate", "endDate", color, "isCompleted",
                COALESCE(progress, CASE WHEN "isCompleted" THEN 100 ELSE 0 END) AS progress,
                status, "dependsOnId", "createdAt", "updatedAt"
           FROM "Timeline" WHERE "jobId" = $1
          ORDER BY "startDate" NULLS LAST, "createdAt" ASC`,
        [jobId]
      ),
      sql(
        `SELECT id, "s3Key", "fileName", "contentType", "fileSize", status,
                "finalUrl", "userId", "createdAt", "updatedAt"
           FROM "FileUpload"
          WHERE "jobId" = $1 AND status = 'COMPLETED'
          ORDER BY "createdAt" DESC
          LIMIT 25`,
        [jobId]
      ),
      sql(
        `SELECT m.id, m.content, m.timestamp, m."senderId",
                u.firstname, u.lastname, u."profilePicture"
           FROM "Message" m
           LEFT JOIN "User" u ON u.id = m."senderId"
          WHERE m."jobId" = $1 AND m."deletedAt" IS NULL AND (NOT COALESCE(m."isDeleted", false))
          ORDER BY m.timestamp DESC
          LIMIT 5`,
        [jobId]
      ),
      sql(
        `SELECT 'milestone'::text AS kind, t.id::text AS ref, t.title AS subject,
                t."updatedAt" AS at, t.status::text AS detail
           FROM "Timeline" t WHERE t."jobId" = $1
          UNION ALL
         SELECT 'file'::text AS kind, f.id::text AS ref, f."fileName" AS subject,
                f."updatedAt" AS at, f.status::text AS detail
           FROM "FileUpload" f WHERE f."jobId" = $1 AND f.status = 'COMPLETED'
          ORDER BY at DESC NULLS LAST
          LIMIT 30`,
        [jobId]
      ),
      sqlOne(
        `SELECT COUNT(*)::int AS c FROM "Message" m
           WHERE m."jobId" = $1 AND m."deletedAt" IS NULL AND m."senderId" <> $2
             AND (m."readAt" IS NULL OR m."readAt" < NOW() - INTERVAL '90 days')`,
        [jobId, userId]
      ),
      countOpenReviewComments({ kind: "JOB", id: jobId }),
    ]);

    const fileUserIds = Array.from(new Set(files.map((f) => Number(f.userId)).filter(Boolean)));
    const fileUsers = fileUserIds.length
      ? await sql(
          `SELECT id, firstname, lastname, "profilePicture" FROM "User" WHERE id = ANY($1::int[])`,
          [fileUserIds]
        )
      : [];
    const fileUserMap = new Map(fileUsers.map((u) => [Number(u.id), u as DbRow]));

    const completedMilestones = (milestones as DbRow[]).filter((m) => m.isCompleted).length;
    const totalMilestones = milestones.length;
    const overallProgress =
      totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : job.status === "COMPLETED"
        ? 100
        : 0;

    const deadline = job.deadline ? new Date(job.deadline as string) : null;
    const daysLeft = deadline
      ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const enrichedFiles = await Promise.all(
      files.map(async (f) => {
        const uploader = fileUserMap.get(Number(f.userId));
        let signedUrl: string | null = null;
        try {
          if (f.s3Key) signedUrl = await getPresignedUrl(String(f.s3Key));
        } catch {
          signedUrl = null;
        }
        return {
          id: f.id,
          name: f.fileName,
          mimeType: f.contentType,
          size: Number(f.fileSize) || 0,
          status: f.status,
          url: signedUrl || f.finalUrl || null,
          createdAt: f.createdAt,
          uploadedBy: uploader
            ? {
                id: uploader.id,
                firstname: uploader.firstname,
                lastname: uploader.lastname,
                avatar: uploader.profilePicture,
              }
            : null,
        };
      })
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          role,
          peer,
          job: { ...job, daysLeft, overallProgress },
          milestones: (milestones as DbRow[]).map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            startDate: m.startDate,
            endDate: m.endDate,
            color: m.color,
            isCompleted: m.isCompleted,
            progress: Number(m.progress) || 0,
            status: m.status,
            dependsOnId: m.dependsOnId,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          })),
          files: enrichedFiles,
          recentMessages: (lastMessages as DbRow[]).reverse().map((m) => ({
            id: m.id,
            content: m.content,
            timestamp: m.timestamp,
            senderId: m.senderId,
            sender: {
              id: m.senderId,
              firstname: m.firstname,
              lastname: m.lastname,
              avatar: m.profilePicture,
            },
          })),
          activity: (activity as DbRow[]).map((a) => ({
            kind: a.kind,
            ref: a.ref,
            subject: a.subject,
            at: a.at,
            detail: a.detail,
          })),
          counts: {
            messages: Number(unreadCount?.c) || 0,
            milestones: totalMilestones,
            milestonesDone: completedMilestones,
            files: enrichedFiles.length,
            // Surfacing the open review comment count lets the UI show a
            // "N comments still open" pill on Milestones/Delivery without a
            // round-trip per file. Milestone completion is gated on this hitting
            // zero, so it doubles as the tooltip / 409 explainer source.
            openReviewComments: Number(openReviewCount) || 0,
          },
          openReviewCount: Number(openReviewCount) || 0,
        },
        "Workspace summary retrieved"
      )
    );
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`getWorkspaceSummary: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, `Failed to load workspace summary: ${(e as Error).message}`));
  }
};

/** Mark all incoming messages of a job as read (sets readAt on the unread ones). */
const markJobMessagesRead: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const jobId = parseInt(String(req.params.jobId), 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return next(new ApiError(400, "Invalid project id"));
    }

    await loadJobPeer(jobId, userId); // authz

    await sql(
      `UPDATE "Message"
          SET "readAt" = NOW()
        WHERE "jobId" = $1 AND "senderId" <> $2 AND "readAt" IS NULL`,
      [jobId, userId]
    );

    return res.status(200).json(new ApiResponse(200, { ok: true }, "Marked as read"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`markJobMessagesRead: ${(e as Error).message}`);
    return next(new ApiError(500, "Failed to mark messages as read"));
  }
};

/**
 * Allowed status transitions per role for the workspace quick-actions menu.
 * Keeps lifecycle safe: clients can complete/cancel/pause; freelancers can flag review.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<
  "client" | "freelancer",
  Record<string, string[]>
> = {
  client: {
    ACCEPTED: ["IN_PROGRESS", "PAUSED", "CANCELLED"],
    IN_PROGRESS: ["PAUSED", "CANCELLED"],
    PAUSED: ["IN_PROGRESS", "CANCELLED"],
  },
  freelancer: {
    ACCEPTED: ["IN_PROGRESS"],
    IN_PROGRESS: ["ACCEPTED"],
  },
};

const updateProjectStatus: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const jobId = parseInt(String(req.params.jobId), 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return next(new ApiError(400, "Invalid project id"));
    }

    const status = String((req.body as Record<string, unknown> | undefined)?.status || "");
    if (!status) return next(new ApiError(400, "status is required"));

    const { role, job } = await loadJobPeer(jobId, userId);
    const allowedFromRole = ALLOWED_STATUS_TRANSITIONS[role as "client" | "freelancer"] || {};
    const allowed = allowedFromRole[String(job.status)] || [];
    if (!allowed.includes(status)) {
      return next(
        new ApiError(
          400,
          `Cannot transition project from ${job.status} to ${status} as ${role}`
        )
      );
    }

    const updated = await sqlOne(
      `UPDATE "Job"
          SET status = $1::"JobStatus",
              "updatedAt" = NOW()
        WHERE id = $2
        RETURNING id, status, "updatedAt"`,
      [status, jobId]
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Project status updated"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`updateProjectStatus: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to update status"));
  }
};

// ── Gig-order workspace endpoints ─────────────────────────────────────────
//
// These mirror the Job-scoped handlers above but operate on gig Orders so the
// unified WorkspaceShell on the frontend can fetch summary, mark-as-read, and
// safe status transitions for an order using the same shape it already uses
// for jobs. Authorization is shared via `loadOrderPeer`.

interface OrderPeerResult {
  role: "client" | "freelancer";
  peer: DbRow | null;
  order: DbRow;
}

async function loadOrderPeer(orderId: number, userId: number): Promise<OrderPeerResult> {
  const row = await sqlOne(
    `SELECT o.id, o."orderNumber", o.title, o.description, o.status, o.package,
            o."totalPrice", o.currency, o."escrowStatus",
            o."deliveryDeadline", o."requirements", o."aspectRatio", o."videoType",
            o."numberOfVideos", o."totalDuration", o."addSubtitles", o."expressDelivery",
            o."revisionsRequested", o."revisionsCompleted",
            o."createdAt", o."updatedAt", o."completedAt", o."cancellationDate",
            o."cancellationReason", o."extensionReason",
            o."client_id"      AS "clientId",
            o."freelancer_id"  AS "freelancerProfileId",
            fp."user_id"       AS "freelancerUserId",
            fp."jobTitle"      AS fp_title,
            fp."skills"        AS fp_skills,
            fp."hourlyRate"    AS fp_rate,
            client.firstname   AS client_fn, client.lastname AS client_ln,
            client."profilePicture" AS client_pp,
            client.company     AS client_co,
            client.email       AS client_email,
            fl.firstname       AS fl_fn,    fl.lastname     AS fl_ln,
            fl."profilePicture" AS fl_pp,
            fl.email           AS fl_email,
            fl.rating          AS fl_rating,
            g.id               AS gig_id,
            g.title            AS gig_title,
            g.description      AS gig_description,
            g."thumbnailUrl"   AS gig_thumb,
            g."deliveryTime"   AS gig_delivery_time
       FROM "Order" o
       LEFT JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
       LEFT JOIN "User" fl              ON fl.id = fp."user_id"
       LEFT JOIN "User" client          ON client.id = o."client_id"
       LEFT JOIN "Gig" g                ON g.id = o."gig_id"
      WHERE o.id = $1 AND o."deletedAt" IS NULL`,
    [orderId]
  );

  if (!row) throw new ApiError(404, "Order not found");

  const clientId = Number(row.clientId);
  const freelancerUserId = row.freelancerUserId == null ? null : Number(row.freelancerUserId);

  if (clientId !== userId && freelancerUserId !== userId) {
    throw new ApiError(403, "You are not part of this order");
  }

  const role: "client" | "freelancer" = clientId === userId ? "client" : "freelancer";
  const peer =
    role === "client"
      ? freelancerUserId
        ? {
            id: freelancerUserId,
            firstname: row.fl_fn,
            lastname: row.fl_ln,
            avatar: row.fl_pp,
            profilePicture: row.fl_pp,
            email: row.fl_email,
            rating: row.fl_rating,
            jobTitle: row.fp_title,
            skills: row.fp_skills,
            hourlyRate: row.fp_rate,
            kind: "freelancer",
          }
        : null
      : {
          id: clientId,
          firstname: row.client_fn,
          lastname: row.client_ln,
          avatar: row.client_pp,
          profilePicture: row.client_pp,
          email: row.client_email,
          company: row.client_co,
          kind: "client",
        };

  const order: DbRow = {
    id: row.id,
    orderNumber: row.orderNumber,
    title: row.title || row.gig_title,
    description: row.description,
    status: row.status,
    package: row.package,
    totalPrice: row.totalPrice == null ? null : Number(row.totalPrice),
    currency: row.currency || "USD",
    escrowStatus: row.escrowStatus || "NONE",
    deliveryDeadline: row.deliveryDeadline,
    requirements: row.requirements,
    aspectRatio: row.aspectRatio,
    videoType: row.videoType,
    numberOfVideos: row.numberOfVideos,
    totalDuration: row.totalDuration,
    addSubtitles: row.addSubtitles,
    expressDelivery: row.expressDelivery,
    revisionsRequested: Number(row.revisionsRequested) || 0,
    revisionsCompleted: Number(row.revisionsCompleted) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    cancellationDate: row.cancellationDate,
    cancellationReason: row.cancellationReason,
    extensionReason: row.extensionReason,
    clientId,
    freelancerUserId,
    gig: row.gig_id
      ? {
          id: row.gig_id,
          title: row.gig_title,
          description: row.gig_description,
          thumbnailUrl: row.gig_thumb,
          deliveryTime: row.gig_delivery_time,
        }
      : null,
  };

  return { role, peer, order };
}

/**
 * Single round-trip summary for a gig Order — mirrors getWorkspaceSummary.
 * Returns header, peer, files, recent messages, and the order's status history
 * so the workspace can render Activity, Overview, and the Revisions tab.
 */
const getOrderWorkspaceSummary: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const orderId = parseInt(String(req.params.orderId), 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return next(new ApiError(400, "Invalid order id"));
    }

    const { order, role, peer } = await loadOrderPeer(orderId, userId);

    const [files, lastMessages, statusHistoryRows, unreadCount, openReviewCount] = await Promise.all([
      sql(
        `SELECT pf.id, pf."fileName", pf.url, pf."fileKey", pf."mimeType", pf.size, pf.category,
                pf.version, pf.status, pf.note, pf."uploaderId",
                pf."openCommentCount", pf."totalCommentCount", pf."durationSec",
                pf."createdAt", pf."updatedAt"
           FROM "ProjectFile" pf
          WHERE pf."orderId" = $1
          ORDER BY pf."createdAt" DESC
          LIMIT 25`,
        [orderId]
      ),
      sql(
        `SELECT m.id, m.content, m.timestamp, m."senderId",
                u.firstname, u.lastname, u."profilePicture"
           FROM "Message" m
           LEFT JOIN "User" u ON u.id = m."senderId"
          WHERE m."orderId" = $1 AND m."deletedAt" IS NULL AND (NOT COALESCE(m."isDeleted", false))
          ORDER BY m.timestamp DESC
          LIMIT 5`,
        [orderId]
      ),
      sql(
        `SELECT id, status::text AS status, "changedAt", "changed_by" AS "changedBy"
           FROM "OrderStatusHistory"
          WHERE "order_id" = $1
          ORDER BY "changedAt" DESC
          LIMIT 50`,
        [orderId]
      ),
      sqlOne(
        `SELECT COUNT(*)::int AS c FROM "Message" m
           WHERE m."orderId" = $1 AND m."deletedAt" IS NULL AND m."senderId" <> $2
             AND (m."readAt" IS NULL OR m."readAt" < NOW() - INTERVAL '90 days')`,
        [orderId, userId]
      ),
      countOpenReviewComments({ kind: "ORDER", id: orderId }),
    ]);

    const fileUserIds = Array.from(new Set(files.map((f) => Number(f.uploaderId)).filter(Boolean)));
    const fileUsers = fileUserIds.length
      ? await sql(
          `SELECT id, firstname, lastname, "profilePicture" FROM "User" WHERE id = ANY($1::int[])`,
          [fileUserIds]
        )
      : [];
    const fileUserMap = new Map(fileUsers.map((u) => [Number(u.id), u as DbRow]));

    const enrichedFiles = await Promise.all(
      files.map(async (f) => {
        const uploader = fileUserMap.get(Number(f.uploaderId));
        let url: string = String(f.url || f.fileKey || "");
        if (url && !/^https?:/i.test(url)) {
          try {
            url = await getPresignedUrl(url);
          } catch {
            // leave as-is; client falls back gracefully
          }
        }
        return {
          id: f.id,
          name: f.fileName,
          mimeType: f.mimeType,
          size: Number(f.size) || 0,
          status: f.status,
          category: f.category,
          version: Number(f.version) || 1,
          note: f.note,
          url,
          openCommentCount: Number(f.openCommentCount) || 0,
          totalCommentCount: Number(f.totalCommentCount) || 0,
          durationSec: f.durationSec == null ? null : Number(f.durationSec),
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          uploadedBy: uploader
            ? {
                id: uploader.id,
                firstname: uploader.firstname,
                lastname: uploader.lastname,
                avatar: uploader.profilePicture,
              }
            : null,
        };
      })
    );

    const deadline = order.deliveryDeadline ? new Date(order.deliveryDeadline as string) : null;
    const daysLeft = deadline
      ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    const status = String(order.status || "PENDING").toUpperCase();
    const overallProgress =
      status === "COMPLETED" ? 100 : status === "CURRENT" || status === "ACCEPTED" ? 50 : 5;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          kind: "ORDER",
          role,
          peer,
          order: { ...order, daysLeft, overallProgress },
          // Aliased as "job" too so the existing OverviewTab/ProjectHeader
          // components can fall back without conditional null checks. Frontend
          // branches on `kind` for ORDER-only fields.
          job: { ...order, daysLeft, overallProgress },
          files: enrichedFiles,
          recentMessages: (lastMessages as DbRow[]).reverse().map((m) => ({
            id: m.id,
            content: m.content,
            timestamp: m.timestamp,
            senderId: m.senderId,
            sender: {
              id: m.senderId,
              firstname: m.firstname,
              lastname: m.lastname,
              avatar: m.profilePicture,
            },
          })),
          statusHistory: (statusHistoryRows as DbRow[]).map((r) => ({
            id: r.id,
            status: r.status,
            changedAt: r.changedAt,
            changedBy: r.changedBy,
          })),
          // Activity feed shaped to match jobs so the existing ActivityTab keeps
          // rendering without a branch. Files appear chronologically alongside
          // status transitions.
          activity: [
            ...(statusHistoryRows as DbRow[]).map((r) => ({
              kind: "status" as const,
              ref: String(r.id),
              subject: `Status changed to ${r.status}`,
              at: r.changedAt,
              detail: String(r.status),
            })),
            ...enrichedFiles.map((f) => ({
              kind: "file" as const,
              ref: String(f.id),
              subject: f.name,
              at: f.updatedAt || f.createdAt,
              detail: f.status,
            })),
          ]
            .sort((a, b) => {
              const at = a.at ? new Date(a.at as string | number | Date).getTime() : 0;
              const bt = b.at ? new Date(b.at as string | number | Date).getTime() : 0;
              return bt - at;
            })
            .slice(0, 30),
          counts: {
            messages: Number(unreadCount?.c) || 0,
            files: enrichedFiles.length,
            // Mirror the milestones/milestonesDone keys so OverviewTab.SummaryCard
            // can show "Revisions used / total" without a branch.
            milestones: Number(order.revisionsRequested) || 0,
            milestonesDone: Number(order.revisionsCompleted) || 0,
            // Same gate as jobs: order completion / delivery approval is blocked
            // until this hits zero. Surfaced so the UI can warn ahead of time.
            openReviewComments: Number(openReviewCount) || 0,
          },
          openReviewCount: Number(openReviewCount) || 0,
        },
        "Order workspace summary retrieved"
      )
    );
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`getOrderWorkspaceSummary: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, `Failed to load order workspace summary: ${(e as Error).message}`));
  }
};

/** Mark all incoming messages of an order as read (mirror of markJobMessagesRead). */
const markOrderMessagesRead: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const orderId = parseInt(String(req.params.orderId), 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return next(new ApiError(400, "Invalid order id"));
    }

    await loadOrderPeer(orderId, userId); // authz

    await sql(
      `UPDATE "Message"
          SET "readAt" = NOW()
        WHERE "orderId" = $1 AND "senderId" <> $2 AND "readAt" IS NULL`,
      [orderId, userId]
    );

    return res.status(200).json(new ApiResponse(200, { ok: true }, "Marked as read"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`markOrderMessagesRead: ${(e as Error).message}`);
    return next(new ApiError(500, "Failed to mark messages as read"));
  }
};

/**
 * Allowed status transitions for orders, scoped per role. Mirrors
 * ALLOWED_STATUS_TRANSITIONS for jobs but expressed in OrderStatus values.
 *
 * Transitions that should go through the dedicated escrow / payment / dispute
 * routes (e.g. COMPLETED with payout, DISPUTED) are intentionally excluded so
 * the workspace can't accidentally release funds — those still flow through
 * order.controller.ts and escrow.controller.ts.
 */
const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<
  "client" | "freelancer",
  Record<string, string[]>
> = {
  client: {
    PENDING: ["CANCELLED"],
    ACCEPTED: ["CANCELLED"],
    CURRENT: ["CANCELLED"],
  },
  freelancer: {
    PENDING: ["ACCEPTED", "REJECTED"],
    ACCEPTED: ["CURRENT"],
    CURRENT: ["ACCEPTED"],
  },
};

const updateOrderWorkspaceStatus: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const orderId = parseInt(String(req.params.orderId), 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return next(new ApiError(400, "Invalid order id"));
    }

    const status = String((req.body as Record<string, unknown> | undefined)?.status || "");
    if (!status) return next(new ApiError(400, "status is required"));

    const { role, order } = await loadOrderPeer(orderId, userId);
    const allowedFromRole = ALLOWED_ORDER_STATUS_TRANSITIONS[role] || {};
    const allowed = allowedFromRole[String(order.status)] || [];
    if (!allowed.includes(status)) {
      return next(
        new ApiError(
          400,
          `Cannot transition order from ${order.status} to ${status} as ${role}`
        )
      );
    }

    const updated = await sqlOne(
      `UPDATE "Order"
          SET status = $1::"OrderStatus",
              "updatedAt" = NOW()
        WHERE id = $2
        RETURNING id, status, "updatedAt"`,
      [status, orderId]
    );

    // Best-effort audit trail. Failure here shouldn't block the status update
    // (the source of truth is the Order row), but we still want a record so the
    // Activity tab reflects the change.
    try {
      await sql(
        `INSERT INTO "OrderStatusHistory" ("order_id", status, "changedAt", "changed_by")
           VALUES ($1, $2::"OrderStatus", NOW(), $3)`,
        [orderId, status, userId]
      );
    } catch (auditErr) {
      logger.warn(`OrderStatusHistory insert failed (order ${orderId}): ${(auditErr as Error).message}`);
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Order status updated"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`updateOrderWorkspaceStatus: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to update order status"));
  }
};

export {
  getMyWorkspaceProjects,
  getWorkspaceSummary,
  markJobMessagesRead,
  updateProjectStatus,
  loadOrderPeer,
  getOrderWorkspaceSummary,
  markOrderMessagesRead,
  updateOrderWorkspaceStatus,
};
