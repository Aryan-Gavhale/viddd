// src/controllers/transactionController.js
import { sql, sqlOne, sqlCount, pool, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import Stripe from "stripe";
import type {
  ExpressRequest,
  ExpressResponse,
  NextFunction,
  DbRow,
  OrderRow,
} from "../types/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2025-02-24.acacia" });

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

function mapTransactionRow(row: DbRow | null): DbRow | null {
  if (!row) return null;
  const r = row as DbRow & { order_id?: number; user_id?: number };
  const { order_id, user_id, ...rest } = r;
  return {
    ...rest,
    orderId: (rest.orderId as number | undefined) ?? order_id,
    userId: (rest.userId as number | undefined) ?? user_id,
  } as DbRow;
}

const createTransaction: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const orderIdRaw = body.orderId;
    const amountRaw = body.amount;
    const paymentMethodId = typeof body.paymentMethodId === "string" ? body.paymentMethodId : undefined;
    const orderId =
      typeof orderIdRaw === "number"
        ? orderIdRaw
        : typeof orderIdRaw === "string"
          ? parseInt(orderIdRaw, 10)
          : NaN;
    const amount =
      typeof amountRaw === "number" ? amountRaw : typeof amountRaw === "string" ? parseFloat(amountRaw) : NaN;

    if (!orderIdRaw || amountRaw === undefined || amountRaw === null || !paymentMethodId) {
      return next(new ApiError(400, "Order ID, amount, and payment method ID are required"));
    }
    if (Number.isNaN(amount)) {
      return next(new ApiError(400, "Invalid amount"));
    }

    const transaction = await withTransaction(async (client) => {
      const orderRow = await client.query(
        `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
         FROM "Order" o
         WHERE o."id" = $1 AND o."deletedAt" IS NULL
         FOR UPDATE`,
        [orderId]
      );
      const order = orderRow.rows[0] as (OrderRow & DbRow) | undefined;

      if (!order || order.client_id !== userId) {
        throw new ApiError(404, "Order not found or you don't own it");
      }

      if (Math.abs(amount - Number(order.totalPrice)) > 0.01) {
        throw new ApiError(400, "Amount does not match order price");
      }

      if (order.status !== "PENDING") {
        throw new ApiError(400, "Order must be in PENDING status to create a transaction");
      }

      const existingTx = await client.query(
        `SELECT "id" FROM "Transaction"
         WHERE "order_id" = $1 AND "type" = 'PAYMENT'::"TransactionType"
           AND "status" IN ('PENDING', 'COMPLETED')
         LIMIT 1`,
        [order.id]
      );
      if (existingTx.rows.length > 0) {
        throw new ApiError(409, "A payment transaction already exists for this order");
      }

      const chargeAmount = Number(order.totalPrice);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(chargeAmount * 100),
        currency: "usd",
        payment_method: paymentMethodId,
        confirmation_method: "manual",
        confirm: true,
        metadata: { orderId: String(order.id), userId: String(userId) },
      });

      const status = paymentIntent.status === "succeeded" ? "COMPLETED" : "PENDING";
      const txRow = await client.query(
        `INSERT INTO "Transaction" (
          "order_id", "user_id", "amount", "type", "paymentMethod", "status", "paymentIntentId"
        ) VALUES ($1, $2, $3, 'PAYMENT'::"TransactionType", 'stripe', $4::"TransactionStatus", $5)
        RETURNING *`,
        [order.id, userId, chargeAmount, status, paymentIntent.id]
      );
      return mapTransactionRow(txRow.rows[0] as DbRow);
    });

    return res.status(201).json(new ApiResponse(201, transaction, "Transaction created successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Error creating transaction: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to create transaction"));
  }
};

