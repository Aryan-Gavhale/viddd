import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
} from "../Controllers/notification.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import Joi from "joi";

const createNotificationSchema = Joi.object({
  userId: Joi.number().integer().required(),
  type: Joi.string().valid("ORDER_UPDATE", "MESSAGE", "PAYMENT", "REVIEW", "DISPUTE", "SYSTEM", "APPLICATION").required(),
  content: Joi.string().required(),
  entityType: Joi.string().valid("ORDER", "MESSAGE", "REVIEW", "TRANSACTION", "APPLICATION").optional(),
  entityId: Joi.number().integer().optional(),
  priority: Joi.string().valid("LOW", "NORMAL", "HIGH").optional(),
  expiresAt: Joi.date().optional(),
  metadata: Joi.object().optional(),
});

const getNotificationsSchema = Joi.object({
  type: Joi.string().valid("ORDER_UPDATE", "MESSAGE", "PAYMENT", "REVIEW", "DISPUTE", "SYSTEM", "APPLICATION").optional(),
  isRead: Joi.string().valid("true", "false").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/", {
    preHandler: [authenticateToken, validateBody(createNotificationSchema)],
    handler: wrapHandler(createNotification),
  });
  fastify.get("/", {
    preHandler: [authenticateToken, validateQuery(getNotificationsSchema)],
    handler: wrapHandler(getNotifications),
  });
  fastify.put("/:notificationId/read", {
    preHandler: [authenticateToken],
    handler: wrapHandler(markNotificationAsRead),
  });
  fastify.delete("/:notificationId", {
    preHandler: [authenticateToken],
    handler: wrapHandler(deleteNotification),
  });
  fastify.put("/read-all", {
    preHandler: [authenticateToken],
    handler: wrapHandler(markAllNotificationsAsRead),
  });
}
