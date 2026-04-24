import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount } from "../db.js";
import logger from "../Utils/logger.js";
import crypto from "crypto";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { DbRow, ReferralRow } from "../types/index.js";

type ControllerHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

function qs(
  q: Record<string, string | string[] | undefined>,
  key: string,
  defaultVal: string
): string {
  const v = q[key];
  if (v === undefined) return defaultVal;
  return Array.isArray(v) ? (v[0] ?? defaultVal) : v;
}

const generateReferralCode = (userId: number) => {
  const randomString = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `VID${userId}${randomString}`;
};

const createReferral: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const referrerId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const { rewardAmount } = body;

    const defaultReward = 10;
    const finalReward = rewardAmount ? Math.min(parseFloat(String(rewardAmount)), 50) : defaultReward;

    const referralCode = generateReferralCode(referrerId);

    const existing = (await sqlOne(
      `SELECT "id" FROM "Referral" WHERE "referralCode" = $1`,
      [referralCode]
    )) as DbRow | null;
    if (existing) {
      return next(new ApiError(500, "Referral code collision; please try again"));
    }

    const referral = (await sqlOne(
      `INSERT INTO "Referral" ("referrer_id", "referralCode", "rewardAmount", "createdAt")
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [referrerId, referralCode, finalReward]
    )) as unknown as ReferralRow & { referrer?: unknown };

    const referrer = (await sqlOne(
      `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
      [referrerId]
    )) as DbRow | null;
    referral.referrer = referrer;

    return res.status(201).json(new ApiResponse(201, referral, "Referral created successfully"));
  } catch (error) {
    logger.error("Error creating referral: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to create referral"));
  }
};

const redeemReferral: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const refereeId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const { referralCode } = body;

    if (!referralCode) {
      return next(new ApiError(400, "Referral code is required"));
    }

    const codeStr = String(referralCode);
    const referral = (await sqlOne(
      `SELECT r.*, ru."firstname" AS "referrer_firstname", ru."lastname" AS "referrer_lastname"
       FROM "Referral" r
       JOIN "User" ru ON ru."id" = r."referrer_id"
       WHERE r."referralCode" = $1`,
      [codeStr]
    )) as (ReferralRow & DbRow) | null;
    if (!referral) {
      return next(new ApiError(404, "Invalid referral code"));
    }
    if (referral.status !== "PENDING") {
      return next(new ApiError(400, "Referral code has already been redeemed or expired"));
    }
    if (referral.referrer_id === refereeId) {
      return next(new ApiError(400, "You cannot redeem your own referral code"));
    }

    const alreadyRedeemed = (await sqlOne(
      `SELECT "id" FROM "Referral" WHERE "referee_id" = $1 LIMIT 1`,
      [refereeId]
    )) as DbRow | null;
    if (alreadyRedeemed) {
      return next(new ApiError(400, "You have already redeemed a referral code"));
    }

    const updatedReferral = (await sqlOne(
      `UPDATE "Referral" SET "referee_id" = $1, "status" = 'REDEEMED', "redeemedAt" = NOW()
       WHERE "referralCode" = $2
       RETURNING *`,
      [refereeId, codeStr]
    )) as unknown as ReferralRow & { referrer?: unknown; referee?: unknown };

    await sql(`UPDATE "FreelancerProfile" SET "totalEarnings" = "totalEarnings" + $1 WHERE "user_id" = $2`, [
      referral.rewardAmount,
      referral.referrer_id,
    ]);

    await sql(
      `INSERT INTO "Notification" ("user_id", "type", "content") VALUES ($1, 'SYSTEM', $2), ($3, 'SYSTEM', $4)`,
      [
        referral.referrer_id,
        `Your referral code ${codeStr} was redeemed! You earned $${referral.rewardAmount}`,
        refereeId,
        `You successfully redeemed referral code ${codeStr}`,
      ]
    );

    const referee = (await sqlOne(
      `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
      [refereeId]
    )) as DbRow | null;

    updatedReferral.referrer = {
      firstname: (referral as DbRow).referrer_firstname,
      lastname: (referral as DbRow).referrer_lastname,
    };
    updatedReferral.referee = referee;

    return res.status(200).json(new ApiResponse(200, updatedReferral, "Referral redeemed successfully"));
  } catch (error) {
    logger.error("Error redeeming referral: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to redeem referral"));
  }
};

const getReferralStats: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const page = qs(req.query, "page", "1");
    const limit = qs(req.query, "limit", "20");
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const [referrals, total, stats] = await Promise.all([
      sql(
        `SELECT r.*,
                ru."firstname" AS "referrer_firstname", ru."lastname" AS "referrer_lastname",
                eu."firstname" AS "referee_firstname", eu."lastname" AS "referee_lastname"
         FROM "Referral" r
         JOIN "User" ru ON ru."id" = r."referrer_id"
         LEFT JOIN "User" eu ON eu."id" = r."referee_id"
         WHERE r."referrer_id" = $1
         ORDER BY r."createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [userId, lim, skip]
      ) as Promise<DbRow[]>,
      sqlCount(`SELECT COUNT(*)::int AS count FROM "Referral" WHERE "referrer_id" = $1`, [userId]),
      sqlOne(
        `SELECT
           COUNT(*)::int AS "totalReferrals",
           COUNT(*) FILTER (WHERE "status" = 'REDEEMED')::int AS "totalRedeemed",
           COALESCE(SUM("rewardAmount") FILTER (WHERE "status" = 'REDEEMED'), 0) AS "totalRewardsEarned"
         FROM "Referral"
         WHERE "referrer_id" = $1`,
        [userId]
      ) as Promise<DbRow | null>,
    ]);

    for (const r of referrals) {
      r.referrer = { firstname: r.referrer_firstname, lastname: r.referrer_lastname };
      r.referee = r.referee_firstname
        ? { firstname: r.referee_firstname, lastname: r.referee_lastname }
        : null;
      delete r.referrer_firstname;
      delete r.referrer_lastname;
      delete r.referee_firstname;
      delete r.referee_lastname;
    }

    const s = stats as DbRow;
    const analytics = {
      totalReferrals: s.totalReferrals,
      totalRedeemed: s.totalRedeemed,
      totalRewardsEarned: s.totalRewardsEarned,
      referrals,
      page: parseInt(page, 10),
      limit: lim,
      totalPages: Math.ceil(total / lim),
    };

    return res.status(200).json(new ApiResponse(200, analytics, "Referral stats retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving referral stats: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve referral stats"));
  }
};

export { createReferral, redeemReferral, getReferralStats };
