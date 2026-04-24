import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  createDispute,
  updateDisputeStatus,
  getDispute,
  getUserDisputes,
  addDisputeEvidence,
  addDisputeComment,
} from "../Controllers/dispute.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { restrictTo } from "../Middlewares/restrict.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { uploadMultiple } from "../Middlewares/upload.middleware.js";
import Joi from "joi";

const createDisputeSchema = Joi.object({
  orderId: Joi.number().integer().required(),
  reason: Joi.string().required(),
  description: Joi.string().optional(),
});

const updateDisputeStatusSchema = Joi.object({
  status: Joi.string().valid("OPEN", "IN_REVIEW", "RESOLVED", "CLOSED").required(),
  resolution: Joi.string().when("status", { is: Joi.string().valid("RESOLVED", "CLOSED"), then: Joi.required(), otherwise: Joi.optional() }),
});

const addDisputeCommentSchema = Joi.object({
  content: Joi.string().required(),
});

const getDisputesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid("OPEN", "IN_REVIEW", "RESOLVED", "CLOSED").optional(),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/", {
    preHandler: [authenticateToken, validateBody(createDisputeSchema)],
    handler: wrapHandler(createDispute),
  });
  fastify.put("/:disputeId/status", {
    preHandler: [authenticateToken, restrictTo("ADMIN"), validateBody(updateDisputeStatusSchema)],
    handler: wrapHandler(updateDisputeStatus),
  });
  fastify.get("/:disputeId", {
    preHandler: [authenticateToken],
    handler: wrapHandler(getDispute),
  });
  fastify.get("/", {
    preHandler: [authenticateToken, validateQuery(getDisputesSchema)],
    handler: wrapHandler(getUserDisputes),
  });
  fastify.post("/:disputeId/evidence", {
    preHandler: [authenticateToken, uploadMultiple("evidence", 5)],
    handler: wrapHandler(addDisputeEvidence),
  });
  fastify.post("/:disputeId/comment", {
    preHandler: [authenticateToken, validateBody(addDisputeCommentSchema)],
    handler: wrapHandler(addDisputeComment),
  });
}
