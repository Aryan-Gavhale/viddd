import type { FastifyInstance } from "fastify";
import { authenticate, authenticateWithDB } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import {
  getServiceFeeBreakdown,
  payForFeature,
  getSubscriptionPlans,
  getMySubscription,
  subscribeToPlan,
  cancelSubscription,
  createEnterpriseAccount,
  getMyEnterprise,
  inviteEnterpriseMember,
  getRevenueDashboard,
} from "../Controllers/revenue.controller.js";

const featuredPaySchema = Joi.object({
  promotionId: Joi.number().integer().required(),
});

const subscribeSchema = Joi.object({
  planId: Joi.number().integer().required(),
  billingCycle: Joi.string().valid("MONTHLY", "YEARLY").default("MONTHLY"),
});

const enterpriseCreateSchema = Joi.object({
  companyName: Joi.string().min(2).max(200).required(),
  plan: Joi.string().valid("STANDARD", "PREMIUM", "SCALE").default("STANDARD"),
});

const enterpriseInviteSchema = Joi.object({
  userId: Joi.number().integer().required(),
  role: Joi.string().valid("MEMBER", "MANAGER", "ADMIN").default("MEMBER"),
});

async function revenueRoutes(app: FastifyInstance) {
  app.get("/fees", { preHandler: [authenticate] }, getServiceFeeBreakdown as never);

  app.post("/featured/pay", {
    preHandler: [authenticateWithDB, validateBody(featuredPaySchema)],
  }, payForFeature as never);

  /* ---- Subscriptions ---- */
  app.get("/subscriptions/plans", getSubscriptionPlans as never);

  app.get("/subscriptions/me", { preHandler: [authenticate] }, getMySubscription as never);

  app.post("/subscriptions", {
    preHandler: [authenticateWithDB, validateBody(subscribeSchema)],
  }, subscribeToPlan as never);

  app.delete("/subscriptions", { preHandler: [authenticate] }, cancelSubscription as never);

  /* ---- Enterprise ---- */
  app.post("/enterprise", {
    preHandler: [authenticateWithDB, validateBody(enterpriseCreateSchema)],
  }, createEnterpriseAccount as never);

  app.get("/enterprise/me", { preHandler: [authenticate] }, getMyEnterprise as never);

  app.post("/enterprise/invite", {
    preHandler: [authenticate, validateBody(enterpriseInviteSchema)],
  }, inviteEnterpriseMember as never);

  /* ---- Admin ---- */
  app.get("/dashboard", { preHandler: [authenticate] }, getRevenueDashboard as never);
}

export default revenueRoutes;
