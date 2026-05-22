/**
 * Saved payment methods + Stripe Customer + SetupIntent flow.
 *
 * Lifecycle:
 *   1. Frontend calls POST /billing/payment-methods/setup-intent → backend
 *      lazy-creates the Stripe Customer (persists `User.stripeCustomerId`)
 *      and returns a SetupIntent client_secret.
 *   2. Frontend confirms SetupIntent with Stripe.js Elements → Stripe
 *      attaches a PaymentMethod to the Customer and fires
 *      `payment_method.attached` to our webhook (see webhook.controller.ts)
 *      which materialises the row in `PaymentMethodRecord`.
 *   3. Frontend can also POST /billing/payment-methods to record the id
 *      synchronously (used when the webhook hasn't fired yet — eventual
 *      consistency).
 */
import Stripe from "stripe";
import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type {
  ExpressRequest,
  ExpressResponse,
  NextFunction,
  DbRow,
} from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" }) : null;

async function ensureStripeCustomer(userId: number): Promise<string> {
  if (!stripe) throw new ApiError(503, "Stripe is not configured");
  const user = (await sqlOne(
    `SELECT "id", "email", "firstname", "lastname", "stripeCustomerId" FROM "User" WHERE "id" = $1`,
    [userId]
  )) as DbRow | null;
  if (!user) throw new ApiError(404, "User not found");
  if (user.stripeCustomerId) return String(user.stripeCustomerId);

  const customer = await stripe.customers.create({
    email: typeof user.email === "string" ? user.email : undefined,
    name: [user.firstname, user.lastname].filter(Boolean).join(" "),
    metadata: { userId: String(userId) },
  });
  await sql(
    `UPDATE "User" SET "stripeCustomerId" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
    [customer.id, userId]
  );
  return customer.id;
}

export const createSetupIntent: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    if (!stripe) return next(new ApiError(503, "Stripe not configured"));
    const customerId = await ensureStripeCustomer(req.user.id);
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      payment_method_types: ["card"],
    });
    return res.status(200).json(
      new ApiResponse(
        200,
        { clientSecret: intent.client_secret, setupIntentId: intent.id, customerId },
        "SetupIntent created"
      )
    );
  } catch (err) {
    logger.error("createSetupIntent: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to create setup intent"));
  }
};

export const listPaymentMethods: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const rows = await sql(
      `SELECT "id", "stripePaymentMethodId", "brand", "last4", "expMonth", "expYear", "isDefault", "createdAt"
         FROM "PaymentMethodRecord"
        WHERE "userId" = $1
        ORDER BY "isDefault" DESC, "createdAt" DESC`,
      [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, { paymentMethods: rows }, "Payment methods fetched"));
  } catch (err) {
    logger.error("listPaymentMethods: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to fetch payment methods"));
  }
};

export const savePaymentMethod: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    if (!stripe) return next(new ApiError(503, "Stripe not configured"));
    const { paymentMethodId, setAsDefault } = req.body as {
      paymentMethodId?: string;
      setAsDefault?: boolean;
    };
    if (!paymentMethodId) return next(new ApiError(400, "paymentMethodId is required"));

    const customerId = await ensureStripeCustomer(req.user.id);

    let pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== customerId) {
      try {
        pm = await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      } catch (err) {
        logger.warn("attach payment method: %s", (err as Error).message);
        return next(new ApiError(400, "Failed to attach payment method"));
      }
    }

    const card = pm.card;
    const userId = req.user.id;

    if (setAsDefault) {
      await sql(
        `UPDATE "PaymentMethodRecord" SET "isDefault" = false WHERE "userId" = $1 AND "isDefault" = true`,
        [userId]
      );
      try {
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: pm.id },
        });
      } catch (err) {
        logger.warn("set default pm on customer: %s", (err as Error).message);
      }
    }

    const inserted = await sqlOne(
      `INSERT INTO "PaymentMethodRecord" ("userId", "stripePaymentMethodId", "brand", "last4", "expMonth", "expYear", "isDefault")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("stripePaymentMethodId")
       DO UPDATE SET "brand" = EXCLUDED."brand", "last4" = EXCLUDED."last4",
                     "expMonth" = EXCLUDED."expMonth", "expYear" = EXCLUDED."expYear",
                     "isDefault" = EXCLUDED."isDefault" OR "PaymentMethodRecord"."isDefault"
       RETURNING *`,
      [
        userId,
        pm.id,
        card?.brand || null,
        card?.last4 || null,
        card?.exp_month || null,
        card?.exp_year || null,
        Boolean(setAsDefault),
      ]
    );

    return res
      .status(201)
      .json(new ApiResponse(201, inserted, "Payment method saved"));
  } catch (err) {
    logger.error("savePaymentMethod: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to save payment method"));
  }
};

export const setDefaultPaymentMethod: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const id = parseInt(String(req.params.id || ""), 10);
    if (!id) return next(new ApiError(400, "Invalid payment method id"));

    const pm = (await sqlOne(
      `SELECT * FROM "PaymentMethodRecord" WHERE "id" = $1 AND "userId" = $2`,
      [id, userId]
    )) as DbRow | null;
    if (!pm) return next(new ApiError(404, "Payment method not found"));

    await sql(
      `UPDATE "PaymentMethodRecord" SET "isDefault" = false WHERE "userId" = $1`,
      [userId]
    );
    await sql(
      `UPDATE "PaymentMethodRecord" SET "isDefault" = true WHERE "id" = $1`,
      [id]
    );

    if (stripe) {
      const user = (await sqlOne(`SELECT "stripeCustomerId" FROM "User" WHERE "id" = $1`, [userId])) as DbRow | null;
      if (user?.stripeCustomerId) {
        try {
          await stripe.customers.update(String(user.stripeCustomerId), {
            invoice_settings: { default_payment_method: String(pm.stripePaymentMethodId) },
          });
        } catch (err) {
          logger.warn("set default pm on Stripe customer: %s", (err as Error).message);
        }
      }
    }

    return res.status(200).json(new ApiResponse(200, null, "Default payment method updated"));
  } catch (err) {
    logger.error("setDefaultPaymentMethod: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to set default"));
  }
};

export const deletePaymentMethod: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const id = parseInt(String(req.params.id || ""), 10);
    if (!id) return next(new ApiError(400, "Invalid payment method id"));

    const pm = (await sqlOne(
      `SELECT * FROM "PaymentMethodRecord" WHERE "id" = $1 AND "userId" = $2`,
      [id, userId]
    )) as DbRow | null;
    if (!pm) return next(new ApiError(404, "Payment method not found"));

    if (stripe && pm.stripePaymentMethodId) {
      try {
        await stripe.paymentMethods.detach(String(pm.stripePaymentMethodId));
      } catch (err) {
        logger.warn("detach pm: %s", (err as Error).message);
      }
    }
    await sql(`DELETE FROM "PaymentMethodRecord" WHERE "id" = $1`, [id]);
    return res.status(200).json(new ApiResponse(200, null, "Payment method removed"));
  } catch (err) {
    logger.error("deletePaymentMethod: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to delete payment method"));
  }
};

export { ensureStripeCustomer };
