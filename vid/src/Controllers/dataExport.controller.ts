/**
 * GDPR data export + soft hard-delete with 30-day grace.
 *
 * Hard delete is two-step: the user requests deletion, we mark
 * `deletionRequestedAt = NOW()` and disable the account. A daily worker (in
 * `Queues/processors.ts` for the scheduled job) finds rows older than 30 days
 * and runs the actual purge: foreign keys are repointed to a sentinel
 * `__deleted_user__` row so workspace summaries don't crash, and the user
 * row is fully removed.
 *
 * Data export streams a JSON dump of the user's records to S3 and emails a
 * 24h presigned link.
 */
import crypto from "crypto";
import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { comparePasswords } from "../Services/authService.js";
import { revokeRefreshFamily } from "../Utils/tokens.js";
import { queueEmail } from "../Queues/processors.js";
import { uploadFileToS3, getPresignedUrl } from "../Utils/s3.js";
import logger from "../Utils/logger.js";
import type {
  ExpressRequest,
  ExpressResponse,
  NextFunction,
  DbRow,
} from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

// ── POST /users/me/delete-request ─────────────────────────────────────────
export const requestAccountDeletion: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const { currentPassword, reason } = req.body as {
      currentPassword?: string;
      reason?: string;
    };
    if (!currentPassword) {
      return next(new ApiError(400, "Current password is required to delete your account"));
    }

    const user = (await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [userId])) as DbRow | null;
    if (!user || !user.isActive) return next(new ApiError(404, "User not found"));

    const ok = await comparePasswords(currentPassword, String(user.password || ""));
    if (!ok) return next(new ApiError(400, "Password is incorrect"));

    if (user.deletionRequestedAt) {
      return res.status(200).json(
        new ApiResponse(
          200,
          { deletionRequestedAt: user.deletionRequestedAt },
          "Account deletion already scheduled"
        )
      );
    }

    await sql(
      `UPDATE "User" SET "deletionRequestedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1`,
      [userId]
    );

    if (user.email) {
      try {
        await queueEmail(
          String(user.email),
          "Your Vidlancing account is scheduled for deletion",
          `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
             <h2 style="color:#dc2626;">Account deletion scheduled</h2>
             <p>Your account will be permanently deleted in 30 days. You can cancel this request at any time before then by signing in and visiting the Privacy & Data tab in Settings.</p>
             ${reason ? `<p style="color:#6b7280;font-size:13px;">Reason on file: ${String(reason)}</p>` : ""}
           </div>`
        );
      } catch (err) {
        logger.warn("requestAccountDeletion: failed to queue email: %s", (err as Error).message);
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        { deletionScheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        "Account deletion scheduled. You have 30 days to cancel."
      )
    );
  } catch (err) {
    logger.error("requestAccountDeletion: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to request account deletion"));
  }
};

// ── POST /users/me/delete-request/cancel ──────────────────────────────────
export const cancelAccountDeletion: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;

    await sql(
      `UPDATE "User" SET "deletionRequestedAt" = NULL, "updatedAt" = NOW() WHERE "id" = $1`,
      [userId]
    );

    return res.status(200).json(new ApiResponse(200, null, "Account deletion request cancelled"));
  } catch (err) {
    logger.error("cancelAccountDeletion: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to cancel deletion request"));
  }
};

// ── POST /users/me/export ─────────────────────────────────────────────────
export const requestDataExport: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;

    const user = (await sqlOne(
      `SELECT "id", "email", "firstname", "lastname", "createdAt", "country", "company", "username", "role"
         FROM "User" WHERE "id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!user) return next(new ApiError(404, "User not found"));

    // Pull foreign-key tables we know exist in the schema.
    const [freelancerProfile, portfolios, jobs, ordersAsClient, messagesSent, invoices, transactions] =
      await Promise.all([
        sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [userId]).catch(() => null),
        sql(
          `SELECT pv.* FROM "PortfolioVideo" pv
             JOIN "FreelancerProfile" fp ON fp."id" = pv."freelancer_id"
            WHERE fp."user_id" = $1`,
          [userId]
        ).catch(() => []),
        sql(`SELECT * FROM "Job" WHERE "posted_by_id" = $1`, [userId]).catch(() => []),
        sql(`SELECT * FROM "Order" WHERE "client_id" = $1`, [userId]).catch(() => []),
        sql(`SELECT * FROM "Message" WHERE "senderId" = $1`, [userId]).catch(() => []),
        sql(`SELECT * FROM "Invoice" WHERE "clientId" = $1`, [userId]).catch(() => []),
        sql(`SELECT * FROM "Transaction" WHERE "user_id" = $1`, [userId]).catch(() => []),
      ]);

    const dump = {
      exportedAt: new Date().toISOString(),
      user,
      freelancerProfile,
      portfolios,
      jobs,
      ordersAsClient,
      messagesSent,
      invoices,
      transactions,
    };

    const json = JSON.stringify(dump, null, 2);
    const key = `exports/user-${userId}-${crypto.randomBytes(6).toString("hex")}.json`;

    let downloadUrl: string;
    try {
      await uploadFileToS3({ buffer: Buffer.from(json, "utf8"), mimetype: "application/json" }, key);
      downloadUrl = await getPresignedUrl(key, 24 * 60 * 60);
    } catch (err) {
      logger.warn("requestDataExport: S3 unavailable, returning inline payload: %s", (err as Error).message);
      // Fallback: return the JSON payload inline rather than failing.
      return res.status(200).json(
        new ApiResponse(
          200,
          { inline: dump, note: "S3 export unavailable; payload returned inline" },
          "Data export ready (inline)"
        )
      );
    }

    if (user.email) {
      try {
        await queueEmail(
          String(user.email),
          "Your Vidlancing data export is ready",
          `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
             <h2 style="color:#7c3aed;">Your data export</h2>
             <p>Your data export is ready. The download link below will expire in 24 hours.</p>
             <a href="${downloadUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">Download my data</a>
           </div>`
        );
      } catch (err) {
        logger.warn("requestDataExport: failed to queue email: %s", (err as Error).message);
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { downloadUrl, expiresInSeconds: 24 * 60 * 60 }, "Export ready"));
  } catch (err) {
    logger.error("requestDataExport: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to export data"));
  }
};
