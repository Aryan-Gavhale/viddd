import Stripe from "stripe";
import { pool, sqlOne, withTransaction } from "../db.js";
import logger from "../Utils/logger.js";
import { queueNotification } from "../Queues/processors.js";
import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" })
  : (null as unknown as Stripe);

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

    // Idempotency MUST hold for Stripe webhooks. If the WebhookEvent table is
    // unreachable we cannot guarantee a duplicate event won't release escrow,
    // refund twice, or double-credit a freelancer. Return 503 so Stripe
    // retries with backoff instead of silently processing without protection.
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
      logger.error(
        "WebhookEvent idempotency store unavailable, refusing to process %s (%s): %s — Stripe will retry.",
        event.id,
        event.type,
        (e as Error).message
      );
      return res
        .status(503)
        .json({ error: "Idempotency store unavailable, please retry" });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
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
        case "payment_method.attached":
          await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;
        case "payment_method.detached":
          await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
          break;
        case "account.updated":
          await handleConnectAccountUpdated(event.data.object as Stripe.Account);
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

  await markPaymentSuccessful(transaction.id, transaction.orderId, transaction.userId, paymentIntent.id);

  await queueNotification({
    userId: transaction.order.clientId,
    type: "PAYMENT",
    content: `Payment of $${String(transaction.amount)} for order #${transaction.order.orderNumber} was successful. Funds are held in escrow.`,
    entityType: "Order",
    entityId: transaction.orderId,
  }).catch(() => {});

  logger.info("Payment succeeded for order %d, escrow HELD", transaction.orderId);
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const found = (await sqlOne(
    `SELECT t.*, o."id" AS "order_id_ref", o."orderNumber" AS "orderNumber", o."client_id" AS "orderClientId"
       FROM "Transaction" t
       INNER JOIN "Order" o ON t."order_id" = o."id"
      WHERE t."paymentGatewayId" = $1 AND o."deletedAt" IS NULL`,
    [session.id]
  )) as DbRow | null;
  if (!found) {
    logger.warn("No transaction found for checkout session %s", session.id);
    return;
  }

  const orderId = (found.order_id as number) ?? (found.orderId as number);
  const userId = (found.user_id as number) ?? (found.userId as number);
  await markPaymentSuccessful(found.id as number, orderId, userId, paymentIntentId || null);

  await queueNotification({
    userId: found.orderClientId as number,
    type: "PAYMENT",
    content: `Payment for order #${String(found.orderNumber)} was successful. Funds are held in escrow.`,
    entityType: "Order",
    entityId: orderId,
  }).catch(() => {});

  logger.info("Checkout session completed for order %d", orderId);
}

async function markPaymentSuccessful(transactionId: number, orderId: number, userId: number, paymentIntentId?: string | null) {
  const now = new Date();
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE "Transaction"
          SET "status" = 'COMPLETED'::"TransactionStatus",
              "paymentIntentId" = COALESCE($2, "paymentIntentId"),
              "metadata" = COALESCE("metadata", '{}'::jsonb) || $3::jsonb
        WHERE "id" = $1`,
      [transactionId, paymentIntentId || null, JSON.stringify({ webhookConfirmedAt: now.toISOString() })]
    );
    const updated = await client.query(
      `UPDATE "Order"
          SET "status" = CASE WHEN "status" = 'PENDING'::"OrderStatus" THEN 'CURRENT'::"OrderStatus" ELSE "status" END,
              "escrowStatus" = 'HELD',
              "progress" = GREATEST(COALESCE("progress", 0), 5),
              "updatedAt" = $1,
              "lastNotifiedAt" = $1
        WHERE "id" = $2 AND "deletedAt" IS NULL
        RETURNING "status"`,
      [now, orderId]
    );
    if (updated.rowCount) {
      await client.query(
        `INSERT INTO "OrderStatusHistory" ("order_id", "status", "changed_by")
         SELECT $1, 'CURRENT'::"OrderStatus", $2
         WHERE NOT EXISTS (
           SELECT 1 FROM "OrderStatusHistory" WHERE "order_id" = $1 AND "status" = 'CURRENT'
         )`,
        [orderId, userId]
      );
    }
  });
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

async function handlePaymentMethodAttached(pm: Stripe.PaymentMethod): Promise<void> {
  const customerId = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
  if (!customerId) return;
  const user = (await sqlOne(
    `SELECT "id" FROM "User" WHERE "stripeCustomerId" = $1`,
    [customerId]
  )) as DbRow | null;
  if (!user) {
    logger.warn("payment_method.attached for unknown customer %s", customerId);
    return;
  }
  const card = pm.card;
  await pool.query(
    `INSERT INTO "PaymentMethodRecord" ("userId", "stripePaymentMethodId", "brand", "last4", "expMonth", "expYear", "isDefault")
     VALUES ($1, $2, $3, $4, $5, $6, false)
     ON CONFLICT ("stripePaymentMethodId")
     DO UPDATE SET "brand" = EXCLUDED."brand", "last4" = EXCLUDED."last4",
                   "expMonth" = EXCLUDED."expMonth", "expYear" = EXCLUDED."expYear"`,
    [user.id, pm.id, card?.brand || null, card?.last4 || null, card?.exp_month || null, card?.exp_year || null]
  );
  logger.info("Recorded payment method %s for user %s", pm.id, user.id);
}

async function handlePaymentMethodDetached(pm: Stripe.PaymentMethod): Promise<void> {
  await pool.query(
    `DELETE FROM "PaymentMethodRecord" WHERE "stripePaymentMethodId" = $1`,
    [pm.id]
  );
  logger.info("Removed payment method %s", pm.id);
}

async function handleConnectAccountUpdated(account: Stripe.Account): Promise<void> {
  const fp = (await sqlOne(
    `SELECT * FROM "FreelancerProfile" WHERE "stripeConnectedAccountId" = $1`,
    [account.id]
  )) as DbRow | null;
  if (!fp) {
    logger.warn("account.updated for unknown connected account %s", account.id);
    return;
  }
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const onboardingComplete = Boolean(
    account.details_submitted && account.charges_enabled && account.payouts_enabled
  );
  await pool.query(
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
  logger.info(
    "Synced Connect account %s for freelancer %s (payouts=%s, complete=%s)",
    account.id,
    fp.id,
    payoutsEnabled,
    onboardingComplete
  );
}