const processPayment: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { transactionId } = req.params as Record<string, string>;

    const transaction = mapTransactionRow(
      (await sqlOne(`SELECT t.* FROM "Transaction" t WHERE t."id" = $1`, [parseInt(transactionId, 10)])) as DbRow | null
    );
    if (!transaction || (transaction.userId as number) !== userId) {
      return next(new ApiError(404, "Transaction not found or you don’t own it"));
    }
    if (transaction.status !== "PENDING") {
      return next(new ApiError(400, "Transaction is not in PENDING status"));
    }

    const paymentIntent = await stripe.paymentIntents.confirm(String(transaction.paymentIntentId));
    if (paymentIntent.status === "succeeded") {
      const updatedTransaction = mapTransactionRow(
        (await sqlOne(
          `UPDATE "Transaction" SET "status" = 'COMPLETED'::"TransactionStatus"
           WHERE "id" = $1
           RETURNING *`,
          [transaction.id as number]
        )) as DbRow | null
      );
      await pool.query(
        `UPDATE "Order" SET "status" = 'CURRENT'::"OrderStatus", "updatedAt" = $1, "lastNotifiedAt" = $1
         WHERE "id" = $2 AND "deletedAt" IS NULL`,
        [new Date(), transaction.orderId]
      );
      await pool.query(
        `INSERT INTO "OrderStatusHistory" ("order_id", "status", "changed_by")
         VALUES ($1, 'CURRENT'::"OrderStatus", $2)`,
        [transaction.orderId, userId]
      );
      return res.status(200).json(new ApiResponse(200, updatedTransaction, "Payment processed successfully"));
    }

    return next(new ApiError(400, "Payment failed to process"));
  } catch (error) {
    logger.error("Error processing payment: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to process payment"));
  }
};

const refundTransaction: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { transactionId } = req.params as Record<string, string>;
    const body = req.body as Record<string, unknown>;
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    const transaction = mapTransactionRow(
      (await sqlOne(`SELECT t.* FROM "Transaction" t WHERE t."id" = $1`, [parseInt(transactionId, 10)])) as DbRow | null
    );
    if (!transaction || (transaction.userId as number) !== userId) {
      return next(new ApiError(404, "Transaction not found or you don’t own it"));
    }
    if (transaction.status !== "COMPLETED") {
      return next(new ApiError(400, "Only completed transactions can be refunded"));
    }

    const order = (await sqlOne(
      `SELECT o."id", o."status", o."escrowStatus"
       FROM "Order" o WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [transaction.orderId as number]
    )) as DbRow | null;
    if (!order) {
      return next(new ApiError(404, "Associated order not found"));
    }
    if (order.escrowStatus === "RELEASED") {
      return next(new ApiError(400, "Cannot refund: escrow already released to freelancer"));
    }
    if (order.escrowStatus === "REFUNDED") {
      return next(new ApiError(400, "Order has already been refunded"));
    }
    const refundableStatuses = ["PENDING", "REJECTED"];
    if (!refundableStatuses.includes(String(order.status))) {
      return next(new ApiError(400, `Cannot refund order in ${String(order.status)} status`));
    }

    const refund = await stripe.refunds.create({
      payment_intent: String(transaction.paymentIntentId),
      reason: (reason as "duplicate" | "fraudulent" | "requested_by_customer") || "requested_by_customer",
    });

    const updatedTransaction = await withTransaction(async (client) => {
      const ins = (await client.query(
        `INSERT INTO "Transaction" (
          "order_id", "user_id", "amount", "type", "paymentMethod", "status", "metadata"
        ) VALUES ($1, $2, $3, 'REFUND'::"TransactionType", 'stripe', 'COMPLETED'::"TransactionStatus", $4::jsonb)
        RETURNING *`,
        [transaction.orderId, userId, -Number(transaction.amount), JSON.stringify({ stripeRefundId: refund.id })]
      )).rows[0] as DbRow | null;

      await client.query(
        `UPDATE "Order" SET "escrowStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE "id" = $1`,
        [transaction.orderId]
      );

      return mapTransactionRow(ins);
    });

    return res.status(200).json(new ApiResponse(200, updatedTransaction, "Refund processed successfully"));
  } catch (error) {
    logger.error("Error refunding transaction: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to refund transaction"));
  }
};

const getTransaction: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { transactionId } = req.params as Record<string, string>;

    const transaction = mapTransactionRow(
      (await sqlOne(
        `SELECT t.* FROM "Transaction" t WHERE t."id" = $1`,
        [parseInt(transactionId, 10)]
      )) as DbRow | null
    );
    if (!transaction || (transaction.userId as number) !== userId) {
      return next(new ApiError(404, "Transaction not found or you don’t own it"));
    }

    const order = (await sqlOne(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [transaction.orderId as number]
    )) as (DbRow & { gig?: unknown }) | null;
    const gig = order
      ? await sqlOne(
          `SELECT * FROM "Gig" WHERE "id" = $1 AND "deletedAt" IS NULL`,
          [order.gigId as number]
        )
      : null;
    if (gig && order) {
      order.gig = gig;
    }
    const payload = { ...transaction, order: order || undefined };

    return res.status(200).json(new ApiResponse(200, payload, "Transaction retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving transaction: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve transaction"));
  }
};

