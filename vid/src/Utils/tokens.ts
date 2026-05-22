/**
 * FIX M1: Short-lived access tokens + rotating refresh tokens.
 *
 * Previously a single JWT lived for 7 days with no rotation/revocation.
 * If it leaked it was valid for the full week.
 *
 * New scheme:
 *   - access_token  (cookie + Bearer)  : 15 min,  signed with JWT_SECRET
 *   - refresh_token (cookie /auth/refresh path) : 7 days, signed with
 *     JWT_REFRESH_SECRET, carries a `jti` whose family is tracked in Redis.
 *
 * On refresh:
 *   - we verify the refresh JWT,
 *   - check that its `jti` is the current one for that user in Redis,
 *   - rotate: delete old jti, mint new access + new refresh with new jti.
 *
 * Refresh-token reuse (same jti seen twice) is treated as theft: we revoke
 * the entire family for that user so the attacker AND victim are forced to
 * re-login.
 *
 * On logout we drop the family entry, instantly invalidating any leaked
 * refresh tokens for that user.
 */
import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import redisClient from "../Config/redis.js";
import logger from "./logger.js";
import { sql } from "../db.js";
import type { AuthUser, DbRow, JwtPayload } from "../types/index.js";

/**
 * Best-effort upsert of a `UserSession` row keyed by the refresh-token jti.
 * Called from refresh-token issuance / rotation so the Settings → Sessions
 * tab can list and revoke individual devices. Silently swallows errors so
 * a missing table (pre-migration) doesn't block sign-in.
 */
async function upsertUserSession(
  userId: number,
  jti: string,
  userAgent?: string | null,
  ip?: string | null
): Promise<void> {
  try {
    await sql(
      `INSERT INTO "UserSession" ("userId", "refreshJti", "userAgent", "ip", "lastSeenAt")
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT ("refreshJti")
       DO UPDATE SET "lastSeenAt" = NOW(), "userAgent" = COALESCE(EXCLUDED."userAgent", "UserSession"."userAgent"), "ip" = COALESCE(EXCLUDED."ip", "UserSession"."ip")`,
      [userId, jti, userAgent || null, ip || null]
    );
  } catch (err) {
    logger.warn("UserSession upsert failed for user %s: %s", userId, (err as Error).message);
  }
}

export interface SessionContext {
  userAgent?: string | null;
  ip?: string | null;
}

type StringValue = SignOptions["expiresIn"];

const ACCESS_TTL = (process.env.JWT_ACCESS_TTL || "15m") as StringValue;
const REFRESH_TTL = (process.env.JWT_REFRESH_TTL || "7d") as StringValue;
const REFRESH_TTL_SECONDS = ttlToSeconds(String(REFRESH_TTL));

function ttlToSeconds(ttl: string): number {
  const m = ttl.match(/^(\d+)\s*([smhd])$/);
  if (!m) return 7 * 24 * 60 * 60;
  const n = parseInt(m[1]!, 10);
  switch (m[2]) {
    case "s":
      return n;
    case "m":
      return n * 60;
    case "h":
      return n * 60 * 60;
    case "d":
      return n * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
}

function getAccessSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not configured.");
  return s;
}

function getRefreshSecret(): string {
  // Falls back to JWT_SECRET so existing deployments don't break, but logs a
  // loud warning. In production you MUST set JWT_REFRESH_SECRET.
  const s = process.env.JWT_REFRESH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_REFRESH_SECRET must be set in production.");
  }
  logger.warn("JWT_REFRESH_SECRET not set — falling back to JWT_SECRET (dev only).");
  return getAccessSecret();
}

function refreshFamilyKey(userId: number): string {
  return `auth:refresh:${userId}`;
}

const isProductionEnv = (): boolean => process.env.NODE_ENV === "production";

class RefreshTokenStoreUnavailable extends Error {
  constructor(operation: string, cause: unknown) {
    super(`Refresh token store unavailable during ${operation}: ${(cause as Error)?.message || cause}`);
    this.name = "RefreshTokenStoreUnavailable";
  }
}

export const isRefreshStoreUnavailable = (e: unknown): e is RefreshTokenStoreUnavailable =>
  e instanceof RefreshTokenStoreUnavailable;

export interface AccessTokenPayload extends JwtPayload {
  type: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  type: "refresh";
  jti: string;
}

export function generateAccessToken(user: AuthUser | DbRow): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, type: "access" },
    getAccessSecret(),
    { expiresIn: ACCESS_TTL }
  );
}

