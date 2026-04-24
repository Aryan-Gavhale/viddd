import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const submitRevision: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { orderId } = req.params as Record<string, string>;
    const oid = parseInt(orderId, 10);
    const b = req.body as Record<string, unknown>;

    const order = await sqlOne(
      `SELECT o.*, fp."user_id" AS "freelancerUserId"
       FROM "Order" o
       JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
       WHERE o.id = $1`, [oid]
    );
    if (!order) return next(new ApiError(404, "Order not found"));
    if ((order as Record<string, unknown>).freelancerUserId !== req.user.id) {
      return next(new ApiError(403, "Only the freelancer can submit revisions"));
    }

    const latestVersion = await sqlOne(
      `SELECT COALESCE(MAX(version), 0) AS max FROM "Revision" WHERE "orderId"=$1`, [oid]
    );
    const nextVersion = Number(latestVersion.max) + 1;

    const revision = await sqlOne(
      `INSERT INTO "Revision" ("orderId","userId","version","videoUrl","thumbnailUrl","changeNotes","duration","fileSize","status","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'SUBMITTED',NOW()) RETURNING *`,
      [oid, req.user.id, nextVersion, String(b.videoUrl), b.thumbnailUrl || null,
       b.changeNotes || null, b.duration ? Number(b.duration) : null, b.fileSize || null]
    );

    return res.status(201).json(new ApiResponse(201, revision, `Revision v${nextVersion} submitted`));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("submitRevision: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to submit revision"));
  }
};

export const getRevisions: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { orderId } = req.params as Record<string, string>;
    const oid = parseInt(orderId, 10);

    const order = await sqlOne(
      `SELECT o.*, o."client_id" AS "clientId", fp."user_id" AS "freelancerUserId"
       FROM "Order" o
       JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
       WHERE o.id = $1`, [oid]
    );
    if (!order) return next(new ApiError(404, "Order not found"));
    const o = order as Record<string, unknown>;
    if (o.freelancerUserId !== req.user.id && o.clientId !== req.user.id && req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Forbidden"));
    }

    const revisions = await sql(
      `SELECT r.*, u."firstname", u."lastname"
       FROM "Revision" r JOIN "User" u ON u.id=r."userId"
       WHERE r."orderId"=$1 ORDER BY r.version ASC`, [oid]
    );
    return res.status(200).json(new ApiResponse(200, revisions, "Revisions retrieved"));
  } catch (e) {
    logger.error("getRevisions: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get revisions"));
  }
};

export const reviewRevision: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { revisionId } = req.params as Record<string, string>;
    const rid = parseInt(revisionId, 10);
    const { status, reviewNote } = req.body as Record<string, unknown>;

    const revision = await sqlOne(
      `SELECT r.*, o."client_id" AS "clientId"
       FROM "Revision" r JOIN "Order" o ON o.id = r."orderId"
       WHERE r.id = $1`, [rid]
    );
    if (!revision) return next(new ApiError(404, "Revision not found"));
    if ((revision as Record<string, unknown>).clientId !== req.user.id) {
      return next(new ApiError(403, "Only the client can review revisions"));
    }
    if (revision.status !== "SUBMITTED") return next(new ApiError(400, "Already reviewed"));

    const updated = await sqlOne(
      `UPDATE "Revision" SET status=$2, "reviewNote"=$3, "reviewedBy"=$4, "reviewedAt"=NOW() WHERE id=$1 RETURNING *`,
      [rid, String(status), reviewNote || null, req.user.id]
    );

    return res.status(200).json(new ApiResponse(200, updated, `Revision ${status === "APPROVED" ? "approved" : "needs changes"}`));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("reviewRevision: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to review revision"));
  }
};

export const compareRevisions: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { orderId } = req.params as Record<string, string>;
    const q = req.query as Record<string, string>;
    const v1 = parseInt(q.v1 || "1", 10);
    const v2 = parseInt(q.v2 || "2", 10);

    const order = await sqlOne(
      `SELECT o.*, o."client_id" AS "clientId", fp."user_id" AS "freelancerUserId"
       FROM "Order" o
       JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
       WHERE o.id = $1`, [parseInt(orderId, 10)]
    );
    if (!order) return next(new ApiError(404, "Order not found"));
    const oc = order as Record<string, unknown>;
    if (oc.freelancerUserId !== req.user.id && oc.clientId !== req.user.id && req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Forbidden"));
    }

    const [rev1, rev2] = await Promise.all([
      sqlOne(`SELECT * FROM "Revision" WHERE "orderId"=$1 AND version=$2`, [parseInt(orderId, 10), v1]),
      sqlOne(`SELECT * FROM "Revision" WHERE "orderId"=$1 AND version=$2`, [parseInt(orderId, 10), v2]),
    ]);

    if (!rev1 || !rev2) return next(new ApiError(404, "One or both versions not found"));

    return res.status(200).json(new ApiResponse(200, {
      before: rev1, after: rev2,
      changes: {
        durationChange: (rev2.duration || 0) - (rev1.duration || 0),
        notes: rev2.changeNotes,
      },
    }, "Comparison ready"));
  } catch (e) {
    logger.error("compareRevisions: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to compare"));
  }
};
