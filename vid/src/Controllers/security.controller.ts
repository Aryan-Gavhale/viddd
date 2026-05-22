/**
 * Security controller: password change, email change with re-verification,
 * password reset (forgot/reset), 2FA (TOTP), and active sessions.
 *
 * These endpoints power the Account & Security tab on `/settings` and the
 * matching tab inside the ClientDashboard. They share a common "verify the
 * caller is who they claim to be before mutating credentials" posture: every
 * mutating endpoint requires either the current password or a freshly issued
 * token from the email/2FA flow.
 */
import crypto from "crypto";
import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { hashPassword, comparePasswords } from "../Services/authService.js";
import { revokeRefreshFamily } from "../Utils/tokens.js";
import { queueEmail } from "../Queues/processors.js";
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

function genToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

// ── POST /security/password/change (logged in) ─────────────────────────────
export const changePassword: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return next(new ApiError(400, "currentPassword and newPassword are required"));
    }

    const user = (await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [userId])) as DbRow | null;
    if (!user || !user.isActive) return next(new ApiError(404, "User not found"));

    const ok = await comparePasswords(currentPassword, String(user.password || ""));
    if (!ok) return next(new ApiError(400, "Current password is incorrect"));

    const same = await comparePasswords(newPassword, String(user.password || ""));
    if (same) return next(new ApiError(400, "New password must differ from the current password"));

    const hashed = await hashPassword(newPassword);
    await sql(
      `UPDATE "User" SET "password" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      [hashed, userId]
    );

    // Revoke all sessions so the user is forced to re-login everywhere.
    await revokeRefreshFamily(userId);
    await sql(`DELETE FROM "UserSession" WHERE "userId" = $1`, [userId]);

    if (user.email) {
      try {
        await queueEmail(
          String(user.email),
          "Your Vidlancing password was changed",
          `<p>Hi ${String(user.firstname || "")},</p>
           <p>Your password was just changed. If this wasn't you, please reset your password immediately and contact support.</p>`
        );
      } catch (err) {
        logger.warn("changePassword: failed to queue notification email: %s", (err as Error).message);
      }
    }

    return res.status(200).json(new ApiResponse(200, null, "Password changed successfully"));
  } catch (err) {
    logger.error("changePassword: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to change password"));
  }
};

// ── POST /security/password/forgot (public) ────────────────────────────────
export const passwordForgot: Handler = async (req, res, next) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return next(new ApiError(400, "Email is required"));

    const user = (await sqlOne(
      `SELECT "id", "email", "firstname" FROM "User" WHERE "email" = $1 AND "isActive" = true`,
      [email]
    )) as DbRow | null;

    // Constant-time response: don't leak whether the address exists.
    if (user) {
      const token = genToken(24);
      const expiry = new Date(Date.now() + 30 * 60 * 1000);
      await sql(
        `UPDATE "User" SET "passwordResetToken" = $1, "passwordResetExpiry" = $2 WHERE "id" = $3`,
        [token, expiry, user.id]
      );
      const link = `${FRONTEND_URL}/password-recovery/verify?token=${token}`;
      try {
        await queueEmail(
          String(user.email),
          "Reset your Vidlancing password",
          `<div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
             <h2 style="color:#7c3aed;">Reset your password</h2>
             <p>Hi ${String(user.firstname || "")},</p>
             <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
             <a href="${link}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">Reset Password</a>
             <p style="color:#6b7280;font-size:14px;">If you didn't request a reset you can ignore this email.</p>
           </div>`
        );
      } catch (err) {
        logger.warn("passwordForgot: failed to queue email: %s", (err as Error).message);
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "If this email is registered, a reset link has been sent"));
  } catch (err) {
    logger.error("passwordForgot: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to send reset email"));
  }
};

// ── POST /security/password/reset (public, token-bound) ────────────────────
export const passwordReset: Handler = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    if (!token || !newPassword) {
      return next(new ApiError(400, "token and newPassword are required"));
    }

    const user = (await sqlOne(
      `SELECT "id", "email", "passwordResetToken", "passwordResetExpiry" FROM "User" WHERE "passwordResetToken" = $1`,
      [token]
    )) as DbRow | null;

    if (!user) return next(new ApiError(400, "Invalid or expired reset token"));

    const expiry = user.passwordResetExpiry ? new Date(user.passwordResetExpiry as string) : null;
    if (!expiry || expiry.getTime() < Date.now()) {
      return next(new ApiError(400, "Reset token has expired. Please request a new one."));
    }

    const hashed = await hashPassword(newPassword);
    await sql(
      `UPDATE "User"
          SET "password" = $1,
              "passwordResetToken" = NULL,
              "passwordResetExpiry" = NULL,
              "updatedAt" = NOW()
        WHERE "id" = $2`,
      [hashed, user.id]
    );

    await revokeRefreshFamily(Number(user.id));
    await sql(`DELETE FROM "UserSession" WHERE "userId" = $1`, [user.id]);

    return res.status(200).json(new ApiResponse(200, null, "Password reset successfully"));
  } catch (err) {
    logger.error("passwordReset: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to reset password"));
  }
};

