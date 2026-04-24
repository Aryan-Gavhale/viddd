import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/renderFarm.controller.js";

const submitSchema = Joi.object({
  projectName: Joi.string().min(1).max(200).required(),
  orderId: Joi.number().integer().optional().allow(null),
  priority: Joi.string().valid("LOW", "NORMAL", "HIGH").default("NORMAL"),
  software: Joi.string().max(50).optional(),
  resolution: Joi.string().valid("1080p", "1440p", "4K", "8K").default("1080p"),
  frameRange: Joi.string().max(50).optional(),
  outputFormat: Joi.string().valid("MP4", "MOV", "AVI", "ProRes").default("MP4"),
  estimatedMinutes: Joi.number().integer().min(1).max(600).default(30),
  inputFileUrl: Joi.string().uri().optional(),
});

const estimateSchema = Joi.object({
  priority: Joi.string().valid("LOW", "NORMAL", "HIGH").default("NORMAL"),
  resolution: Joi.string().valid("1080p", "1440p", "4K", "8K").default("1080p"),
  estimatedMinutes: Joi.number().integer().min(1).max(600).default(30),
});

export default async function renderFarmRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/submit", { preHandler: [authenticateToken, validateBody(submitSchema)] }, ctrl.submitRenderJob as any);
  app.get("/my", { preHandler: [authenticateToken] }, ctrl.getMyRenderJobs as any);
  app.get("/:jobId", { preHandler: [authenticateToken] }, ctrl.getRenderJob as any);
  app.post("/:jobId/cancel", { preHandler: [authenticateToken] }, ctrl.cancelRenderJob as any);
  app.post("/estimate", { preHandler: [authenticateToken, validateBody(estimateSchema)] }, ctrl.getEstimate as any);
}
