import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  getUserAnalytics,
  getPlatformAnalytics,
  getDetailedUserAnalytics,
} from "../Controllers/analytics.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { restrictTo } from "../Middlewares/restrict.middleware.js";
import { validateQuery } from "../Middlewares/validate.middleware.js";
import Joi from "joi";

const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

const detailedAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  granularity: Joi.string().valid("day", "month", "year").default("month"),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.get("/user", {
    preHandler: [authenticateToken, validateQuery(analyticsQuerySchema)],
    handler: wrapHandler(getUserAnalytics),
  });
  fastify.get("/user/detailed", {
    preHandler: [authenticateToken, validateQuery(detailedAnalyticsQuerySchema)],
    handler: wrapHandler(getDetailedUserAnalytics),
  });
  fastify.get("/platform", {
    preHandler: [authenticateToken, restrictTo("ADMIN"), validateQuery(analyticsQuerySchema)],
    handler: wrapHandler(getPlatformAnalytics),
  });
}
