import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne } from "../db.js";
import logger from "../Utils/logger.js";
import { getPresignedUrl } from "../Utils/s3.js";

type Handler = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

const VALID_CATEGORIES = new Set(["raw", "reference", "deliverable", "final", "asset"]);
const VALID_STATUSES = new Set(["PENDING_REVIEW", "APPROVED", "CHANGES_REQUESTED", "ARCHIVED"]);

async function assertJobAccess(jobId: number, userId: number): Promise<DbRow> {
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
  return row;
}

const listProjectFiles: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const jobId = parseInt(String(req.params.jobId), 10);
    await assertJobAccess(jobId, userId);

    const rows = await sql(
      `SELECT pf.*, u.firstname, u.lastname, u."profilePicture"
         FROM "ProjectFile" pf
         LEFT JOIN "User" u ON u.id = pf."uploaderId"
        WHERE pf."jobId" = $1
        ORDER BY pf."createdAt" DESC
        LIMIT 200`,
      [jobId]
    );

    const out = await Promise.all(
      rows.map(async (r) => {
        let url: string = String(r.url);
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
          fileName: r.fileName,
          url,
          mimeType: r.mimeType,
          size: Number(r.size) || 0,
          category: r.category,
          version: Number(r.version) || 1,
          status: r.status,
          note: r.note,
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
    const jobId = parseInt(String(req.params.jobId), 10);
    await assertJobAccess(jobId, userId);

    const body = (req.body || {}) as Record<string, unknown>;
    const fileName = String(body.fileName || "").trim();
    const url = String(body.url || "").trim();
    const mimeType = body.mimeType ? String(body.mimeType) : null;
    const size = Number(body.size) || 0;
    const category = String(body.category || "deliverable");
    const note = body.note ? String(body.note) : null;

    if (!fileName) return next(new ApiError(400, "fileName is required"));
    if (!url) return next(new ApiError(400, "url is required (S3 key or absolute URL)"));
    if (!VALID_CATEGORIES.has(category)) return next(new ApiError(400, "Invalid category"));

    // Auto-bump version when a file with the same name exists
    const prev = await sqlOne(
      `SELECT MAX(version) AS v FROM "ProjectFile" WHERE "jobId" = $1 AND "fileName" = $2`,
      [jobId, fileName]
    );
    const version = (Number(prev?.v) || 0) + 1;

    const row = await sqlOne(
      `INSERT INTO "ProjectFile" ("jobId","uploaderId","fileName","url","mimeType","size","category","version","status","note","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING_REVIEW',$9,NOW(),NOW())
       RETURNING *`,
      [jobId, userId, fileName, url, mimeType, size, category, version, note]
    );

    return res.status(201).json(new ApiResponse(201, row, "File added"));
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
    const jobId = parseInt(String(req.params.jobId), 10);
    const fileId = parseInt(String(req.params.fileId), 10);
    await assertJobAccess(jobId, userId);

    const status = String((req.body as Record<string, unknown> | undefined)?.status || "");
    const note = (req.body as Record<string, unknown> | undefined)?.note;
    if (!VALID_STATUSES.has(status)) return next(new ApiError(400, "Invalid status"));

    const updated = await sqlOne(
      `UPDATE "ProjectFile"
          SET status = $1,
              note = COALESCE($2, note),
              "updatedAt" = NOW()
        WHERE id = $3 AND "jobId" = $4
        RETURNING *`,
      [status, note != null ? String(note) : null, fileId, jobId]
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
    const jobId = parseInt(String(req.params.jobId), 10);
    const fileId = parseInt(String(req.params.fileId), 10);
    await assertJobAccess(jobId, userId);

    const file = await sqlOne(
      `SELECT id, "uploaderId" FROM "ProjectFile" WHERE id = $1 AND "jobId" = $2`,
      [fileId, jobId]
    );
    if (!file) return next(new ApiError(404, "File not found"));

    // Either uploader or client may remove
    const job = await sqlOne(`SELECT posted_by_id AS p FROM "Job" WHERE id = $1`, [jobId]);
    if (Number(file.uploaderId) !== userId && Number(job?.p) !== userId) {
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
    const jobId = parseInt(String(req.params.jobId), 10);
    await assertJobAccess(jobId, userId);

    const rows = await sql(
      `SELECT p.*, m.content, m.timestamp, m."senderId",
              u.firstname, u.lastname, u."profilePicture"
         FROM "PinnedMessage" p
         LEFT JOIN "Message" m ON m.id = p."messageId"
         LEFT JOIN "User" u ON u.id = m."senderId"
        WHERE p."jobId" = $1 AND m.id IS NOT NULL
        ORDER BY p."createdAt" DESC
        LIMIT 50`,
      [jobId]
    );

    const out = rows.map((r) => ({
      id: r.id,
      jobId: r.jobId,
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
    const jobId = parseInt(String(req.params.jobId), 10);
    await assertJobAccess(jobId, userId);

    const messageId = String((req.body as Record<string, unknown> | undefined)?.messageId || "").trim();
    if (!messageId) return next(new ApiError(400, "messageId is required"));

    const exists = await sqlOne(
      `SELECT id FROM "PinnedMessage" WHERE "jobId" = $1 AND "messageId" = $2`,
      [jobId, messageId]
    );

    if (exists) {
      await sql(`DELETE FROM "PinnedMessage" WHERE id = $1`, [exists.id]);
      return res.status(200).json(new ApiResponse(200, { pinned: false }, "Unpinned"));
    }

    await sql(
      `INSERT INTO "PinnedMessage" ("jobId","messageId","pinnedById") VALUES ($1,$2,$3)`,
      [jobId, messageId, userId]
    );
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
