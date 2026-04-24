import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/skillTest.controller.js";

const submitSchema = Joi.object({
  submissionUrl: Joi.string().uri().required(),
});

const gradeSchema = Joi.object({
  score: Joi.number().integer().min(0).max(100).required(),
  feedback: Joi.string().max(2000).optional().allow(""),
});

export default async function skillTestRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/", { preHandler: [authenticateToken] }, ctrl.listTests as any);
  app.get("/:testId", { preHandler: [authenticateToken] }, ctrl.getTest as any);
  app.post("/:testId/start", { preHandler: [authenticateToken] }, ctrl.startAttempt as any);
  app.post("/attempts/:attemptId/submit", { preHandler: [authenticateToken, validateBody(submitSchema)] }, ctrl.submitAttempt as any);
  app.post("/attempts/:attemptId/grade", { preHandler: [authenticateToken, validateBody(gradeSchema)] }, ctrl.gradeAttempt as any);
  app.get("/badges/:userId", { preHandler: [authenticateToken] }, ctrl.getUserBadges as any);
}