export async function generateRefreshToken(
  user: AuthUser | DbRow,
  ctx?: SessionContext
): Promise<{
  token: string;
  jti: string;
  ttlSeconds: number;
}> {
  const jti = crypto.randomBytes(24).toString("hex");
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, type: "refresh", jti },
    getRefreshSecret(),
    { expiresIn: REFRESH_TTL }
  );

  try {
    await redisClient.set(
      refreshFamilyKey(Number(user.id)),
      jti,
      "EX",
      REFRESH_TTL_SECONDS
    );
  } catch (cause) {
    // Fail closed in production: without Redis we have no way to revoke or
    // detect refresh-token reuse, which makes any leaked refresh token valid
    // for the full TTL. Drop the connection rather than mint an untracked
    // token. Dev/test still gets a degraded warning so local work isn't
    // blocked by a missing local Redis.
    if (isProductionEnv()) {
      throw new RefreshTokenStoreUnavailable("issue", cause);
    }
    logger.warn("Redis unavailable — refresh token family not tracked for user %s (dev only)", user.id);
  }

  // Best-effort: track the new session so the Settings tab can list it.
  await upsertUserSession(Number(user.id), jti, ctx?.userAgent, ctx?.ip);

  return { token, jti, ttlSeconds: REFRESH_TTL_SECONDS };
}

export interface RefreshResult {
  user: { id: number; email: string; role: string };
  accessToken: string;
  refreshToken: string;
  refreshTtlSeconds: number;
}

/**
 * Verify a presented refresh token, rotate it, and return new tokens.
 * Throws on failure — callers should catch and respond 401.
 */
export async function rotateRefreshToken(
  presentedToken: string,
  ctx?: SessionContext
): Promise<RefreshResult> {
  let decoded: RefreshTokenPayload;
  try {
    decoded = jwt.verify(presentedToken, getRefreshSecret()) as RefreshTokenPayload;
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (!decoded || decoded.type !== "refresh" || !decoded.jti || !decoded.id) {
    throw new Error("Malformed refresh token");
  }

  const userId = Number(decoded.id);
  let expectedJti: string | null = null;
  let storeReachable = true;
  try {
    expectedJti = await redisClient.get(refreshFamilyKey(userId));
  } catch (cause) {
    storeReachable = false;
    if (isProductionEnv()) {
      // Without the family record we can't reliably detect refresh-token
      // reuse. Refuse to rotate so a stolen token can't be silently exchanged
      // for a fresh access/refresh pair while Redis is down.
      throw new RefreshTokenStoreUnavailable("rotation", cause);
    }
    logger.warn("Redis unavailable during refresh — skipping jti check for user %s (dev only)", userId);
  }

  if (storeReachable) {
    if (expectedJti === null) {
      // Family was revoked (logout / forced re-auth) or never recorded.
      throw new Error("Refresh session no longer valid; please sign in again");
    }
    if (expectedJti !== decoded.jti) {
      try { await redisClient.del(refreshFamilyKey(userId)); } catch { /* noop */ }
      throw new Error("Refresh token reuse detected; session revoked");
    }
  }

  const userShape: AuthUser = {
    id: userId,
    email: String(decoded.email),
    role: decoded.role as AuthUser["role"],
  };

  const accessToken = generateAccessToken(userShape);
  const next = await generateRefreshToken(userShape, ctx); // overwrites Redis entry

  // Replace the previous jti row with the new one so the Sessions list
  // reflects the rotation (each refresh = same conceptual session).
  if (decoded.jti && decoded.jti !== next.jti) {
    try {
      await sql(
        `DELETE FROM "UserSession" WHERE "userId" = $1 AND "refreshJti" = $2`,
        [userId, decoded.jti]
      );
    } catch {
      /* ignore */
    }
  }

  return {
    user: { id: userId, email: userShape.email, role: String(userShape.role) },
    accessToken,
    refreshToken: next.token,
    refreshTtlSeconds: next.ttlSeconds,
  };
}

/** Revoke a user's refresh token family — used on logout / password change. */
export async function revokeRefreshFamily(userId: number): Promise<void> {
  try {
    await redisClient.del(refreshFamilyKey(userId));
  } catch {
    logger.warn("Redis unavailable — could not revoke refresh family for user %s", userId);
  }
  try {
    await sql(`DELETE FROM "UserSession" WHERE "userId" = $1`, [userId]);
  } catch {
    /* ignore */
  }
}

export const tokenTtl = {
  accessTtlString: ACCESS_TTL,
  refreshTtlSeconds: REFRESH_TTL_SECONDS,
};
