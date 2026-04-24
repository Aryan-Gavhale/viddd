import { sql, sqlOne, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { PoolClient } from "pg";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

const FREELANCER_FEE_PERCENT = 12.5;
const CLIENT_FEE_PERCENT = 3.5;
const TEMPLATE_COMMISSION_PERCENT = 30;

/* ========================================
   SERVICE FEE — Calculate commission breakdown
   ======================================== */
export const getServiceFeeBreakdown: H = async (req, res, next) => {
  try {
    const q = req.query as Record<string, string>;
    const amount = parseInt(q.amount || "0", 10);
    if (amount <= 0) return next(new ApiError(400, "Amount must be positive"));

    const clientFee = Math.round(amount * (CLIENT_FEE_PERCENT / 100));
    const freelancerFee = Math.round(amount * (FREELANCER_FEE_PERCENT / 100));
    const freelancerPayout = amount - freelancerFee;
    const clientTotal = amount + clientFee;

    return res.status(200).json(new ApiResponse(200, {
      baseAmount: amount,
      clientFeePercent: CLIENT_FEE_PERCENT,
      clientFee,
      clientTotal,
      freelancerFeePercent: FREELANCER_FEE_PERCENT,
      freelancerFee,
      freelancerPayout,
      platformEarnings: clientFee + freelancerFee,
    }, "Fee breakdown calculated"));
  } catch (e) {
    logger.error("getServiceFeeBreakdown: %s", (e as Error).message);
    return next(new ApiError(500, "Fee calculation failed"));
  }
};

/* ========================================
   FEATURED LISTINGS — Wire Stripe payment
   ======================================== */
export const payForFeature: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;
    const promotionId = parseInt(String(b.promotionId), 10);

    const promo = await sqlOne(
      `SELECT * FROM "Promotion" WHERE id=$1 AND "user_id"=$2`, [promotionId, req.user.id]
    );
    if (!promo) return next(new ApiError(404, "Promotion not found"));
    if ((promo as Record<string, unknown>).status !== "PENDING_PAYMENT") {
      return next(new ApiError(400, "Promotion is not pending payment"));
    }

    await withTransaction(async (client: PoolClient) => {
      await client.query(
        `UPDATE "Promotion" SET "status"='ACTIVE' WHERE id=$1`, [promotionId]
      );

      const days = Math.ceil(
        (new Date((promo as Record<string, unknown>).expiresAt as string).getTime() - Date.now()) / 86400000
      );
      const amount = days * 500;

      await client.query(
        `INSERT INTO "PlatformRevenue" ("type","amount","sourceId","sourceType","description","createdAt")
         VALUES ('FEATURED_LISTING',$1,$2,'Promotion',$3,NOW())`,
        [amount, promotionId, `Featured listing activated for ${days} days`]
      );
    });

    return res.status(200).json(new ApiResponse(200, null, "Listing featured successfully"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("payForFeature: %s", (e as Error).message);
    return next(new ApiError(500, "Payment failed"));
  }
};

/* ========================================
   SUBSCRIPTIONS
   ======================================== */
export const getSubscriptionPlans: H = async (_req, res, next) => {
  try {
    const plans = await sql(`SELECT * FROM "SubscriptionPlan" WHERE "isActive"=true ORDER BY "priceMonthly" ASC`);
    return res.status(200).json(new ApiResponse(200, plans, "Plans retrieved"));
  } catch (e) {
    logger.error("getSubscriptionPlans: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get plans"));
  }
};

export const getMySubscription: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const sub = await sqlOne(
      `SELECT us.*, sp."name" as "planName", sp."tier", sp."features", sp."maxPortfolioItems",
              sp."maxGigs", sp."prioritySearch", sp."analyticsAccess", sp."renderCredits"
       FROM "UserSubscription" us
       JOIN "SubscriptionPlan" sp ON sp.id = us."planId"
       WHERE us."userId"=$1 AND us."status"='ACTIVE'
       ORDER BY us."createdAt" DESC LIMIT 1`, [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, sub, "Subscription retrieved"));
  } catch (e) {
    logger.error("getMySubscription: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get subscription"));
  }
};

