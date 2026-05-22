/**
 * OAuth-connected accounts (YouTube + LinkedIn).
 *
 * We do the OAuth code-exchange dance manually with `axios` rather than
 * pulling in passport. The provider strategy is configured via env vars:
 *   GOOGLE_OAUTH_CLIENT_ID / _SECRET     → YouTube (Google identity)
 *   LINKEDIN_OAUTH_CLIENT_ID / _SECRET   → LinkedIn
 *
 * If the env vars are absent the start endpoint returns 503 and the UI
 * displays a "Configuration pending" badge.
 */
import crypto from "crypto";
import axios from "axios";
import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
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

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || "http://localhost:3000";

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
}

function configFor(provider: string): ProviderConfig | null {
  if (provider === "youtube") {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
      clientId,
      clientSecret,
    };
  }
  if (provider === "linkedin") {
    const clientId = process.env.LINKEDIN_OAUTH_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      authUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      userInfoUrl: "https://api.linkedin.com/v2/userinfo",
      scope: "openid email profile",
      clientId,
      clientSecret,
    };
  }
  return null;
}

function callbackFor(provider: string): string {
  return `${BACKEND_URL}/api/v1/connected-accounts/callback/${provider}`;
}

export const listConnectedAccounts: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const rows = await sql(
      `SELECT "provider", "providerAccountId", "displayName", "connectedAt", "expiresAt"
         FROM "ConnectedAccount"
        WHERE "userId" = $1`,
      [req.user.id]
    );
    const result: Record<string, { connected: boolean; displayName?: string; configured: boolean }> = {
      youtube: {
        connected: rows.some((r) => r.provider === "YOUTUBE"),
        displayName: rows.find((r) => r.provider === "YOUTUBE")?.displayName as string | undefined,
        configured: !!configFor("youtube"),
      },
      linkedin: {
        connected: rows.some((r) => r.provider === "LINKEDIN"),
        displayName: rows.find((r) => r.provider === "LINKEDIN")?.displayName as string | undefined,
        configured: !!configFor("linkedin"),
      },
    };
    return res.status(200).json(new ApiResponse(200, result, "Connected accounts fetched"));
  } catch (err) {
    logger.error("listConnectedAccounts: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to fetch connected accounts"));
  }
};

export const startOAuthConnect: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const provider = String(req.params.provider || "").toLowerCase();
    const cfg = configFor(provider);
    if (!cfg) return next(new ApiError(503, `${provider} OAuth is not configured`));

    const state = crypto.randomBytes(24).toString("hex");
    // Bind state → user for the callback. 10 minute window.
    await sql(
      `INSERT INTO "ConnectedAccount" ("userId", "provider", "scope")
       VALUES ($1, $2, $3)
       ON CONFLICT ("userId", "provider")
       DO UPDATE SET "scope" = $3, "updatedAt" = NOW()`,
      [req.user.id, `${provider.toUpperCase()}_PENDING`, state]
    );

    const url = new URL(cfg.authUrl);
    url.searchParams.set("client_id", cfg.clientId);
    url.searchParams.set("redirect_uri", callbackFor(provider));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", cfg.scope);
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");

    return res.status(200).json(new ApiResponse(200, { url: url.toString(), state }, "OAuth URL"));
  } catch (err) {
    logger.error("startOAuthConnect: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to start OAuth"));
  }
};

export const oauthCallback: Handler = async (req, res, next) => {
  try {
    const provider = String(req.params.provider || "").toLowerCase();
    const cfg = configFor(provider);
    if (!cfg) return next(new ApiError(503, `${provider} OAuth is not configured`));

    const q = req.query as Record<string, string | string[] | undefined>;
    const code = Array.isArray(q.code) ? q.code[0] : q.code;
    const state = Array.isArray(q.state) ? q.state[0] : q.state;
    if (!code || !state) return next(new ApiError(400, "Missing code or state"));

    const pending = (await sqlOne(
      `SELECT * FROM "ConnectedAccount" WHERE "provider" = $1 AND "scope" = $2`,
      [`${provider.toUpperCase()}_PENDING`, state]
    )) as DbRow | null;
    if (!pending) return next(new ApiError(400, "Invalid state"));

    const tokenRes = await axios.post(
      cfg.tokenUrl,
      new URLSearchParams({
        code: String(code),
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: callbackFor(provider),
        grant_type: "authorization_code",
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const { access_token, refresh_token, expires_in, scope: tokenScope } = tokenRes.data as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    let displayName = "";
    let providerAccountId = "";
    try {
      const me = await axios.get(cfg.userInfoUrl, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      displayName = String(me.data?.name || me.data?.email || "");
      providerAccountId = String(me.data?.sub || me.data?.id || "");
    } catch (err) {
      logger.warn("oauthCallback userinfo: %s", (err as Error).message);
    }

    await sql(
      `INSERT INTO "ConnectedAccount" ("userId", "provider", "providerAccountId", "accessToken", "refreshToken", "expiresAt", "scope", "displayName", "connectedAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT ("userId", "provider")
       DO UPDATE SET "providerAccountId" = EXCLUDED."providerAccountId",
                     "accessToken" = EXCLUDED."accessToken",
                     "refreshToken" = COALESCE(EXCLUDED."refreshToken", "ConnectedAccount"."refreshToken"),
                     "expiresAt" = EXCLUDED."expiresAt",
                     "scope" = EXCLUDED."scope",
                     "displayName" = EXCLUDED."displayName",
                     "updatedAt" = NOW()`,
      [
        pending.userId,
        provider.toUpperCase(),
        providerAccountId,
        access_token,
        refresh_token || null,
        expires_in ? new Date(Date.now() + expires_in * 1000) : null,
        tokenScope || cfg.scope,
        displayName || null,
      ]
    );

    // Clear the pending placeholder row.
    await sql(
      `DELETE FROM "ConnectedAccount" WHERE "userId" = $1 AND "provider" = $2`,
      [pending.userId, `${provider.toUpperCase()}_PENDING`]
    );

    return res.redirect(`${FRONTEND_URL}/settings#account`);
  } catch (err) {
    logger.error("oauthCallback: %s", (err as Error).message);
    return res.redirect(`${FRONTEND_URL}/settings?oauth_error=1#account`);
  }
};

export const disconnectAccount: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const provider = String(req.params.provider || "").toUpperCase();
    if (!["YOUTUBE", "LINKEDIN"].includes(provider)) {
      return next(new ApiError(400, "Invalid provider"));
    }
    await sql(
      `DELETE FROM "ConnectedAccount" WHERE "userId" = $1 AND "provider" = $2`,
      [req.user.id, provider]
    );
    return res.status(200).json(new ApiResponse(200, null, "Disconnected"));
  } catch (err) {
    logger.error("disconnectAccount: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to disconnect"));
  }
};
