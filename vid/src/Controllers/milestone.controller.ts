import { sql, sqlOne, withTransaction, txOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import { queueNotification } from "../Queues/processors.js";
import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

const SUM_EPS = 0.01;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDeliverables(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

/**
 * Create milestones for an order. Client only; amounts must match order total.
 */
export const createMilestones: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const orderId = parseInt((req.params as { orderId?: string }).orderId || "", 10);
    if (Number.isNaN(orderId) || orderId < 1) {
      return next(new ApiError(400, "Invalid order id"));
    }
    const body = req.body as { milestones?: Array<{ title: string; description?: string; dueDate: string | Date; amount: number }> };
    const milestones = body.milestones;
    if (!milestones?.length) {
      return next(new ApiError(400, "At least one milestone is required"));
    }

    const order = (await sqlOne(
      `SELECT o."id", o."client_id" AS "clientId", o."totalPrice", o."status", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [orderId]
    )) as DbRow | null;

    if (!order) {
      return next(new ApiError(404, "Order not found"));
    }
    if (order.clientId !== userId && req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Only the client can create milestones for this order"));
    }
    const st = String(order.status);
    if (st !== "PENDING" && st !== "CURRENT") {
      return next(new ApiError(400, "Order must be in PENDING or CURRENT status to add milestones"));
    }

    const existing = await sqlOne(
      `SELECT COUNT(*)::int AS c FROM "Milestone" WHERE "order_id" = $1`,
      [orderId]
    );
    if (existing && Number((existing as DbRow).c) > 0) {
      return next(new ApiError(400, "Milestones already exist for this order"));
    }

    const total = Number(order.totalPrice);
    let sum = 0;
    for (const m of milestones) {
      sum += round2(Number(m.amount));
    }
    if (Math.abs(sum - total) > SUM_EPS) {
      return next(
        new ApiError(400, `Milestone amounts must sum to the order total (${String(total)}). Current sum: ${String(round2(sum))}`)
      );
    }

    const created = (await withTransaction(async (client) => {
      const tOne = txOne(client);
      const out: DbRow[] = [];
      for (const m of milestones) {
        const due = new Date(m.dueDate);
        if (Number.isNaN(due.getTime())) {
          throw new ApiError(400, "Invalid due date for milestone");
        }
        const row = (await tOne(
          `INSERT INTO "Milestone" (
            "order_id", "title", "description", "dueDate", "status", "amount", "progress",
            "deliverables", "lastModifiedBy", "createdAt", "updatedAt", "jobId"
          ) VALUES ($1, $2, $3, $4, 'PENDING'::"MilestoneStatus", $5, 0, NULL, $6, NOW(), NOW(), NULL)
          RETURNING "id", "order_id" AS "orderId", "title", "description", "dueDate", "status",
            "progress", "amount", "deliverables", "completedAt", "approvedAt", "createdAt", "updatedAt"`,
          [orderId, m.title, m.description ?? null, due, m.amount, userId]
        )) as DbRow | null;
        if (row) out.push(row);
      }
      return out;
    })) as DbRow[];

    logger.info("Created %d milestones for order %d", created.length, orderId);
    return res.status(201).json(new ApiResponse(201, created, "Milestones created"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("createMilestones: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to create milestones"));
  }
};

/**
 * List milestones for an order. Client and freelancer of the order may view.
 */
export const getMilestonesByOrder: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const orderId = parseInt((req.params as { orderId?: string }).orderId || "", 10);
    if (Number.isNaN(orderId) || orderId < 1) {
      return next(new ApiError(400, "Invalid order id"));
    }

    const order = (await sqlOne(
      `SELECT o."id", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId", fp."user_id" AS "freelancerUserId"
       FROM "Order" o
       JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
       WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [orderId]
    )) as DbRow | null;

    if (!order) {
      return next(new ApiError(404, "Order not found"));
    }
    const isParty =
      order.clientId === userId || order.freelancerUserId === userId || req.user.role === "ADMIN";
    if (!isParty) {
      return next(new ApiError(403, "You do not have access to these milestones"));
    }

    const rows = await sql(
      `SELECT m."id", m."order_id" AS "orderId", m."title", m."description", m."dueDate", m."status",
        m."progress", m."amount", m."deliverables", m."completedAt", m."approvedAt", m."lastModifiedBy",
        m."createdAt", m."updatedAt"
      FROM "Milestone" m
      WHERE m."order_id" = $1
      ORDER BY m."dueDate" ASC`,
      [orderId]
    );

    return res.status(200).json(new ApiResponse(200, rows, "Milestones retrieved"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("getMilestonesByOrder: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to load milestones"));
  }
};

/**
 * Freelancer updates progress and optional deliverables.
 */
export const updateMilestoneProgress: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const milestoneId = parseInt((req.params as { milestoneId?: string }).milestoneId || "", 10);
    if (Number.isNaN(milestoneId) || milestoneId < 1) {
      return next(new ApiError(400, "Invalid milestone id"));
    }
    const body = req.body as { progress: number; deliverables?: Record<string, unknown> };
    const progress = Math.min(100, Math.max(0, Math.trunc(body.progress)));
    const deliverables = body.deliverables;

    const m = (await sqlOne(
      `SELECT m.*, o."client_id" AS "clientId", o."id" AS "orderId", fp."user_id" AS "freelancerUserId"
       FROM "Milestone" m
       JOIN "Order" o ON o."id" = m."order_id" AND o."deletedAt" IS NULL
       JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
       WHERE m."id" = $1`,
      [milestoneId]
    )) as (DbRow & { freelancerUserId?: number; orderId?: number }) | null;

    if (!m) {
      return next(new ApiError(404, "Milestone not found"));
    }
    if (m.freelancerUserId !== userId && req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Only the assigned freelancer can update this milestone"));
    }
    if (String(m.status) === "CANCELLED") {
      return next(new ApiError(400, "Milestone is cancelled"));
    }
    if (m.approvedAt) {
      return next(new ApiError(400, "Milestone is already approved and released"));
    }
    if (String(m.status) === "COMPLETED" && m.progress === 100 && !m.approvedAt) {
      return next(new ApiError(400, "Milestone is awaiting client review. Request a revision to change progress."));
    }

    const now = new Date();
    const mergedJson: unknown =
      deliverables !== undefined
        ? { ...parseDeliverables(m.deliverables), ...deliverables }
        : m.deliverables ?? null;

    const status =
      progress >= 100 ? "COMPLETED" : progress > 0 || String(m.status) === "IN_PROGRESS" ? "IN_PROGRESS" : "PENDING";

    const row = (await withTransaction(async (client) => {
      const tOne = txOne(client);
      const completedAt = progress >= 100 ? now : null;
      return tOne(
        `UPDATE "Milestone" SET
          "progress" = $1,
          "status" = $2::"MilestoneStatus",
          "deliverables" = $3::jsonb,
          "completedAt" = $4,
          "lastModifiedBy" = $5,
          "updatedAt" = $6
        WHERE "id" = $7 AND "approvedAt" IS NULL
        RETURNING "id", "order_id" AS "orderId", "title", "description", "dueDate", "status",
          "progress", "amount", "deliverables", "completedAt", "approvedAt", "createdAt", "updatedAt"`,
        [progress, status, mergedJson, completedAt, userId, now, milestoneId]
      );
    })) as DbRow | null;

    if (!row) {
      return next(new ApiError(409, "Milestone was updated by another process"));
    }

    if (progress >= 100) {
      queueNotification({
        userId: m.clientId as number,
        type: "ORDER_UPDATE",
        content: `A milestone is ready for review (order).`,
        entityType: "Order",
        entityId: m.orderId as number,
        priority: "HIGH",
      }).catch((err) => logger.warn("milestone client notify: %s", (err as Error).message));
    }

    return res.status(200).json(new ApiResponse(200, row, "Progress updated"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("updateMilestoneProgress: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to update milestone progress"));
  }
};

