import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import {
  createMilestones,
  getMilestonesByOrder,
  updateMilestoneProgress,
  approveMilestone,
  requestRevision,
} from "../Controllers/milestone.controller.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";

const createMilestonesSchema = Joi.object({
  milestones: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().min(1).max(200).required(),
        description: Joi.string().allow("").max(5000).optional(),
        dueDate: Joi.alternatives().try(Joi.date().iso(), Joi.date()).required(),
        amount: Joi.number().positive().max(1e12).required(),
      })
    )
    .min(1)
    .max(50)
    .required(),
});

const progressBodySchema = Joi.object({
  progress: Joi.number().integer().min(0).max(100).required(),
  deliverables: Joi.object().optional(),
});

const revisionBodySchema = Joi.object({
  feedback: Joi.string().min(1).max(2000).required(),
});

const auth = [authenticateToken];

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.get("/order/:orderId", { preHandler: auth, handler: wrapHandler(getMilestonesByOrder) });
  fastify.post("/order/:orderId", { preHandler: [...auth, validateBody(createMilestonesSchema)], handler: wrapHandler(createMilestones) });
  fastify.put("/:milestoneId/progress", { preHandler: [...auth, validateBody(progressBodySchema)], handler: wrapHandler(updateMilestoneProgress) });
  fastify.post("/:milestoneId/approve", { preHandler: auth, handler: wrapHandler(approveMilestone) });
  fastify.post("/:milestoneId/revision", { preHandler: [...auth, validateBody(revisionBodySchema)], handler: wrapHandler(requestRevision) });
}
