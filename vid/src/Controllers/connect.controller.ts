/**
 * Stripe Connect onboarding for editors.
 *
 * Lazy-creates an Express account on first onboard request and persists it
 * on `FreelancerProfile.stripeConnectedAccountId`. Status reads come from
 * `accounts.retrieve` so the dashboard always shows the current Stripe view
 * (we still cache `stripePayoutsEnabled` / `stripeOnboardingComplete` for
 * fast escrow-release checks; the `account.updated` webhook keeps them
 * fresh).
 */
import Stripe from "stripe";
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

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" }) : null;
const CONNECT_ENABLED = process.env.STRIPE_CONNECT_ENABLED !== "false";

function frontendUrl(): string {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

async function getFreelancerProfile(userId: number): Promise<DbRow> {
  const fp = (await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [userId])) as
    | DbRow
    | null;
  if (!fp) throw new ApiError(403, "Stripe Connect onboarding is only available for freelancers");
  return fp;
}

export const startConnectOnboarding: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    if (!stripe || !CONNECT_ENABLED) {
      return next(new ApiError(503, "Stripe Connect is not enabled on this environment"));
    }
    const userId = req.user.id;
    const fp = await getFreelancerProfile(userId);

    let connectedAccountId = fp.stripeConnectedAccountId
      ? String(fp.stripeConnectedAccountId)
      : null;
    if (!connectedAccountId) {
      const user = (await sqlOne(
        `SELECT "email", "country" FROM "User" WHERE "id" = $1`,
        [userId]
      )) as DbRow | null;
      const account = await stripe.accounts.create({
        type: "express",
        email: typeof user?.email === "string" ? user.email : undefined,
        country: typeof user?.country === "string" && user.country.length === 2 ? user.country : "US",
        capabilities: { transfers: { requested: true } },
        metadata: { userId: String(userId) },
      });
      connectedAccountId = account.id;
      await sql(
        `UPDATE "FreelancerProfile" SET "stripeConnectedAccountId" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        [connectedAccountId, fp.id]
      );
    }

    const link = await stripe.accountLinks.create({
      account: connectedAccountId,
      refresh_url: `${frontendUrl()}/settings#payment`,
      return_url: `${frontendUrl()}/settings#payment`,
      type: "account_onboarding",
    });

    return res.status(200).json(new ApiResponse(200, { url: link.url }, "Onboarding link created"));
  } catch (err) {
    logger.error("startConnectOnboarding: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to start onboarding"));
  }
};

export const getConnectStatus: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    if (!stripe || !CONNECT_ENABLED) {
      return res.status(200).json(
        new ApiResponse(
          200,
          { enabled: false, onboardingComplete: false, payoutsEnabled: false },
          "Stripe Connect not enabled"
        )
      );
    }
    const fp = (await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [req.user.id])) as
      | DbRow
      | null;
    if (!fp) return next(new ApiError(403, "Freelancer profile required"));

    if (!fp.stripeConnectedAccountId) {
      return res
        .status(200)
        .json(new ApiResponse(200, { enabled: true, onboardingComplete: false, payoutsEnabled: false }, "Not started"));
    }

    const account = await stripe.accounts.retrieve(String(fp.stripeConnectedAccountId));
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const onboardingComplete = Boolean(
      account.details_submitted && account.charges_enabled && account.payouts_enabled
    );

    await sql(
      `UPDATE "FreelancerProfile"
          SET "stripePayoutsEnabled" = $1,
              "stripeOnboardingComplete" = $2,
              "stripeRequirementsDue" = $3::jsonb,
              "updatedAt" = NOW()
        WHERE "id" = $4`,
      [
        payoutsEnabled,
        onboardingComplete,
        account.requirements ? JSON.stringify(account.requirements) : null,
        fp.id,
      ]
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          enabled: true,
          accountId: account.id,
          onboardingComplete,
          payoutsEnabled,
          requirements: account.requirements || null,
        },
        "Connect status fetched"
      )
    );
  } catch (err) {
    logger.error("getConnectStatus: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to fetch connect status"));
  }
};

export const getConnectDashboardLink: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    if (!stripe || !CONNECT_ENABLED) {
      return next(new ApiError(503, "Stripe Connect is not enabled"));
    }
    const fp = (await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [req.user.id])) as
      | DbRow
      | null;
    if (!fp?.stripeConnectedAccountId) {
      return next(new ApiError(404, "Stripe Connect account not provisioned yet"));
    }
    const link = await stripe.accounts.createLoginLink(String(fp.stripeConnectedAccountId));
    return res.status(200).json(new ApiResponse(200, { url: link.url }, "Dashboard link created"));
  } catch (err) {
    logger.error("getConnectDashboardLink: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to create dashboard link"));
  }
};