/**
 * Client approves a completed milestone, releasing that portion to the freelancer and optionally closing the order.
 */
export const approveMilestone: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const milestoneId = parseInt((req.params as { milestoneId?: string }).milestoneId || "", 10);
    if (Number.isNaN(milestoneId) || milestoneId < 1) {
      return next(new ApiError(400, "Invalid milestone id"));
    }

    const result = (await withTransaction(async (client) => {
      const tOne = txOne(client);

      const order = (await tOne(
        `SELECT o.*, o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId", o."orderNumber", o."escrowStatus", o."totalPrice",
          fp."user_id" AS "freelancerUserId"
         FROM "Order" o
         JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
         WHERE o."id" = (SELECT "order_id" FROM "Milestone" WHERE "id" = $1) AND o."deletedAt" IS NULL
         FOR UPDATE OF o`,
        [milestoneId]
      )) as (DbRow & { freelancerUserId?: number; clientId?: number }) | null;

      if (!order) {
        throw new ApiError(404, "Order not found");
      }
      if (order.clientId !== userId && req.user?.role !== "ADMIN") {
        throw new ApiError(403, "Only the client can approve a milestone");
      }

      const esc = String(order.escrowStatus || "");
      if (esc === "DISPUTED" || esc === "REFUNDED" || esc === "RELEASED") {
        throw new ApiError(400, "Cannot approve milestones in the current escrow state");
      }
      if (esc !== "HELD" && esc !== "RELEASE_REQUESTED") {
        throw new ApiError(400, "Escrow must be held to approve milestone payments");
      }

      const ms = (await tOne(
        `SELECT * FROM "Milestone" WHERE "id" = $1 FOR UPDATE`,
        [milestoneId]
      )) as DbRow | null;

      if (!ms) {
        throw new ApiError(404, "Milestone not found");
      }
      if (String(ms.status) !== "COMPLETED") {
        throw new ApiError(400, "Milestone must be completed before approval");
      }
      if (ms.approvedAt) {
        throw new ApiError(400, "Milestone was already approved");
      }

      const orderId = ms.order_id as number;
      if (orderId !== (order.id as number)) {
        throw new ApiError(500, "Milestone / order mismatch");
      }

      const amount = Number(ms.amount);
      const upd = await client.query(
        `UPDATE "Milestone"
         SET "approvedAt" = $1, "lastModifiedBy" = $2, "updatedAt" = $1
         WHERE "id" = $3 AND "status" = 'COMPLETED'::"MilestoneStatus" AND "approvedAt" IS NULL`,
        [new Date(), userId, milestoneId]
      );
      if (upd.rowCount === 0) {
        throw new ApiError(409, "Could not approve milestone (race condition or invalid state)");
      }

      await client.query(
        `UPDATE "FreelancerProfile" SET "totalEarnings" = "totalEarnings" + $1, "updatedAt" = $2 WHERE "id" = $3`,
        [amount, new Date(), order.freelancerId]
      );

      const totalM = (await tOne(
        `SELECT COUNT(*)::int AS c FROM "Milestone" WHERE "order_id" = $1`,
        [orderId]
      )) as { c: number } | null;
      const approvedM = (await tOne(
        `SELECT COUNT(*)::int AS c FROM "Milestone" WHERE "order_id" = $1 AND "approvedAt" IS NOT NULL`,
        [orderId]
      )) as { c: number } | null;

      const t = totalM ? Number(totalM.c) : 0;
      const a = approvedM ? Number(approvedM.c) : 0;
      let completedOrder: DbRow | null = null;

      if (t > 0 && t === a) {
        await client.query(
          `UPDATE "Order"
          SET "escrowStatus" = 'RELEASED', "status" = 'COMPLETED', "completedAt" = $1, "updatedAt" = $1, "progress" = 100
          WHERE "id" = $2 AND "deletedAt" IS NULL`,
          [new Date(), orderId]
        );
        await client.query(
          `UPDATE "Transaction"
          SET "status" = 'COMPLETED'::"TransactionStatus"
          WHERE "order_id" = $1 AND "type" = 'PAYMENT'::"TransactionType"`,
          [orderId]
        );
        completedOrder = (await tOne(
          `SELECT o."id", o."orderNumber", o."status", o."escrowStatus", o."completedAt" FROM "Order" o WHERE o."id" = $1`,
          [orderId]
        )) as DbRow | null;
      }

      const milestoneOut = (await tOne(
        `SELECT m."id", m."order_id" AS "orderId", m."title", m."description", m."dueDate", m."status",
          m."progress", m."amount", m."deliverables", m."completedAt", m."approvedAt", m."createdAt", m."updatedAt"
         FROM "Milestone" m WHERE m."id" = $1`,
        [milestoneId]
      )) as DbRow | null;

      return { order, milestone: milestoneOut, allApproved: t > 0 && t === a, orderCompleted: completedOrder };
    })) as { order: DbRow; milestone: DbRow | null; allApproved: boolean; orderCompleted: DbRow | null };

    const fUser = result.order.freelancerUserId as number;
    const amt = result.milestone ? Number((result.milestone as DbRow).amount) : 0;
    queueNotification({
      userId: fUser,
      type: "PAYMENT",
      content: `A milestone of $${String(amt)} was approved. Funds have been credited to your earnings.`,
      entityType: "Order",
      entityId: result.order.id as number,
    }).catch((err) => logger.warn("approve milestone notification: %s", (err as Error).message));

    if (result.orderCompleted) {
      queueNotification({
        userId: fUser,
        type: "ORDER_UPDATE",
        content: `All milestones for order #${String(result.order.orderNumber)} are approved. The order is complete and escrow is released.`,
        entityType: "Order",
        entityId: result.order.id as number,
        priority: "HIGH",
      }).catch((err) => logger.warn("order complete notification: %s", (err as Error).message));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          milestone: result.milestone,
          orderCompleted: result.orderCompleted,
          allMilestonesApproved: result.allApproved,
        },
        "Milestone approved"
      )
    );
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("approveMilestone: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to approve milestone"));
  }
};

