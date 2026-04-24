import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  createTransaction,
  processPayment,
  refundTransaction,
  getTransaction,
  getUserTransactions,
  getEarnings,
} from "../Controllers/transaction.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import Joi from "joi";

const createTransactionSchema = Joi.object({
  orderId: Joi.number().integer().required(),
  amount: Joi.number().positive().required(),
  paymentMethodId: Joi.string().required(),
});

const refundTransactionSchema = Joi.object({
  reason: Joi.string().optional(),
});

const getTransactionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  type: Joi.string().valid("PAYMENT", "REFUND", "PAYOUT").optional(),
});

const getEarningsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const auth = [authenticateToken];

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // Static routes first
  fastify.post("/", { preHandler: [...auth, validateBody(createTransactionSchema)], handler: wrapHandler(createTransaction) });
  fastify.get("/", { preHandler: [...auth, validateQuery(getTransactionsSchema)], handler: wrapHandler(getUserTransactions) });
  fastify.get("/earnings", { preHandler: [...auth, validateQuery(getEarningsSchema)], handler: wrapHandler(getEarnings) });

  // Dynamic routes last
  fastify.post("/:transactionId/process", { preHandler: auth, handler: wrapHandler(processPayment) });
  fastify.post("/:transactionId/refund", { preHandler: [...auth, validateBody(refundTransactionSchema)], handler: wrapHandler(refundTransaction) });
  fastify.get("/:transactionId", { preHandler: auth, handler: wrapHandler(getTransaction) });
}