const getUserTransactions: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const q = req.query as Record<string, string | string[] | undefined>;
    const pageRaw = q.page;
    const limitRaw = q.limit;
    const typeRaw = q.type;
    const page = (Array.isArray(pageRaw) ? pageRaw[0] : pageRaw) || "1";
    const limit = (Array.isArray(limitRaw) ? limitRaw[0] : limitRaw) || "10";
    const type = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;
    const take = parseInt(String(limit), 10);
    const offset = (parseInt(String(page), 10) - 1) * take;

    const listSql = type
      ? `SELECT t.*, t."order_id" AS "orderId", t."user_id" AS "userId"
         FROM "Transaction" t
         WHERE t."user_id" = $1 AND t."type" = $2::"TransactionType"
         ORDER BY t."createdAt" DESC
         LIMIT $3 OFFSET $4`
      : `SELECT t.*, t."order_id" AS "orderId", t."user_id" AS "userId"
         FROM "Transaction" t
         WHERE t."user_id" = $1
         ORDER BY t."createdAt" DESC
         LIMIT $2 OFFSET $3`;
    const countSql = type
      ? `SELECT COUNT(*)::int AS count FROM "Transaction" t WHERE t."user_id" = $1 AND t."type" = $2::"TransactionType"`
      : `SELECT COUNT(*)::int AS count FROM "Transaction" t WHERE t."user_id" = $1`;

    const listParams: unknown[] = type ? [userId, type, take, offset] : [userId, take, offset];
    const countParams: unknown[] = type ? [userId, type] : [userId];

    const [rows, total] = await Promise.all([
      sql(listSql, listParams),
      sqlCount(countSql, countParams),
    ]);
    const transactions = rows.map((r) => mapTransactionRow(r as DbRow));

    const orderIds = transactions
      .filter((t): t is DbRow => t != null)
      .map((t) => t.orderId as number)
      .filter(Boolean);

    const orderMap = new Map<number, Record<string, unknown>>();
    const gigMap = new Map<number, Record<string, unknown>>();

    if (orderIds.length > 0) {
      const orders = await sql(
        `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
         FROM "Order" o WHERE o."id" = ANY($1::int[]) AND o."deletedAt" IS NULL`,
        [orderIds]
      );
      for (const o of orders) orderMap.set(o.id as number, o);

      const gigIds = orders.map((o) => o.gigId as number).filter(Boolean);
      if (gigIds.length > 0) {
        const gigs = await sql(
          `SELECT * FROM "Gig" WHERE "id" = ANY($1::int[]) AND "deletedAt" IS NULL`,
          [gigIds]
        );
        for (const g of gigs) gigMap.set(g.id as number, g);
      }
    }

    for (const trow of transactions) {
      if (!trow || !trow.orderId) continue;
      const o = orderMap.get(trow.orderId as number);
      if (o) {
        const tw = trow as DbRow & { order?: DbRow };
        tw.order = { ...o } as DbRow & { gig?: DbRow | null };
        (tw.order as DbRow & { gig?: Record<string, unknown> | null }).gig =
          gigMap.get(o.gigId as number) || null;
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          transactions,
          total,
          page: parseInt(String(page), 10),
          limit: take,
          totalPages: Math.ceil(total / take) || 0,
        },
        "User transactions retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving user transactions: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve user transactions"));
  }
};

const getEarnings: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;

    const transactions = await sql(
      `SELECT "amount", "createdAt" FROM "Transaction"
       WHERE "user_id" = $1 AND "type" = 'PAYMENT'::"TransactionType" AND "status" = 'COMPLETED'::"TransactionStatus"`,
      [userId]
    );

    if (!transactions.length) {
      return res.status(200).json(new ApiResponse(200, [], "No earnings found"));
    }

    const earningsByMonth = (transactions as DbRow[]).reduce<Record<string, number>>((acc, tx) => {
      const createdAt = tx.createdAt ? new Date(tx.createdAt as string | Date) : new Date();
      const month = createdAt.toLocaleString("default", { month: "long", year: "numeric" });
      acc[month] = (acc[month] || 0) + Number(tx.amount || 0);
      return acc;
    }, {});

    const earningsData = Object.entries(earningsByMonth).map(([month, amt], index) => ({
      id: index + 1,
      month,
      amount: amt,
    }));

    return res.status(200).json(new ApiResponse(200, earningsData, "Earnings retrieved successfully"));
  } catch (error) {
    logger.error("Error in getEarnings for user %s: %s", String(req.user?.id ?? "unknown"), (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve earnings"));
  }
};

export {
  createTransaction,
  processPayment,
  refundTransaction,
  getTransaction,
  getUserTransactions,
  getEarnings,
};
