import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticate } from "../Middlewares/auth.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import {
  createInvoice,
  getMyInvoices,
  getInvoice,
  generateInvoicePDF,
} from "../Controllers/invoice.controller.js";
import Joi from "joi";

const createInvoiceSchema = Joi.object({
  orderId: Joi.number().integer().required(),
  notes: Joi.string().max(10000).optional().allow(""),
  dueDate: Joi.date().iso().optional().allow(null),
  status: Joi.string().valid("DRAFT", "SENT", "PAID", "CANCELLED").optional(),
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export default async function invoiceRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/", { preHandler: [authenticate, validateBody(createInvoiceSchema)] }, createInvoice as any);
  fastify.get("/", { preHandler: [authenticate, validateQuery(listQuerySchema)] }, getMyInvoices as any);
  fastify.get("/:id/pdf-data", { preHandler: [authenticate] }, generateInvoicePDF as any);
  fastify.get("/:id", { preHandler: [authenticate] }, getInvoice as any);
}
