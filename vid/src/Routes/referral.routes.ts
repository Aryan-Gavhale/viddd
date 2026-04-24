import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  createReferral,
  redeemReferral,
  getReferralStats,
} from "../Controllers/referral.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import Joi from "joi";

const createReferralSchema = Joi.object({
  rewardAmount: Joi.number().positive().optional(),
});

const redeemReferralSchema = Joi.object({
  referralCode: Joi.string().required(),
});

const getReferralStatsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/create", {
    preHandler: [authenticateToken, validateBody(createReferralSchema)],
    handler: wrapHandler(createReferral),
  });
  fastify.post("/redeem", {
    preHandler: [authenticateToken, validateBody(redeemReferralSchema)],
    handler: wrapHandler(redeemReferral),
  });
  fastify.get("/stats", {
    preHandler: [authenticateToken, validateQuery(getReferralStatsSchema)],
    handler: wrapHandler(getReferralStats),
  });
}
