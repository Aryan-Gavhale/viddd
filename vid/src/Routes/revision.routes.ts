import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/revision.controller.js";

const submitSchema = Joi.object({
  videoUrl: Joi.string().required(),
  thumbnailUrl: Joi.string().uri().optional().allow(""),
  changeNotes: Joi.string().max(5000).optional().allow(""),
  duration: Joi.number().integer().min(0).optional(),
  fileSize: Joi.string().max(20).optional(),
});

const reviewSchema = Joi.object({
  status: Joi.string().valid("APPROVED", "CHANGES_REQUESTED").required(),
  reviewNote: Joi.string().max(2000).optional().allow(""),
});

export default async function revisionRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/order/:orderId", { preHandler: [authenticateToken, validateBody(submitSchema)] }, ctrl.submitRevision as any);
  app.get("/order/:orderId", { preHandler: [authenticateToken] }, ctrl.getRevisions as any);
  app.get("/order/:orderId/compare", { preHandler: [authenticateToken] }, ctrl.compareRevisions as any);
  app.post("/:revisionId/review", { preHandler: [authenticateToken, validateBody(reviewSchema)] }, ctrl.reviewRevision as any);
}
