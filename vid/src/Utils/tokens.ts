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
import type { AuthUser, DbRow, JwtPayload } from "../types/index.js";

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

export async function generateRefreshToken(user: AuthUser | DbRow): Promise<{
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

  // Track only the current jti per user (single-session by default). We could
  // promote this to a per-device family later by indexing by deviceId.
  await redisClient.set(
    refreshFamilyKey(Number(user.id)),
    jti,
    "EX",
    REFRESH_TTL_SECONDS
  );

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
export async function rotateRefreshToken(presentedToken: string): Promise<RefreshResult> {
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
  const expectedJti = await redisClient.get(refreshFamilyKey(userId));

  if (!expectedJti) {
    // Family was revoked (logout, password change, or never existed).
    throw new Error("Refresh token revoked");
  }

  if (expectedJti !== decoded.jti) {
    // Someone is presenting an old/stolen jti while a newer one already
    // rotated in. Treat as token theft: kill the family entirely.
    await redisClient.del(refreshFamilyKey(userId));
    throw new Error("Refresh token reuse detected; session revoked");
  }

  const userShape: AuthUser = {
    id: userId,
    email: String(decoded.email),
    role: decoded.role as AuthUser["role"],
  };

  const accessToken = generateAccessToken(userShape);
  const next = await generateRefreshToken(userShape); // overwrites Redis entry

  return {
    user: { id: userId, email: userShape.email, role: String(userShape.role) },
    accessToken,
    refreshToken: next.token,
    refreshTtlSeconds: next.ttlSeconds,
  };
}

/** Revoke a user's refresh token family — used on logout / password change. */
export async function revokeRefreshFamily(userId: number): Promise<void> {
  await redisClient.del(refreshFamilyKey(userId));
}

export const tokenTtl = {
  accessTtlString: ACCESS_TTL,
  refreshTtlSeconds: REFRESH_TTL_SECONDS,
};
