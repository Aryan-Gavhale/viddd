import Stripe from "stripe";
import { sqlOne, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import type { DbRow } from "../types/index.js";
import { calculateVerifiedPricingForOrder, type VerifiedPricing } from "./pricing.service.js";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" }) : null;

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isLocalFakeCheckoutAllowed(): boolean {
  return !isProduction() && process.env.ALLOW_LOCAL_FAKE_CHECKOUT === "true";
}

export function areDevPlaceholdersAllowed(): boolean {
  return !isProduction() && process.env.ALLOW_DEV_PLACEHOLDER_UPLOADS === "true";
}

function frontendUrl(): string {
  const firstCorsOrigin = (process.env.CORS_ORIGIN || "").split(",").map((item) => item.trim()).find(Boolean);
  return process.env.FRONTEND_URL || firstCorsOrigin || "http://localhost:5173";
}

export async function applyVerifiedOrderPricing(orderId: number, userId: number, promoCode?: string | null): Promise<{ order: DbRow; pricing: VerifiedPricing }> {
  return withTransaction(async (client) => {
    const order = (await client.query(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
         FROM "Order" o
        WHERE o."id" = $1 AND o."deletedAt" IS NULL
        FOR UPDATE`,
      [orderId]
    )).rows[0] as DbRow | undefined;
    if (!order) throw new ApiError(404, "Order not found");
    if (Number(order.clientId) !== Number(userId)) throw new ApiError(403, "Only the client can pay this order");
    if (String(order.status) !== "PENDING") throw new ApiError(400, "Only pending orders can be paid");

    const pricing = await calculateVerifiedPricingForOrder(order, promoCode);
    const metadata = {
      ...((order.metadata && typeof order.metadata === "object") ? order.metadata as Record<string, unknown> : {}),
      checkoutPricing: pricing,
      appliedPromoCode: pricing.discountCode,
      pricingVerifiedAt: new Date().toISOString(),
    };

    const updated = (await client.query(
      `UPDATE "Order"
          SET "totalPrice" = $2,
              "platformFeePercent" = $3,
              "platformFeeAmount" = $4,
              "clientFeePercent" = $5,
              "clientFeeAmount" = $6,
              "freelancerPayout" = $7,
              "metadata" = $8::jsonb,
              "updatedAt" = NOW()
        WHERE "id" = $1
        RETURNING *, "gig_id" AS "gigId", "client_id" AS "clientId", "freelancer_id" AS "freelancerId"`,
      [
        orderId,
        pricing.totalPrice,
        pricing.platformFeePercent,
        pricing.platformFeeAmount,
        pricing.clientFeePercent,
        pricing.clientFeeAmount,
        pricing.freelancerPayout,
        JSON.stringify(metadata),
      ]
    )).rows[0] as DbRow;

    if (pricing.discountCode) {
      await client.query(`UPDATE "Promotion" SET "uses" = "uses" + 1 WHERE UPPER("code") = $1`, [pricing.discountCode]);
    }

    return { order: updated, pricing };
  });
}

export async function createHostedCheckoutSession(orderId: number, userId: number, promoCode?: string | null): Promise<{
  mode: "stripe_checkout" | "local_dev";
  sessionId?: string;
  url?: string | null;
  order: DbRow;
  pricing: VerifiedPricing;
}> {
  const { order, pricing } = await applyVerifiedOrderPricing(orderId, userId, promoCode);

  if (!stripe) {
    if (isLocalFakeCheckoutAllowed()) return { mode: "local_dev", order, pricing };
    throw new ApiError(503, "Hosted checkout is not configured");
  }

  const successUrl = `${frontendUrl()}/checkout/${String(order.gigId)}/${encodeURIComponent(String(order.package || "package"))}/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${frontendUrl()}/checkout/${String(order.gigId)}/${encodeURIComponent(String(order.package || "package"))}/payment?orderId=${orderId}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: String(orderId),
    customer_email: typeof order.clientEmail === "string" ? order.clientEmail : undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: String(process.env.CHECKOUT_CURRENCY || "usd").toLowerCase(),
          unit_amount: Math.round(pricing.totalPrice * 100),
          product_data: {
            name: `Vidlancing order #${String(order.orderNumber || orderId)}`,
            description: `${String(order.package || "Gig package")} video editing order`,
          },
        },
      },
    ],
    metadata: {
      orderId: String(orderId),
      userId: String(userId),
      pricing: JSON.stringify(pricing).slice(0, 500),
    },
    payment_intent_data: {
      metadata: {
        orderId: String(orderId),
        userId: String(userId),
      },
      transfer_group: `order_${orderId}`,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO "Transaction" (
        "order_id", "user_id", "amount", "type", "paymentMethod", "status", "paymentGatewayId", "metadata"
      ) VALUES (
        $1, $2, $3, 'PAYMENT'::"TransactionType", 'stripe_checkout', 'PENDING'::"TransactionStatus", $4, $5::jsonb
      )
      ON CONFLICT DO NOTHING`,
      [
        orderId,
        userId,
        pricing.totalPrice,
        session.id,
        JSON.stringify({ provider: "stripe_checkout", checkoutSessionId: session.id, pricing }),
      ]
    );
  });

  return { mode: "stripe_checkout", sessionId: session.id, url: session.url, order, pricing };
}

export async function createEscrowReleaseTransfer(order: DbRow): Promise<{ transferId: string | null; mode: "stripe_connect" | "local_dev" }> {
  const payoutAmount = Number(order.freelancerPayout ?? order.totalPrice ?? 0);
  if (payoutAmount <= 0) throw new ApiError(400, "Order payout amount is invalid");

  const freelancer = await sqlOne(
    `SELECT "stripeConnectedAccountId", "stripePayoutsEnabled", "stripeOnboardingComplete"
       FROM "FreelancerProfile"
      WHERE "id" = $1`,
    [Number(order.freelancerProfileId ?? order.freelancerId ?? order.freelancer_id)]
  ) as DbRow | null;

  if (!stripe) {
    if (!isProduction()) return { transferId: null, mode: "local_dev" };
    throw new ApiError(503, "Stripe Connect is not configured");
  }

  const destination = String(freelancer?.stripeConnectedAccountId || process.env.STRIPE_DEV_CONNECTED_ACCOUNT_ID || "");
  const payoutsEnabled = Boolean(freelancer?.stripePayoutsEnabled || process.env.STRIPE_DEV_CONNECTED_ACCOUNT_ID);
  if (!destination || !payoutsEnabled) {
    throw new ApiError(409, "Editor payout account is not connected. Complete Stripe Connect onboarding before escrow release.");
  }

  const transfer = await stripe.transfers.create(
    {
      amount: Math.round(payoutAmount * 100),
      currency: String(process.env.CHECKOUT_CURRENCY || "usd").toLowerCase(),
      destination,
      transfer_group: `order_${String(order.id)}`,
      metadata: {
        orderId: String(order.id),
        freelancerProfileId: String(order.freelancerProfileId ?? order.freelancerId ?? ""),
      },
    },
    { idempotencyKey: `order_${String(order.id)}_escrow_release_v1` }
  );

  return { transferId: transfer.id, mode: "stripe_connect" };
}

export async function refundEscrowPayment(orderId: number, reason = "requested_by_customer"): Promise<{ refundId: string | null; mode: "stripe_refund" | "local_dev" }> {
  const transaction = await sqlOne(
    `SELECT * FROM "Transaction"
      WHERE "order_id" = $1 AND "type" = 'PAYMENT'::"TransactionType" AND "status" = 'COMPLETED'::"TransactionStatus"
      ORDER BY "createdAt" DESC
      LIMIT 1`,
    [orderId]
  ) as DbRow | null;
  if (!transaction) throw new ApiError(404, "Completed payment transaction not found for refund");

  if (!stripe) {
    if (!isProduction()) return { refundId: null, mode: "local_dev" };
    throw new ApiError(503, "Stripe refunds are not configured");
  }
  const paymentIntentId = String(transaction.paymentIntentId || "");
  if (!paymentIntentId) throw new ApiError(409, "Payment intent is missing; cannot issue provider refund");

  const refund = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      reason: reason as Stripe.RefundCreateParams.Reason,
      metadata: { orderId: String(orderId), transactionId: String(transaction.id) },
    },
    { idempotencyKey: `order_${orderId}_escrow_refund_v1` }
  );
  return { refundId: refund.id, mode: "stripe_refund" };
}