export const subscribeToPlan: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;
    const planId = parseInt(String(b.planId), 10);
    const cycle = String(b.billingCycle || "MONTHLY").toUpperCase();

    const plan = await sqlOne(`SELECT * FROM "SubscriptionPlan" WHERE id=$1 AND "isActive"=true`, [planId]);
    if (!plan) return next(new ApiError(404, "Plan not found"));

    const p = plan as Record<string, unknown>;
    if (p.tier === "FREE") {
      return next(new ApiError(400, "Free plan does not require subscription"));
    }

    const periodEnd = cycle === "YEARLY"
      ? new Date(Date.now() + 365 * 86400000)
      : new Date(Date.now() + 30 * 86400000);
    const price = cycle === "YEARLY" ? Number(p.priceYearly) : Number(p.priceMonthly);

    const sub = await withTransaction(async (client: PoolClient) => {
      await client.query(
        `UPDATE "UserSubscription" SET "status"='CANCELLED', "cancelledAt"=NOW()
         WHERE "userId"=$1 AND "status"='ACTIVE'`, [req.user!.id]
      );

      const newSub = (await client.query(
        `INSERT INTO "UserSubscription" ("userId","planId","billingCycle","currentPeriodEnd","createdAt")
         VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
        [req.user!.id, planId, cycle, periodEnd]
      )).rows[0];

      await client.query(
        `INSERT INTO "PlatformRevenue" ("type","amount","sourceId","sourceType","description","createdAt")
         VALUES ('SUBSCRIPTION',$1,$2,'UserSubscription',$3,NOW())`,
        [price, newSub.id, `${p.name} ${cycle} subscription`]
      );

      return newSub;
    });

    return res.status(201).json(new ApiResponse(201, sub, "Subscribed successfully"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("subscribeToPlan: %s", (e as Error).message);
    return next(new ApiError(500, "Subscription failed"));
  }
};

export const cancelSubscription: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const result = await sql(
      `UPDATE "UserSubscription" SET "status"='CANCELLED', "cancelledAt"=NOW()
       WHERE "userId"=$1 AND "status"='ACTIVE' RETURNING *`, [req.user.id]
    );
    if ((result as unknown[]).length === 0) return next(new ApiError(404, "No active subscription"));
    return res.status(200).json(new ApiResponse(200, null, "Subscription cancelled"));
  } catch (e) {
    logger.error("cancelSubscription: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to cancel"));
  }
};

/* ========================================
   ENTERPRISE TIER
   ======================================== */
export const createEnterpriseAccount: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;
    const companyName = String(b.companyName || "").trim();
    if (!companyName) return next(new ApiError(400, "Company name required"));

    const existing = await sqlOne(
      `SELECT id FROM "EnterpriseAccount" WHERE "ownerId"=$1 AND "status"='ACTIVE'`, [req.user.id]
    );
    if (existing) return next(new ApiError(409, "You already have an active enterprise account"));

    const plan = String(b.plan || "STANDARD").toUpperCase();
    const seats = plan === "PREMIUM" ? 25 : plan === "SCALE" ? 100 : 5;
    const budget = plan === "PREMIUM" ? 50000 : plan === "SCALE" ? 200000 : 10000;
    const pricing = plan === "PREMIUM" ? 9999 : plan === "SCALE" ? 24999 : 4999;
    const features = JSON.stringify({
      bulkHiring: plan !== "STANDARD",
      customWorkflows: plan === "SCALE",
      apiAccess: plan !== "STANDARD",
      ssoEnabled: plan === "SCALE",
      dedicatedManager: plan === "SCALE",
    });

    const account = await withTransaction(async (client: PoolClient) => {
      const acc = (await client.query(
        `INSERT INTO "EnterpriseAccount" ("companyName","ownerId","plan","maxSeats","monthlyBudget","features","customWorkflows","bulkHiring","apiAccess","ssoEnabled","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING *`,
        [companyName, req.user!.id, plan, seats, budget, features,
         plan === "SCALE", plan !== "STANDARD", plan !== "STANDARD", plan === "SCALE"]
      )).rows[0];

      await client.query(
        `INSERT INTO "EnterpriseMember" ("accountId","userId","role","permissions","joinedAt")
         VALUES ($1,$2,'OWNER',$3,NOW())`,
        [acc.id, req.user!.id, JSON.stringify(["*"])]
      );

      await client.query(
        `INSERT INTO "PlatformRevenue" ("type","amount","sourceId","sourceType","description","createdAt")
         VALUES ('ENTERPRISE',$1,$2,'EnterpriseAccount',$3,NOW())`,
        [pricing, acc.id, `Enterprise ${plan} account created`]
      );

      return acc;
    });

    return res.status(201).json(new ApiResponse(201, account, "Enterprise account created"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("createEnterpriseAccount: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to create enterprise account"));
  }
};

