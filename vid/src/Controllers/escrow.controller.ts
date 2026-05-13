import { pool, sqlOne, withTransaction, txOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import { queueNotification } from "../Queues/processors.js";
import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";
import { createEscrowReleaseTransfer } from "../Services/payment.service.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

/**
 * Release escrow funds to freelancer.
 * Uses atomic conditional update to prevent double-spend race conditions.
 */
export const releaseEscrow: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const { orderId } = req.params as Record<string, string>;
    const userId = req.user.id;
    const parsedOrderId = parseInt(orderId, 10);

    const order = (await sqlOne(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId",
            fp."user_id" AS "freelancerUserId"
     FROM "Order" o
     JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
     WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [parsedOrderId]
    )) as DbRow | null;

    if (!order) {
      return next(new ApiError(404, "Order not found"));
    }
    const clientId = order.clientId as number;
    const role = req.user.role;
    if (clientId !== userId && role !== "ADMIN") {
      return next(new ApiError(403, "Only the client or an admin can release escrow"));
    }
    if (order.escrowStatus !== "HELD") {
      return next(
        new ApiError(400, `Cannot release escrow: current status is ${String(order.escrowStatus)}`)
      );
    }

    const totalPrice = Number(order.totalPrice);
    const payoutAmount = Number(order.freelancerPayout ?? order.totalPrice);
    const transfer = await createEscrowReleaseTransfer(order);
    const updated = (await withTransaction(async (client) => {
      const upd = await client.query(
        `UPDATE "Order"
       SET "escrowStatus" = 'RELEASED',
           "status" = 'COMPLETED',
           "completedAt" = $1,
           "updatedAt" = $1,
           "metadata" = COALESCE("metadata", '{}'::jsonb) || $3::jsonb
       WHERE "id" = $2 AND "escrowStatus" = 'HELD' AND "deletedAt" IS NULL`,
        [new Date(), parsedOrderId, JSON.stringify({ escrowRelease: transfer, releasedAt: new Date().toISOString() })]
      );

      if (upd.rowCount === 0) {
        throw new ApiError(409, "Escrow was already released or changed by another request");
      }

      await client.query(
        `UPDATE "Transaction"
       SET "status" = 'COMPLETED'::"TransactionStatus"
       WHERE "order_id" = $1 AND "type" = 'PAYMENT'::"TransactionType"`,
        [parsedOrderId]
      );

      await client.query(
        `UPDATE "FreelancerProfile"
       SET "totalEarnings" = "totalEarnings" + $1, "updatedAt" = $2
       WHERE "id" = $3`,
        [payoutAmount, new Date(), order.freelancerId]
      );

      const tOne = txOne(client);
      return tOne(
        `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
        [parsedOrderId]
      );
    })) as DbRow | null;

    const freelancerUserId = order.freelancerUserId as number;
    queueNotification({
      userId: freelancerUserId,
      type: "PAYMENT",
      content: `Escrow payout of $${payoutAmount} has been released for order #${String(order.orderNumber)}`,
      entityType: "Order",
      entityId: order.id as number,
    }).catch((err) => logger.warn("Failed to queue escrow release notification: %s", (err as Error).message));

    logger.info("Escrow released for order %d → freelancer %d", order.id, order.freelancerId);
    return res.status(200).json(new ApiResponse(200, updated, "Escrow released successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("releaseEscrow: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to release escrow"));
  }
};

/**
 * Request escrow release (freelancer submits delivery).
 * Uses atomic conditional update to prevent race conditions.
 */
export const requestEscrowRelease: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const { orderId } = req.params as Record<string, string>;
    const userId = req.user.id;
    const parsedOrderId = parseInt(orderId, 10);

    const order = (await sqlOne(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId",
            fp."user_id" AS "freelancerUserId"
     FROM "Order" o
     JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
     WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [parsedOrderId]
    )) as DbRow | null;

    if (!order) {
      return next(new ApiError(404, "Order not found"));
    }
    if (order.freelancerUserId !== userId) {
      return next(new ApiError(403, "Only the assigned freelancer can request escrow release"));
    }
    if (order.escrowStatus !== "HELD") {
      return next(new ApiError(400, "Escrow is not in HELD status"));
    }

    const r = await pool.query(
      `UPDATE "Order"
     SET "escrowStatus" = 'RELEASE_REQUESTED', "updatedAt" = $1
     WHERE "id" = $2 AND "escrowStatus" = 'HELD' AND "deletedAt" IS NULL`,
      [new Date(), parsedOrderId]
    );

    if (r.rowCount === 0) {
      return next(new ApiError(409, "Escrow status was already changed by another request"));
    }

    const updated = (await sqlOne(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
     FROM "Order" o
     WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [parsedOrderId]
    )) as DbRow | null;

    queueNotification({
      userId: order.clientId as number,
      type: "ORDER_UPDATE",
      content: `Freelancer has delivered order #${String(order.orderNumber)}. Please review and release escrow.`,
      entityType: "Order",
      entityId: order.id as number,
      priority: "HIGH",
    }).catch((err) => logger.warn("Failed to queue release request notification: %s", (err as Error).message));

    return res.status(200).json(new ApiResponse(200, updated, "Escrow release requested"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("requestEscrowRelease: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to request escrow release"));
  }
};

/**
 * Dispute escrow (either party can dispute before release).
 * Uses atomic conditional update on allowed statuses.
 */
export const disputeEscrow: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const u = req.user;
    const { orderId } = req.params as Record<string, string>;
    const body = req.body as Record<string, unknown>;
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    const parsedOrderId = parseInt(orderId, 10);

    const order = (await sqlOne(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId",
            fp."user_id" AS "freelancerUserId"
     FROM "Order" o
     JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
     WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [parsedOrderId]
    )) as DbRow | null;

    if (!order) {
      return next(new ApiError(404, "Order not found"));
    }
    if (order.clientId !== u.id && order.freelancerUserId !== u.id) {
      return next(new ApiError(403, "Only parties involved can dispute escrow"));
    }
    if (!["HELD", "RELEASE_REQUESTED"].includes(String(order.escrowStatus))) {
      return next(new ApiError(400, "Cannot dispute escrow in current state"));
    }

    const updated = (await withTransaction(async (client) => {
      const upd = await client.query(
        `UPDATE "Order"
       SET "escrowStatus" = 'DISPUTED', "updatedAt" = $1
       WHERE "id" = $2
         AND "escrowStatus" IN ('HELD', 'RELEASE_REQUESTED')
         AND "deletedAt" IS NULL`,
        [new Date(), parsedOrderId]
      );

      if (upd.rowCount === 0) {
        throw new ApiError(409, "Escrow status was already changed by another request");
      }

      await client.query(
        `INSERT INTO "Dispute" ("order_id", "raised_by_id", "reason", "status")
       VALUES ($1, $2, $3, 'OPEN'::"DisputeStatus")`,
        [parsedOrderId, u.id, reason || "Escrow dispute"]
      );

      const tOne = txOne(client);
      return tOne(
        `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
        [parsedOrderId]
      );
    })) as DbRow | null;

    return res.status(200).json(new ApiResponse(200, updated, "Escrow disputed — admin will review"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("disputeEscrow: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to dispute escrow"));
  }
};

/**
 * Get escrow status for an order.
 * Only order parties (client, freelancer) and admins can view.
 */
export const getEscrowStatus: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const { orderId } = req.params as Record<string, string>;

    const order = (await sqlOne(
      `SELECT o."id", o."orderNumber", o."totalPrice", o."escrowStatus", o."status", o."createdAt", o."completedAt",
            o."client_id" AS "clientId", fp."user_id" AS "freelancerUserId"
     FROM "Order" o
     JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
     WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [parseInt(orderId, 10)]
    )) as (DbRow & { clientId?: number; freelancerUserId?: number }) | null;

    if (!order) {
      return next(new ApiError(404, "Order not found"));
    }

    const isParty =
      order.clientId === req.user.id ||
      order.freelancerUserId === req.user.id ||
      req.user.role === "ADMIN";

    if (!isParty) {
      return next(new ApiError(403, "You do not have access to this order's escrow status"));
    }

    const { clientId: _c, freelancerUserId: _f, ...safeOrder } = order;
    return res.status(200).json(new ApiResponse(200, safeOrder, "Escrow status retrieved"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("getEscrowStatus: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to get escrow status"));
  }
};
