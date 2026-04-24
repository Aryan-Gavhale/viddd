import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/demoReel.controller.js";

const generateSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(2000).optional().allow(""),
});

const updateSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(2000).optional().allow(""),
  clips: Joi.array().items(Joi.object({
    type: Joi.string().valid("portfolio", "project").required(),
    sourceId: Joi.number().integer().required(),
    videoUrl: Joi.string().required(),
    title: Joi.string().max(200).optional(),
    description: Joi.string().max(500).optional().allow(""),
    order: Joi.number().integer().min(0).required(),
    included: Joi.boolean().required(),
  })).optional(),
  isPublic: Joi.boolean().optional(),
  status: Joi.string().valid("DRAFT", "PUBLISHED").optional(),
  totalDuration: Joi.number().integer().min(0).optional(),
  thumbnailUrl: Joi.string().uri().optional().allow(""),
}).min(1);

export default async function demoReelRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/generate", { preHandler: [authenticateToken, validateBody(generateSchema)] }, ctrl.autoGenerateReel as any);
  app.get("/my", { preHandler: [authenticateToken] }, ctrl.getMyReels as any);
  app.put("/:reelId", { preHandler: [authenticateToken, validateBody(updateSchema)] }, ctrl.updateReel as any);
  app.delete("/:reelId", { preHandler: [authenticateToken] }, ctrl.deleteReel as any);
  app.get("/public/:reelId", ctrl.getPublicReel as any);
  app.get("/user/:userId", ctrl.getUserReels as any);
}
