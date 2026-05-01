import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  sendMessage,
  sendJobMessage,
  getMessages,
  getMessagesByJobId,
  markMessageAsRead,
  deleteMessage,
  flagMessage,
  addReaction,
} from "../Controllers/message.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { uploadMultiple } from "../Middlewares/upload.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import Joi from "joi";

const sendMessageSchema = Joi.object({
  receiverId: Joi.number().integer().required(),
  orderId: Joi.number().integer().optional(),
  jobId: Joi.number().integer().optional(),
  content: Joi.string().required(),
  subject: Joi.string().optional(),
  parentId: Joi.number().integer().optional(),
});

const flagMessageSchema = Joi.object({
  reason: Joi.string().optional(),
});

const reactionSchema = Joi.object({
  emoji: Joi.string().required(),
});

const getMessagesSchema = Joi.object({
  orderId: Joi.number().integer().optional(),
  receiverId: Joi.number().integer().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const sendJobMessageSchema = Joi.object({
  content: Joi.string().allow("").max(5000).optional(),
  attachments: Joi.array().items(Joi.object().unknown(true)).max(20).optional(),
  replyToId: Joi.string().max(120).optional().allow(null),
  clientId: Joi.string().max(120).optional().allow(null),
}).or("content", "attachments");

const auth = [authenticateToken];

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/", { preHandler: [...auth, uploadMultiple("attachments", 5), validateBody(sendMessageSchema)], handler: wrapHandler(sendMessage) });
  fastify.post("/job/:jobId", { preHandler: [...auth, validateBody(sendJobMessageSchema)], handler: wrapHandler(sendJobMessage) });
  fastify.get("/", { preHandler: [...auth, validateQuery(getMessagesSchema)], handler: wrapHandler(getMessages) });
  fastify.get("/job/:jobId", { preHandler: auth, handler: wrapHandler(getMessagesByJobId) });
  fastify.put("/:messageId/read", { preHandler: auth, handler: wrapHandler(markMessageAsRead) });
  fastify.delete("/:messageId", { preHandler: auth, handler: wrapHandler(deleteMessage) });
  fastify.post("/:messageId/flag", { preHandler: [...auth, validateBody(flagMessageSchema)], handler: wrapHandler(flagMessage) });
  fastify.post("/:messageId/reactions", { preHandler: [...auth, validateBody(reactionSchema)], handler: wrapHandler(addReaction) });
}