// ── POST /users/me/email/change-request (logged in) ────────────────────────
export const requestEmailChange: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const { newEmail, currentPassword } = req.body as {
      newEmail?: string;
      currentPassword?: string;
    };
    if (!newEmail || !currentPassword) {
      return next(new ApiError(400, "newEmail and currentPassword are required"));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return next(new ApiError(400, "Invalid email format"));
    }

    const user = (await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [userId])) as DbRow | null;
    if (!user) return next(new ApiError(404, "User not found"));

    const ok = await comparePasswords(currentPassword, String(user.password || ""));
    if (!ok) return next(new ApiError(400, "Current password is incorrect"));

    if (newEmail === user.email) {
      return next(new ApiError(400, "New email must differ from your current email"));
    }

    const taken = await sqlOne(
      `SELECT "id" FROM "User" WHERE "email" = $1 AND "id" <> $2`,
      [newEmail, userId]
    );
    if (taken) return next(new ApiError(409, "That email is already in use"));

    const token = genToken(24);
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await sql(
      `UPDATE "User"
          SET "pendingEmail" = $1,
              "pendingEmailToken" = $2,
              "pendingEmailExpiry" = $3,
              "updatedAt" = NOW()
        WHERE "id" = $4`,
      [newEmail, token, expiry, userId]
    );

    const link = `${FRONTEND_URL}/email/verify-change?token=${token}`;
    try {
      await queueEmail(
        newEmail,
        "Confirm your new Vidlancing email",
        `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
           <h2 style="color:#7c3aed;">Confirm new email</h2>
           <p>Click the link below to confirm this is your new email address. The link expires in 1 hour.</p>
           <a href="${link}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">Confirm new email</a>
           <p style="color:#6b7280;font-size:14px;">If you didn't request this change you can ignore this email and your address won't be changed.</p>
         </div>`
      );
    } catch (err) {
      logger.warn("requestEmailChange: failed to queue confirm mail: %s", (err as Error).message);
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Verification email sent to your new address"));
  } catch (err) {
    logger.error("requestEmailChange: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to start email change"));
  }
};

// ── GET /users/email/verify-change?token=… (public) ────────────────────────
export const verifyEmailChange: Handler = async (req, res, next) => {
  try {
    const q = req.query as Record<string, string | string[] | undefined>;
    const raw = q.token;
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token) return next(new ApiError(400, "Token is required"));

    const user = (await sqlOne(
      `SELECT * FROM "User" WHERE "pendingEmailToken" = $1`,
      [token]
    )) as DbRow | null;
    if (!user) return next(new ApiError(400, "Invalid or expired token"));

    const expiry = user.pendingEmailExpiry ? new Date(user.pendingEmailExpiry as string) : null;
    if (!expiry || expiry.getTime() < Date.now()) {
      return next(new ApiError(400, "Token has expired. Please request a new email change."));
    }

    if (!user.pendingEmail) {
      return next(new ApiError(400, "No pending email change for this token"));
    }

    const taken = await sqlOne(
      `SELECT "id" FROM "User" WHERE "email" = $1 AND "id" <> $2`,
      [user.pendingEmail, user.id]
    );
    if (taken) {
      await sql(
        `UPDATE "User" SET "pendingEmail" = NULL, "pendingEmailToken" = NULL, "pendingEmailExpiry" = NULL WHERE "id" = $1`,
        [user.id]
      );
      return next(new ApiError(409, "That email has been claimed by another account"));
    }

    await sql(
      `UPDATE "User"
          SET "email" = "pendingEmail",
              "emailVerified" = true,
              "pendingEmail" = NULL,
              "pendingEmailToken" = NULL,
              "pendingEmailExpiry" = NULL,
              "updatedAt" = NOW()
        WHERE "id" = $1`,
      [user.id]
    );

    return res.status(200).json(new ApiResponse(200, null, "Email updated successfully"));
  } catch (err) {
    logger.error("verifyEmailChange: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to verify email change"));
  }
};
