/**
 * TOTP-based two-factor authentication.
 *
 * Setup flow:
 *   1. POST /security/2fa/setup → generates a secret, returns the
 *      `otpauth_url` and a base64 PNG QR. We persist the secret tentatively
 *      (`twoFactorSecret`) but keep `twoFactorEnabled` = false until the
 *      user proves they can produce a valid code.
 *   2. POST /security/2fa/verify-setup { code } → if the code matches we
 *      flip the enabled flag and generate 10 single-use recovery codes.
 *      Recovery codes are hashed (sha256) before storage.
 *
 * Login flow:
 *   - Normal login → if `twoFactorEnabled`, instead of issuing the session
 *     cookies we mint a short-lived `mfa_pending` JWT that only authorises
 *     `POST /security/2fa/login`. Once the user completes the challenge the
 *     real session cookies are issued.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { comparePasswords } from "../Services/authService.js";
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

const ISSUER = process.env.OTP_ISSUER || "Vidlancing";
const MFA_PENDING_TTL = 5 * 60; // 5 minutes

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new ApiError(500, "JWT_SECRET not configured");
  return s;
}

function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => crypto.randomBytes(5).toString("hex"));
}

export const get2faStatus: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const u = (await sqlOne(
      `SELECT "twoFactorEnabled", "twoFactorRecoveryCodes" FROM "User" WHERE "id" = $1`,
      [req.user.id]
    )) as DbRow | null;
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          enabled: Boolean(u?.twoFactorEnabled),
          recoveryCodesCount: Array.isArray(u?.twoFactorRecoveryCodes)
            ? u!.twoFactorRecoveryCodes!.length
            : 0,
        },
        "2FA status"
      )
    );
  } catch (err) {
    logger.error("get2faStatus: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to fetch 2FA status"));
  }
};

export const setup2fa: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const u = (await sqlOne(
      `SELECT "id", "email", "twoFactorEnabled" FROM "User" WHERE "id" = $1`,
      [req.user.id]
    )) as DbRow | null;
    if (!u) return next(new ApiError(404, "User not found"));
    if (u.twoFactorEnabled) {
      return next(new ApiError(400, "2FA is already enabled. Disable it first to re-configure."));
    }

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `${ISSUER} (${String(u.email)})`,
      issuer: ISSUER,
    });

    await sql(
      `UPDATE "User" SET "twoFactorSecret" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      [secret.base32, req.user.id]
    );

    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          secret: secret.base32,
          otpauthUrl: secret.otpauth_url,
          qrDataUrl,
        },
        "Scan QR to begin setup"
      )
    );
  } catch (err) {
    logger.error("setup2fa: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to start 2FA setup"));
  }
};

export const verify2faSetup: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { code } = req.body as { code?: string };
    if (!code) return next(new ApiError(400, "code is required"));

    const u = (await sqlOne(
      `SELECT "twoFactorSecret" FROM "User" WHERE "id" = $1`,
      [req.user.id]
    )) as DbRow | null;
    if (!u?.twoFactorSecret) return next(new ApiError(400, "Run setup first"));

    const valid = speakeasy.totp.verify({
      secret: String(u.twoFactorSecret),
      encoding: "base32",
      token: String(code),
      window: 1,
    });
    if (!valid) return next(new ApiError(400, "Invalid code"));

    const recovery = generateRecoveryCodes();
    const hashed = recovery.map(hashRecoveryCode);

    await sql(
      `UPDATE "User"
          SET "twoFactorEnabled" = true,
              "twoFactorRecoveryCodes" = $1::jsonb,
              "updatedAt" = NOW()
        WHERE "id" = $2`,
      [JSON.stringify(hashed), req.user.id]
    );

    return res
      .status(200)
      .json(new ApiResponse(200, { recoveryCodes: recovery }, "Two-factor authentication enabled"));
  } catch (err) {
    logger.error("verify2faSetup: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to verify 2FA setup"));
  }
};

export const disable2fa: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { currentPassword, code } = req.body as { currentPassword?: string; code?: string };
    if (!currentPassword || !code) {
      return next(new ApiError(400, "currentPassword and code are required"));
    }
    const u = (await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [req.user.id])) as DbRow | null;
    if (!u) return next(new ApiError(404, "User not found"));
    if (!u.twoFactorEnabled) return next(new ApiError(400, "2FA is not enabled"));

    const ok = await comparePasswords(currentPassword, String(u.password || ""));
    if (!ok) return next(new ApiError(400, "Password is incorrect"));

    const valid = speakeasy.totp.verify({
      secret: String(u.twoFactorSecret),
      encoding: "base32",
      token: String(code),
      window: 1,
    });
    if (!valid) return next(new ApiError(400, "Invalid 2FA code"));

    await sql(
      `UPDATE "User"
          SET "twoFactorEnabled" = false,
              "twoFactorSecret" = NULL,
              "twoFactorRecoveryCodes" = NULL,
              "updatedAt" = NOW()
        WHERE "id" = $1`,
      [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, null, "Two-factor authentication disabled"));
  } catch (err) {
    logger.error("disable2fa: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to disable 2FA"));
  }
};

/**
 * Issues a short-lived `mfa_pending` token. Public path called from
 * `loginUser` when 2FA is enabled.
 */
export function issueMfaPendingToken(userId: number): { mfaToken: string; expiresIn: number } {
  const mfaToken = jwt.sign(
    { id: userId, type: "mfa_pending" },
    getJwtSecret(),
    { expiresIn: MFA_PENDING_TTL }
  );
  return { mfaToken, expiresIn: MFA_PENDING_TTL };
}

/**
 * POST /security/2fa/login → exchanges { mfaToken, code } for a real
 * session. The session-issuance is delegated back to user.controller via a
 * callback so we don't duplicate cookie/CSRF logic.
 */
export async function consumeMfaPending(
  mfaToken: string,
  code: string
): Promise<DbRow> {
  let decoded: { id?: number; type?: string };
  try {
    decoded = jwt.verify(mfaToken, getJwtSecret()) as { id?: number; type?: string };
  } catch {
    throw new ApiError(401, "Invalid or expired MFA token");
  }
  if (decoded.type !== "mfa_pending" || !decoded.id) {
    throw new ApiError(401, "Invalid MFA token");
  }
  const u = (await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [decoded.id])) as DbRow | null;
  if (!u) throw new ApiError(404, "User not found");
  if (!u.twoFactorEnabled) throw new ApiError(400, "2FA is not enabled");

  const valid = speakeasy.totp.verify({
    secret: String(u.twoFactorSecret || ""),
    encoding: "base32",
    token: String(code),
    window: 1,
  });

  // Try recovery code if TOTP fails.
  if (!valid) {
    const codes: string[] = Array.isArray(u.twoFactorRecoveryCodes)
      ? (u.twoFactorRecoveryCodes as string[])
      : [];
    const hashed = hashRecoveryCode(String(code));
    const idx = codes.indexOf(hashed);
    if (idx === -1) throw new ApiError(400, "Invalid 2FA or recovery code");
    const remaining = [...codes.slice(0, idx), ...codes.slice(idx + 1)];
    await sql(
      `UPDATE "User" SET "twoFactorRecoveryCodes" = $1::jsonb WHERE "id" = $2`,
      [JSON.stringify(remaining), u.id]
    );
  }

  return u;
}
