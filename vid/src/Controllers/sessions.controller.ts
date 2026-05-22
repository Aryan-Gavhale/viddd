/**
 * Active sessions list + revoke.
 *
 * The refresh-token rotation lifecycle in `Utils/tokens.ts` is responsible
 * for upserting `UserSession` rows; we just expose them here. Revoking a
 * session deletes the row and removes the corresponding refresh family
 * entry from Redis.
 */
import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { revokeRefreshFamily } from "../Utils/tokens.js";
import logger from "../Utils/logger.js";
import jwt from "jsonwebtoken";
import type {
  ExpressRequest,
  ExpressResponse,
  NextFunction,
} from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

function getRefreshSecret(): string | null {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || null;
}

function decodeCurrentJti(req: ExpressRequest): string | null {
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies || {};
  const token = cookies.refresh_token;
  const secret = getRefreshSecret();
  if (!token || !secret) return null;
  try {
    const decoded = jwt.verify(token, secret) as { jti?: string };
    return decoded?.jti || null;
  } catch {
    return null;
  }
}

export const listSessions: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const rows = await sql(
      `SELECT "id", "refreshJti", "userAgent", "ip", "lastSeenAt", "createdAt"
         FROM "UserSession"
        WHERE "userId" = $1
        ORDER BY "lastSeenAt" DESC`,
      [req.user.id]
    );
    const currentJti = decodeCurrentJti(req);
    const sessions = rows.map((r) => ({ ...r, current: r.refreshJti === currentJti }));
    return res.status(200).json(new ApiResponse(200, { sessions }, "Sessions fetched"));
  } catch (err) {
    logger.error("listSessions: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to list sessions"));
  }
};

export const revokeSession: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const jti = String(req.params.jti || "");
    if (!jti) return next(new ApiError(400, "jti is required"));
    const session = await sqlOne(
      `SELECT * FROM "UserSession" WHERE "userId" = $1 AND "refreshJti" = $2`,
      [req.user.id, jti]
    );
    if (!session) return next(new ApiError(404, "Session not found"));
    await sql(`DELETE FROM "UserSession" WHERE "userId" = $1 AND "refreshJti" = $2`, [
      req.user.id,
      jti,
    ]);

    // If they revoked the family-current jti, drop the Redis family entry
    // entirely so the refresh token can no longer rotate.
    const currentJti = decodeCurrentJti(req);
    if (currentJti === jti) {
      await revokeRefreshFamily(req.user.id);
    }
    return res.status(200).json(new ApiResponse(200, null, "Session revoked"));
  } catch (err) {
    logger.error("revokeSession: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to revoke session"));
  }
};

export const revokeAllOtherSessions: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const currentJti = decodeCurrentJti(req);
    if (currentJti) {
      await sql(
        `DELETE FROM "UserSession" WHERE "userId" = $1 AND "refreshJti" <> $2`,
        [req.user.id, currentJti]
      );
    } else {
      await sql(`DELETE FROM "UserSession" WHERE "userId" = $1`, [req.user.id]);
      await revokeRefreshFamily(req.user.id);
    }
    return res.status(200).json(new ApiResponse(200, null, "Other sessions revoked"));
  } catch (err) {
    logger.error("revokeAllOtherSessions: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to revoke other sessions"));
  }
};
