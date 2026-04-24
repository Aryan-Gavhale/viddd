import Stripe from "stripe";
import { pool, sqlOne, withTransaction } from "../db.js";
import logger from "../Utils/logger.js";
import { queueNotification } from "../Queues/processors.js";
import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2025-02-24.acacia" });

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

/**
 * Handle Stripe webhook events.
 * Raw body is needed for signature verification.
 */
export const handleStripeWebhook: Handler = async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      logger.error("STRIPE_WEBHOOK_SECRET is not set");
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    const bodyPayload: Buffer | string =
      (req as ExpressRequest & { rawBody?: Buffer | string }).rawBody ??
      (req.body as unknown as Buffer | string);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(bodyPayload, String(sig), endpointSecret);
    } catch (err) {
      logger.error("Stripe webhook signature verification failed: %s", (err as Error).message);
      return res.status(400).json({ error: "Webhook signature verification failed" });
    }

    let idempotencyEnabled = true;
    try {
      const inserted = await pool.query(
        `INSERT INTO "WebhookEvent" ("stripeEventId", "type", "processedAt")
         VALUES ($1, $2, NOW())
         ON CONFLICT ("stripeEventId") DO NOTHING
         RETURNING "id"`,
        [event.id, event.type]
      );
      if (inserted.rowCount === 0) {
        return res.status(200).json({ message: "Already processed" });
      }
    } catch (e) {
      idempotencyEnabled = false;
      logger.warn("WebhookEvent idempotency table unavailable, processing without guard: %s", (e as Error).message);
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case "payment_intent.payment_failed":
          await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case "charge.refunded":
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
        case "payment_intent.canceled":
          await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          logger.debug("Unhandled Stripe event: %s", event.type);
      }
    } catch (handlerErr) {
      logger.error("Stripe webhook handler error: %s", (handlerErr as Error).message);
      if (idempotencyEnabled) {
        try {
          await pool.query(
            `DELETE FROM "WebhookEvent" WHERE "stripeEventId" = $1`,
            [event.id]
          );
        } catch { /* allow retry */ }
      }
      return next(handlerErr);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error("handleStripeWebhook: %s", (error as Error).message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const found = (await sqlOne(
    `SELECT t.*, o."id" AS "order_id_ref", o."orderNumber" AS "orderNumber", o."client_id" AS "orderClientId"
     FROM "Transaction" t
     INNER JOIN "Order" o ON t."order_id" = o."id"
     WHERE t."paymentIntentId" = $1 AND o."deletedAt" IS NULL`,
    [paymentIntent.id]
  )) as DbRow | null;
  if (!found) {
    logger.warn("No transaction found for payment intent %s", paymentIntent.id);
    return;
  }

  const transaction = {
    id: found.id as number,
    amount: found.amount,
    orderId: (found.order_id as number) ?? (found.orderId as number),
    userId: (found.user_id as number) ?? (found.userId as number),
    order: {
      id: found.order_id_ref as number,
      orderNumber: found.orderNumber as string,
      clientId: found.orderClientId as number,
    },
  };

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE "Transaction" SET "status" = 'COMPLETED'::"TransactionStatus" WHERE "id" = $1`,
      [transaction.id]
    );
    await client.query(
      `UPDATE "Order" SET "escrowStatus" = 'HELD', "updatedAt" = $1 WHERE "id" = $2 AND "deletedAt" IS NULL`,
      [new Date(), transaction.orderId]
    );
  });

  await queueNotification({
    userId: transaction.order.clientId,
    type: "PAYMENT",
    content: `Payment of $${String(transaction.amount)} for order #${transaction.order.orderNumber} was successful. Funds are held in escrow.`,
    entityType: "Order",
    entityId: transaction.orderId,
  }).catch(() => {});

  logger.info("Payment succeeded for order %d, escrow HELD", transaction.orderId);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const found = (await sqlOne(
    `SELECT * FROM "Transaction" WHERE "paymentIntentId" = $1`,
    [paymentIntent.id]
  )) as DbRow | null;
  if (!found) return;

  const userId = (found.user_id as number) ?? (found.userId as number);

  await pool.query(
    `UPDATE "Transaction" SET "status" = 'FAILED'::"TransactionStatus" WHERE "id" = $1`,
    [found.id as number]
  );

  await queueNotification({
    userId,
    type: "PAYMENT",
    content: `Payment failed for order. Please update your payment method and try again.`,
    entityType: "Transaction",
    entityId: found.id as number,
    priority: "HIGH",
  }).catch(() => {});

  logger.warn("Payment failed for transaction %d", found.id as number);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;
  const found = (await sqlOne(
    `SELECT t.*, o."id" AS "order_id_ref"
     FROM "Transaction" t
     INNER JOIN "Order" o ON t."order_id" = o."id"
     WHERE (t."paymentIntentId" = $1 OR t."paymentGatewayId" = $2) AND o."deletedAt" IS NULL`,
    [piId || charge.id, charge.id]
  )) as DbRow | null;
  if (!found) return;

  const orderId = (found.order_id as number) ?? (found.orderId as number);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE "Transaction"
       SET "status" = 'FAILED'::"TransactionStatus", "refundReason" = 'Stripe refund'
       WHERE "id" = $1`,
      [found.id as number]
    );
    await client.query(
      `UPDATE "Order" SET "escrowStatus" = 'REFUNDED', "updatedAt" = $1 WHERE "id" = $2 AND "deletedAt" IS NULL`,
      [new Date(), orderId]
    );
  });

  logger.info("Charge refunded for transaction %d", found.id as number);
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const found = (await sqlOne(
    `SELECT * FROM "Transaction" WHERE "paymentIntentId" = $1`,
    [paymentIntent.id]
  )) as DbRow | null;
  if (!found) return;

  await pool.query(
    `UPDATE "Transaction" SET "status" = 'FAILED'::"TransactionStatus" WHERE "id" = $1`,
    [found.id as number]
  );

  logger.info("Payment canceled for transaction %d", found.id as number);
}
