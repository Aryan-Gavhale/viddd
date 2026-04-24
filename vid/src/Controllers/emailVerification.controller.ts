import crypto from "crypto";
import { sqlOne } from "../db.js";
import nodemailer from "nodemailer";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { ApiError } from "../Utils/ApiError.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction, UserRow } from "../types/index.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

export const sendVerificationEmail: Handler = async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email : undefined;

    if (!email) {
      return next(new ApiError(400, "Email is required"));
    }
    // Rate limiting should be applied at the route (e.g. express-rate-limit) to deter abuse; responses stay generic to prevent email enumeration.
    const user = (await sqlOne(`SELECT * FROM "User" WHERE "email" = $1`, [email])) as UserRow | null;
    if (!user) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, null, "If this email is registered, a verification link has been sent")
        );
    }

    if (user.emailVerified) {
      return res.status(200).json(new ApiResponse(200, null, "Email is already verified"));
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await sqlOne(
      `UPDATE "User" SET "verificationToken" = $1, "verificationTokenExpiry" = $2 WHERE "email" = $3 RETURNING "id"`,
      [verificationToken, tokenExpiry, email]
    );

    const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: "Verify your Vidlancing account",
        html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
          <h2 style="color: #1e40af;">Verify your email</h2>
          <p>Click the button below to verify your email address:</p>
          <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; margin: 16px 0;">Verify Email</a>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't create an account, you can ignore this email.</p>
        </div>
      `,
      });
    } catch (err) {
      logger.error("Failed to send verification email: %s", (err as Error).message);
      return next(new ApiError(500, "Failed to send verification email. Please try again later."));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, null, "If this email is registered, a verification link has been sent")
      );
  } catch (error) {
    logger.error("sendVerificationEmail: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to send verification email"));
  }
};

export const verifyEmailToken: Handler = async (req, res, next) => {
  try {
    const q = req.query as Record<string, string | string[] | undefined>;
    const raw = q.token;
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (!token) {
      return next(new ApiError(400, "Verification token is required"));
    }

    const user = (await sqlOne(
      `SELECT * FROM "User" WHERE "verificationToken" = $1`,
      [token]
    )) as UserRow | null;

    if (!user) {
      return next(new ApiError(400, "Invalid or expired verification token"));
    }

    const expiry = user.verificationTokenExpiry;
    if (expiry && expiry < new Date()) {
      return next(new ApiError(400, "Verification token has expired. Please request a new one."));
    }

    await sqlOne(
      `UPDATE "User" SET "emailVerified" = true, "pendingVerification" = false,
     "verificationToken" = NULL, "verificationTokenExpiry" = NULL
     WHERE "email" = $1 RETURNING "id"`,
      [user.email]
    );

    return res.status(200).json(new ApiResponse(200, null, "Email verified successfully"));
  } catch (error) {
    logger.error("verifyEmailToken: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to verify email"));
  }
};

export const resendVerificationEmail: Handler = async (req, res, next) => {
  return sendVerificationEmail(req, res, next);
};
