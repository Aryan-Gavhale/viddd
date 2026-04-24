import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const checkAndAwardBadges: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;

    const rules = await sql(`SELECT * FROM "AutoBadgeRule" WHERE "isActive"=true`, []);
    const existing = await sql(`SELECT "badgeName" FROM "UserBadge" ub JOIN "Badge" b ON b.id=ub."badgeId" WHERE ub."userId"=$1`, [userId]);
    const hasBadge = new Set((existing as any[]).map((b) => b.badgeName));

    const awarded: string[] = [];

    for (const rule of rules as any[]) {
      if (hasBadge.has(rule.badgeName)) continue;

      let qualifies = false;
      switch (rule.triggerType) {
        case "ORDERS_COMPLETED": {
          const r = await sqlOne(`SELECT COUNT(*)::int AS c FROM "Order" WHERE "freelancerId"=$1 AND status='COMPLETED'`, [userId]);
          qualifies = Number(r?.c) >= rule.triggerValue;
          break;
        }
        case "FIVE_STAR_REVIEWS": {
          const r = await sqlOne(`SELECT COUNT(*)::int AS c FROM "Review" WHERE "revieweeId"=$1 AND rating=5`, [userId]);
          qualifies = Number(r?.c) >= rule.triggerValue;
          break;
        }
        case "HIGH_RATING": {
          const r = await sqlOne(`SELECT COUNT(*)::int AS c, AVG(rating) AS avg FROM "Review" WHERE "revieweeId"=$1`, [userId]);
          qualifies = Number(r?.c) >= rule.triggerValue && Number(r?.avg) >= 4.8;
          break;
        }
        case "COMMUNITY_POSTS": {
          const r = await sqlOne(`SELECT COUNT(*)::int AS c FROM "CommunityPost" WHERE "authorId"=$1`, [userId]);
          qualifies = Number(r?.c) >= rule.triggerValue;
          break;
        }
        case "SKILL_TESTS_PASSED": {
          const r = await sqlOne(`SELECT COUNT(*)::int AS c FROM "SkillBadge" WHERE "userId"=$1`, [userId]);
          qualifies = Number(r?.c) >= rule.triggerValue;
          break;
        }
        case "REFERRALS_REDEEMED": {
          const r = await sqlOne(`SELECT COUNT(*)::int AS c FROM "Referral" WHERE "referrer_id"=$1 AND status='REDEEMED'`, [userId]);
          qualifies = Number(r?.c) >= rule.triggerValue;
          break;
        }
        case "PORTFOLIO_VIDEOS": {
          const r = await sqlOne(
            `SELECT COUNT(*)::int AS c FROM "PortfolioVideo" WHERE freelancer_id = (SELECT id FROM "FreelancerProfile" WHERE user_id=$1)`, [userId]
          );
          qualifies = Number(r?.c) >= rule.triggerValue;
          break;
        }
        case "EARLY_ADOPTER": {
          const r = await sqlOne(`SELECT id FROM "User" WHERE id=$1 AND id <= $2`, [userId, rule.triggerValue]);
          qualifies = !!r;
          break;
        }
      }

      if (qualifies) {
        let badge = await sqlOne(`SELECT id FROM "Badge" WHERE name=$1`, [rule.badgeName]);
        if (!badge) {
          badge = await sqlOne(
            `INSERT INTO "Badge" (name, description, "iconUrl") VALUES ($1, $2, $3) RETURNING id`,
            [rule.badgeName, rule.description || "", rule.icon || "award"]
          );
        }
        await sql(
          `INSERT INTO "UserBadge" ("userId","badgeId","earnedAt") VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING`,
          [userId, badge.id]
        );
        awarded.push(rule.badgeName);
      }
    }

    return res.status(200).json(new ApiResponse(200, { awarded, total: awarded.length }, awarded.length > 0 ? `Earned ${awarded.length} new badge(s)!` : "No new badges"));
  } catch (e) {
    logger.error("checkAndAwardBadges: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to check badges"));
  }
};

export const getAutoRules: H = async (req, res, next) => {
  try {
    const rules = await sql(`SELECT * FROM "AutoBadgeRule" WHERE "isActive"=true ORDER BY "triggerType"`, []);
    return res.status(200).json(new ApiResponse(200, rules, "Badge rules"));
  } catch (e) {
    logger.error("getAutoRules: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};

export const getMyBadges: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const badges = await sql(
      `SELECT ub.*, b.name, b.description, b."iconUrl" AS icon
       FROM "UserBadge" ub JOIN "Badge" b ON b.id=ub."badgeId"
       WHERE ub."userId"=$1 ORDER BY ub."earnedAt" DESC`,
      [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, badges, "Your badges"));
  } catch (e) {
    logger.error("getMyBadges: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};