/**
 * Client requests changes on a submitted milestone.
 */
export const requestRevision: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const milestoneId = parseInt((req.params as { milestoneId?: string }).milestoneId || "", 10);
    if (Number.isNaN(milestoneId) || milestoneId < 1) {
      return next(new ApiError(400, "Invalid milestone id"));
    }
    const body = req.body as { feedback: string };
    const feedback = String(body.feedback || "").trim();

    const m = (await sqlOne(
      `SELECT m.*, o."client_id" AS "clientId", o."id" AS "orderId", fp."user_id" AS "freelancerUserId"
       FROM "Milestone" m
       JOIN "Order" o ON o."id" = m."order_id" AND o."deletedAt" IS NULL
       JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
       WHERE m."id" = $1`,
      [milestoneId]
    )) as (DbRow & { freelancerUserId?: number; orderId?: number }) | null;

    if (!m) {
      return next(new ApiError(404, "Milestone not found"));
    }
    if (m.clientId !== userId && req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Only the client can request a revision"));
    }
    if (String(m.status) !== "COMPLETED") {
      return next(new ApiError(400, "Revision can only be requested for a completed milestone"));
    }
    if (m.approvedAt) {
      return next(new ApiError(400, "Milestone is already approved"));
    }

    const deliverables = parseDeliverables(m.deliverables);
    const revision = {
      ...deliverables,
      revisionFeedback: feedback,
      revisionRequestedAt: new Date().toISOString(),
      revisionRequestedBy: userId,
    };
    const now = new Date();

    const row = (await withTransaction(async (client) => {
      const tOne = txOne(client);
      return tOne(
        `UPDATE "Milestone" SET
          "status" = 'IN_PROGRESS'::"MilestoneStatus",
          "progress" = 0,
          "completedAt" = NULL,
          "deliverables" = $1::jsonb,
          "lastModifiedBy" = $2,
          "updatedAt" = $3
        WHERE "id" = $4 AND "approvedAt" IS NULL
        RETURNING "id", "order_id" AS "orderId", "title", "description", "dueDate", "status",
          "progress", "amount", "deliverables", "completedAt", "approvedAt", "createdAt", "updatedAt"`,
        [JSON.stringify(revision), userId, now, milestoneId]
      );
    })) as DbRow | null;

    if (!row) {
      return next(new ApiError(409, "Milestone could not be updated"));
    }

    const fu = m.freelancerUserId as number;
    queueNotification({
      userId: fu,
      type: "ORDER_UPDATE",
      content: "The client requested a revision on a milestone. Please check the updated feedback.",
      entityType: "Order",
      entityId: m.orderId as number,
      priority: "HIGH",
    }).catch((err) => logger.warn("revision notification: %s", (err as Error).message));

    return res.status(200).json(new ApiResponse(200, row, "Revision requested"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("requestRevision: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to request revision"));
  }
};
