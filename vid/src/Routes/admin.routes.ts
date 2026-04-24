import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  getPlatformStats,
  moderateContent,
  manageUsers,
  resolveDisputes,
} from "../Controllers/admin.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { restrictTo } from "../Middlewares/restrict.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";

const moderateContentSchema = Joi.object({
  entityType: Joi.string().valid("REVIEW", "MESSAGE").required(),
  entityId: Joi.number().integer().required(),
  action: Joi.string().valid("APPROVE", "REJECT", "DELETE").required(),
  reason: Joi.string().optional(),
});

const manageUsersSchema = Joi.object({
  userId: Joi.number().integer().required(),
  action: Joi.string().valid("BAN", "SUSPEND", "ACTIVATE", "UPDATE_ROLE").required(),
  reason: Joi.string().optional(),
  role: Joi.string().valid("FREELANCER", "CLIENT", "ADMIN").when("action", { is: "UPDATE_ROLE", then: Joi.required() }),
});

const resolveDisputesSchema = Joi.object({
  status: Joi.string().valid("OPEN", "IN_REVIEW", "RESOLVED", "CLOSED").required(),
  resolution: Joi.string().when("status", { is: Joi.string().valid("RESOLVED", "CLOSED"), then: Joi.required(), otherwise: Joi.optional() }),
});

const adminPre = [authenticateToken, restrictTo("ADMIN")];

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.get("/stats", {
    preHandler: adminPre,
    handler: wrapHandler(getPlatformStats),
  });
  fastify.post("/moderate", {
    preHandler: [...adminPre, validateBody(moderateContentSchema)],
    handler: wrapHandler(moderateContent),
  });
  fastify.post("/users", {
    preHandler: [...adminPre, validateBody(manageUsersSchema)],
    handler: wrapHandler(manageUsers),
  });
  fastify.put("/disputes/:disputeId", {
    preHandler: [...adminPre, validateBody(resolveDisputesSchema)],
    handler: wrapHandler(resolveDisputes),
  });
}
