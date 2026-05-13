import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  createOrder,
  createOrderCheckoutSession,
  completeOrderPayment,
  updateOrderStatus,
  getOrder,
  getClientOrders,
  getFreelancerOrders,
  cancelOrder,
  getCurrentOrders,
  getPendingOrders,
  getCompletedOrders,
  getRejectedOrders,
  getFreelancerActiveOrders,
} from "../Controllers/order.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import Joi from "joi";

const createOrderSchema = Joi.object({
  gigId: Joi.number().integer().required(),
  selectedPackage: Joi.string().required(),
  title: Joi.string().trim().min(1).max(160).required(),
  description: Joi.string().trim().min(1).max(5000).required(),
  videoType: Joi.string().trim().min(1).max(120).required(),
  numberOfVideos: Joi.number().integer().min(1).required(),
  totalDuration: Joi.number().min(0).required(),
  referenceUrl: Joi.string().trim().uri().allow("").optional(),
  aspectRatio: Joi.string().required(),
  addSubtitles: Joi.boolean().optional(),
  expressDelivery: Joi.boolean().optional(),
  uploadedFiles: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    size: Joi.number().required(),
    type: Joi.string().required()
  })).optional(),
  requirements: Joi.string().optional(),
  customDetails: Joi.object().optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid("PENDING", "CURRENT", "COMPLETED", "REJECTED").required(),
  extensionReason: Joi.string().optional(),
  cancellationReason: Joi.string().optional(),
});

const cancelOrderSchema = Joi.object({
  cancellationReason: Joi.string().optional(),
});

const completePaymentSchema = Joi.object({
  paymentMethod: Joi.string().trim().min(2).max(80).required(),
  providerReference: Joi.string().trim().max(200).optional(),
  metadata: Joi.object().optional(),
});

const checkoutSessionSchema = Joi.object({
  promoCode: Joi.string().trim().max(80).allow("", null).optional(),
});

const getOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid("PENDING", "CURRENT", "COMPLETED", "REJECTED").optional(),
});

const auth = [authenticateToken];

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // Static routes first
  fastify.post("/", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: [...auth, validateBody(createOrderSchema)],
    handler: wrapHandler(createOrder),
  });
  fastify.get("/client", { preHandler: [...auth, validateQuery(getOrdersSchema)], handler: wrapHandler(getClientOrders) });
  fastify.get("/freelancer", { preHandler: [...auth, validateQuery(getOrdersSchema)], handler: wrapHandler(getFreelancerOrders) });
  fastify.get("/freelancer/active", { preHandler: auth, handler: wrapHandler(getFreelancerActiveOrders) });
  fastify.get("/current", { preHandler: auth, handler: wrapHandler(getCurrentOrders) });
  fastify.get("/pending", { preHandler: auth, handler: wrapHandler(getPendingOrders) });
  fastify.get("/completed", { preHandler: auth, handler: wrapHandler(getCompletedOrders) });
  fastify.get("/rejected", { preHandler: auth, handler: wrapHandler(getRejectedOrders) });

  // Dynamic routes last
  fastify.post("/:orderId/checkout/session", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    preHandler: [...auth, validateBody(checkoutSessionSchema)],
    handler: wrapHandler(createOrderCheckoutSession),
  });
  fastify.post("/:orderId/checkout/complete", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    preHandler: [...auth, validateBody(completePaymentSchema)],
    handler: wrapHandler(completeOrderPayment),
  });
  fastify.patch("/:orderId/status", { preHandler: [...auth, validateBody(updateStatusSchema)], handler: wrapHandler(updateOrderStatus) });
  fastify.patch("/:orderId/cancel", { preHandler: [...auth, validateBody(cancelOrderSchema)], handler: wrapHandler(cancelOrder) });
  fastify.get("/:orderId", { preHandler: auth, handler: wrapHandler(getOrder) });
}
