import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount } from "../db.js";
import logger from "../Utils/logger.js";
import crypto from "crypto";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { DbRow, PromotionRow } from "../types/index.js";

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

const generatePromoCode = () => {
  return `VID${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

const createPromoCode: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id || req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Forbidden: Admin access required"));
    }
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const { discountAmount, discountType, maxUses, expiresAt } = body;

    if (!discountAmount || !discountType) {
      return next(new ApiError(400, "Discount amount and type are required"));
    }

    const validDiscountTypes = ["PERCENTAGE", "FIXED"];
    if (!validDiscountTypes.includes(String(discountType))) {
      return next(new ApiError(400, `Invalid discount type. Allowed: ${validDiscountTypes.join(", ")}`));
    }
    const amount = parseFloat(String(discountAmount));
    if (
      isNaN(amount) ||
      amount <= 0 ||
      (String(discountType) === "PERCENTAGE" && amount > 100)
    ) {
      return next(new ApiError(400, "Invalid discount amount"));
    }

    const code = generatePromoCode();
    const promotion = (await sqlOne(
      `INSERT INTO "Promotion" ("type", "code", "discountAmount", "discountType", "user_id", "maxUses", "expiresAt", "createdAt")
       VALUES ('PROMO_CODE', $1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        code,
        amount,
        discountType,
        userId,
        maxUses != null ? parseInt(String(maxUses), 10) : null,
        expiresAt ? new Date(String(expiresAt)) : null,
      ]
    )) as unknown as PromotionRow;

    return res.status(201).json(new ApiResponse(201, promotion, "Promo code created successfully"));
  } catch (error) {
    logger.error("Error creating promo code: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to create promo code"));
  }
};

const redeemPromoCode: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const { code, orderId } = body;

    if (!code || !orderId) {
      return next(new ApiError(400, "Promo code and order ID are required"));
    }

    const promotion = (await sqlOne(`SELECT * FROM "Promotion" WHERE "code" = $1`, [
      String(code),
    ])) as (PromotionRow & DbRow) | null;
    if (!promotion || promotion.type !== "PROMO_CODE") {
      return next(new ApiError(404, "Invalid promo code"));
    }
    if (promotion.status !== "ACTIVE" || (promotion.expiresAt && promotion.expiresAt < new Date())) {
      return next(new ApiError(400, "Promo code is expired or disabled"));
    }
    if (promotion.maxUses && promotion.uses >= promotion.maxUses) {
      return next(new ApiError(400, "Promo code has reached its usage limit"));
    }

    const order = (await sqlOne(
      `SELECT * FROM "Order" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [parseInt(String(orderId), 10)]
    )) as DbRow | null;
    if (!order || order.client_id !== userId) {
      return next(new ApiError(404, "Order not found or you don't own it"));
    }
    if (order.status !== "PENDING") {
      return next(new ApiError(400, "Promo code can only be applied to pending orders"));
    }

    const discount =
      promotion.discountType === "PERCENTAGE"
        ? Number(order.totalPrice) * (Number(promotion.discountAmount) / 100)
        : Math.min(Number(promotion.discountAmount), Number(order.totalPrice));

    const updatedOrder = (await sqlOne(
      `UPDATE "Order" SET "totalPrice" = GREATEST("totalPrice" - $1, 0) WHERE "id" = $2 AND "deletedAt" IS NULL RETURNING *`,
      [discount, parseInt(String(orderId), 10)]
    )) as DbRow;

    await sql(`UPDATE "Promotion" SET "uses" = "uses" + 1 WHERE "code" = $1`, [String(code)]);

    await sql(`INSERT INTO "Notification" ("user_id", "type", "content") VALUES ($1, 'SYSTEM', $2)`, [
      userId,
      `Promo code ${String(code)} applied! You saved $${discount.toFixed(2)} on order #${String(orderId)}`,
    ]);

    return res.status(200).json(new ApiResponse(200, updatedOrder, "Promo code redeemed successfully"));
  } catch (error) {
    logger.error("Error redeeming promo code: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to redeem promo code"));
  }
};

