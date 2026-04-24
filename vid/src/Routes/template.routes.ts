import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/template.controller.js";

const createSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(5000).optional().allow(""),
  category: Joi.string().min(1).max(50).required(),
  software: Joi.string().min(1).max(50).required(),
  tags: Joi.array().items(Joi.string().max(30)).max(15).optional(),
  price: Joi.number().integer().min(0).required(),
  previewVideoUrl: Joi.string().uri().optional().allow(""),
  previewImageUrl: Joi.string().uri().optional().allow(""),
  fileUrl: Joi.string().uri().optional().allow(""),
  fileSize: Joi.string().max(20).optional(),
  version: Joi.string().max(20).optional(),
  compatibility: Joi.string().max(200).optional().allow(""),
});

const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(2000).optional().allow(""),
});

export default async function templateRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/", { preHandler: [authenticateToken, validateBody(createSchema)] }, ctrl.createTemplate as any);
  app.get("/browse", { preHandler: [authenticateToken] }, ctrl.browseTemplates as any);
  app.get("/my", { preHandler: [authenticateToken] }, ctrl.getMyTemplates as any);
  app.get("/purchases", { preHandler: [authenticateToken] }, ctrl.getMyPurchases as any);
  app.get("/:templateId", { preHandler: [authenticateToken] }, ctrl.getTemplate as any);
  app.post("/:templateId/purchase", { preHandler: [authenticateToken] }, ctrl.purchaseTemplate as any);
  app.post("/:templateId/review", { preHandler: [authenticateToken, validateBody(reviewSchema)] }, ctrl.reviewTemplate as any);
}
