import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne } from "../db.js";
import logger from "../Utils/logger.js";
import { getPresignedUrl } from "../Utils/s3.js";

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

/** Lightweight job list for the workspace sidebar (both roles). */
const getMyWorkspaceProjects: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;

    const rows = await sql(
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
    );

    const projects = rows.map((r) => {
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

    return res
      .status(200)
      .json(new ApiResponse(200, { projects, total: projects.length }, "Workspace projects retrieved"));
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

    const [milestones, files, lastMessages, activity, unreadCount] = await Promise.all([
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
          },
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
    ACCEPTED: ["IN_PROGRESS", "PAUSED", "CANCELLED", "COMPLETED"],
    IN_PROGRESS: ["PAUSED", "CANCELLED", "COMPLETED"],
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

export {
  getMyWorkspaceProjects,
  getWorkspaceSummary,
  markJobMessagesRead,
  updateProjectStatus,
};
