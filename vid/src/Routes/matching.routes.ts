import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/matching.controller.js";

const matchSchema = Joi.object({
  jobId: Joi.number().integer().optional().allow(null),
  requiredSkills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
  requiredSoftware: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  requiredStyle: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  budgetMin: Joi.number().integer().min(0).optional(),
  budgetMax: Joi.number().integer().min(0).optional(),
  experienceLevel: Joi.string().valid("ENTRY", "INTERMEDIATE", "EXPERT").optional(),
});

export default async function matchingRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/find", { preHandler: [authenticateToken, validateBody(matchSchema)] }, ctrl.findMatches as any);
  app.get("/history", { preHandler: [authenticateToken] }, ctrl.getMatchHistory as any);
  app.get("/:requestId", { preHandler: [authenticateToken] }, ctrl.getMatchResults as any);
}