const featureListing: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const { entityType, entityId, durationDays } = body;

    if (!entityType || !entityId || !durationDays) {
      return next(new ApiError(400, "Entity type, entity ID, and duration are required"));
    }

    const validEntityTypes = ["GIG", "JOB"];
    if (!validEntityTypes.includes(String(entityType))) {
      return next(new ApiError(400, `Invalid entity type. Allowed: ${validEntityTypes.join(", ")}`));
    }

    if (String(entityType) === "GIG") {
      const gig = (await sqlOne(
        `SELECT g."id", fp."user_id"
         FROM "Gig" g JOIN "FreelancerProfile" fp ON fp."id" = g."freelancer_id"
         WHERE g."id" = $1 AND g."deletedAt" IS NULL`,
        [parseInt(String(entityId), 10)]
      )) as DbRow | null;
      if (!gig || gig.user_id !== userId) {
        return next(new ApiError(404, "Gig not found or you don't own it"));
      }
    } else {
      const job = (await sqlOne(
        `SELECT "id", "posted_by_id" FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
        [parseInt(String(entityId), 10)]
      )) as DbRow | null;
      if (!job || job.posted_by_id !== userId) {
        return next(new ApiError(404, "Job not found or you don't own it"));
      }
    }

    const costPerDay = 5;
    const totalCost = costPerDay * parseInt(String(durationDays), 10);

    // Payment collection via Stripe should be integrated before setting promotion status to ACTIVE.
    const promotion = (await sqlOne(
      `INSERT INTO "Promotion" ("type", "entityType", "entityId", "user_id", "status", "expiresAt", "createdAt")
       VALUES ('FEATURED_LISTING', $1, $2, $3, 'PENDING_PAYMENT', $4, NOW())
       RETURNING *`,
      [String(entityType), parseInt(String(entityId), 10), userId, new Date(Date.now() + parseInt(String(durationDays), 10) * 86400000)]
    )) as unknown as PromotionRow;

    await sql(`INSERT INTO "Notification" ("user_id", "type", "content") VALUES ($1, 'SYSTEM', $2)`, [
      userId,
      `Your ${String(entityType).toLowerCase()} #${String(entityId)} feature request is pending payment (${String(durationDays)} days planned). Cost: $${totalCost}`,
    ]);

    return res
      .status(201)
      .json(new ApiResponse(201, promotion, `${String(entityType)} feature request created; complete payment to activate`));
  } catch (error) {
    logger.error("Error featuring listing: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to feature listing"));
  }
};

const getPromotions: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { type } = req.query;
    const page = qs(req.query, "page", "1");
    const limit = qs(req.query, "limit", "20");
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const whereParts: string[] = [`"user_id" = $1`];
    const params: unknown[] = [userId];
    let p = 2;

    if (type) {
      const t = Array.isArray(type) ? type[0] : type;
      const validTypes = ["PROMO_CODE", "FEATURED_LISTING"];
      if (!validTypes.includes(String(t))) {
        return next(new ApiError(400, `Invalid type. Allowed: ${validTypes.join(", ")}`));
      }
      whereParts.push(`"type" = $${p}`);
      params.push(t);
      p++;
    }

    const whereClause = `WHERE ${whereParts.join(" AND ")}`;
    const countParams = [...params];
    params.push(lim, skip);

    const [promotions, total] = await Promise.all([
      sql(
        `SELECT * FROM "Promotion" ${whereClause} ORDER BY "createdAt" DESC LIMIT $${p} OFFSET $${p + 1}`,
        params
      ) as Promise<DbRow[]>,
      sqlCount(`SELECT COUNT(*)::int AS count FROM "Promotion" ${whereClause}`, countParams),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          promotions,
          total,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "Promotions retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving promotions: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve promotions"));
  }
};

export { createPromoCode, redeemPromoCode, featureListing, getPromotions };
