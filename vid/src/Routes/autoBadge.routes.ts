import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import * as ctrl from "../Controllers/autoBadge.controller.js";

export default async function autoBadgeRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/check", { preHandler: [authenticateToken] }, ctrl.checkAndAwardBadges as any);
  app.get("/rules", { preHandler: [authenticateToken] }, ctrl.getAutoRules as any);
  app.get("/my", { preHandler: [authenticateToken] }, ctrl.getMyBadges as any);
}