export const getMyEnterprise: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const account = await sqlOne(
      `SELECT ea.*, json_agg(json_build_object('id',em.id,'userId',em."userId",'role',em."role",'joinedAt',em."joinedAt")) as members
       FROM "EnterpriseAccount" ea
       LEFT JOIN "EnterpriseMember" em ON em."accountId" = ea.id
       WHERE ea."ownerId"=$1 AND ea."status"='ACTIVE'
       GROUP BY ea.id`, [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, account, "Enterprise account retrieved"));
  } catch (e) {
    logger.error("getMyEnterprise: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get enterprise"));
  }
};

export const inviteEnterpriseMember: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;
    const userId = parseInt(String(b.userId), 10);
    const role = String(b.role || "MEMBER");

    const account = await sqlOne(
      `SELECT * FROM "EnterpriseAccount" WHERE "ownerId"=$1 AND "status"='ACTIVE'`, [req.user.id]
    );
    if (!account) return next(new ApiError(404, "No enterprise account"));

    const a = account as Record<string, unknown>;
    if (Number(a.usedSeats) >= Number(a.maxSeats)) {
      return next(new ApiError(400, "Seat limit reached"));
    }

    await withTransaction(async (client: PoolClient) => {
      await client.query(
        `INSERT INTO "EnterpriseMember" ("accountId","userId","role","permissions","joinedAt")
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT ("accountId","userId") DO UPDATE SET "role"=$3`,
        [a.id, userId, role, JSON.stringify(["read", "write"])]
      );
      await client.query(
        `UPDATE "EnterpriseAccount" SET "usedSeats"="usedSeats"+1, "updatedAt"=NOW() WHERE id=$1`, [a.id]
      );
    });

    return res.status(201).json(new ApiResponse(201, null, "Member invited"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("inviteEnterpriseMember: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to invite member"));
  }
};

/* ========================================
   ADMIN: Revenue Dashboard
   ======================================== */
export const getRevenueDashboard: H = async (req, res, next) => {
  try {
    if (!req.user?.id || req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Admin only"));
    }

    const totals = await sql(
      `SELECT "type", SUM("amount") as total, COUNT(*) as count
       FROM "PlatformRevenue" GROUP BY "type" ORDER BY total DESC`
    );

    const monthly = await sql(
      `SELECT DATE_TRUNC('month', "createdAt") as month, "type", SUM("amount") as total
       FROM "PlatformRevenue"
       WHERE "createdAt" > NOW() - INTERVAL '12 months'
       GROUP BY month, "type" ORDER BY month DESC`
    );

    const grandTotal = await sqlOne(
      `SELECT SUM("amount") as total FROM "PlatformRevenue"`
    );

    const activeSubs = await sqlOne(
      `SELECT COUNT(*) as count FROM "UserSubscription" WHERE "status"='ACTIVE'`
    );

    const activeEnterprise = await sqlOne(
      `SELECT COUNT(*) as count FROM "EnterpriseAccount" WHERE "status"='ACTIVE'`
    );

    return res.status(200).json(new ApiResponse(200, {
      revenueByType: totals,
      monthlyBreakdown: monthly,
      grandTotal: Number((grandTotal as Record<string, unknown>)?.total || 0),
      activeSubscriptions: Number((activeSubs as Record<string, unknown>)?.count || 0),
      activeEnterpriseAccounts: Number((activeEnterprise as Record<string, unknown>)?.count || 0),
    }, "Revenue dashboard"));
  } catch (e) {
    logger.error("getRevenueDashboard: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get revenue data"));
  }
};
