import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  createSetupIntent,
  listPaymentMethods,
  savePaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
} from "../Controllers/paymentMethod.controller.js";
import {
  getBillingProfile,
  updateBillingProfile,
  exportInvoices,
} from "../Controllers/billingProfile.controller.js";
import {
  startConnectOnboarding,
  getConnectStatus,
  getConnectDashboardLink,
} from "../Controllers/connect.controller.js";
import {
  savePaymentMethodSchema,
  billingProfileSchema,
} from "../Schemas/settings.schemas.js";

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // ── Payment methods ──────────────────────────────────────────────────
  fastify.post("/payment-methods/setup-intent", {
    preHandler: [authenticateToken],
    handler: wrapHandler(createSetupIntent),
  });
  fastify.get("/payment-methods", {
    preHandler: [authenticateToken],
    handler: wrapHandler(listPaymentMethods),
  });
  fastify.post("/payment-methods", {
    preHandler: [authenticateToken, validateBody(savePaymentMethodSchema)],
    handler: wrapHandler(savePaymentMethod),
  });
  fastify.post("/payment-methods/:id/default", {
    preHandler: [authenticateToken],
    handler: wrapHandler(setDefaultPaymentMethod),
  });
  fastify.delete("/payment-methods/:id", {
    preHandler: [authenticateToken],
    handler: wrapHandler(deletePaymentMethod),
  });

  // ── Billing profile (tax + address) ──────────────────────────────────
  fastify.get("/profile", {
    preHandler: [authenticateToken],
    handler: wrapHandler(getBillingProfile),
  });
  fastify.put("/profile", {
    preHandler: [authenticateToken, validateBody(billingProfileSchema)],
    handler: wrapHandler(updateBillingProfile),
  });
  fastify.get("/invoices/export", {
    preHandler: [authenticateToken],
    handler: wrapHandler(exportInvoices),
  });

  // ── Stripe Connect (freelancer payouts) ──────────────────────────────
  fastify.post("/connect/onboard", {
    preHandler: [authenticateToken],
    handler: wrapHandler(startConnectOnboarding),
  });
  fastify.get("/connect/status", {
    preHandler: [authenticateToken],
    handler: wrapHandler(getConnectStatus),
  });
  fastify.get("/connect/dashboard", {
    preHandler: [authenticateToken],
    handler: wrapHandler(getConnectDashboardLink),
  });
}
