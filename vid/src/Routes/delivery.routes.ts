import { FastifyInstance, FastifyPluginOptions } from "fastify";
import Joi from "joi";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import * as ctrl from "../Controllers/delivery.controller.js";

const submitFinalSchema = Joi.object({
  releaseNotes: Joi.string().trim().max(5000).allow("").optional(),
  reviewFileIds: Joi.array().items(Joi.number().integer().positive()).default([]),
  finalFileIds: Joi.array().items(Joi.number().integer().positive()).default([]),
  revisionIds: Joi.array().items(Joi.number().integer().positive()).default([]),
  sourceIncluded: Joi.boolean().default(false),
});

const deliverMasterSchema = Joi.object({
  releaseNotes: Joi.string().trim().max(5000).allow("").optional(),
  masterFileIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  finalFileIds: Joi.array().items(Joi.number().integer().positive()).optional(),
  sourceIncluded: Joi.boolean().default(false),
});

const reviewSchema = Joi.object({
  reviewNote: Joi.string().trim().max(3000).allow("").optional(),
});

const disputeSchema = Joi.object({
  reason: Joi.string().trim().max(3000).allow("").optional(),
});

export default async function deliveryRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/:scopeType/:scopeId", { preHandler: [authenticateToken], handler: wrapHandler(ctrl.getDelivery as any) });
  app.post("/:scopeType/:scopeId/submit-final", { preHandler: [authenticateToken, validateBody(submitFinalSchema)], handler: wrapHandler(ctrl.submitFinalDelivery as any) });
  app.post("/:deliveryId/request-changes", { preHandler: [authenticateToken, validateBody(reviewSchema)], handler: wrapHandler(ctrl.requestDeliveryChanges as any) });
  app.post("/:deliveryId/approve", { preHandler: [authenticateToken, validateBody(reviewSchema)], handler: wrapHandler(ctrl.approveDelivery as any) });
  app.post("/:deliveryId/deliver-master", { preHandler: [authenticateToken, validateBody(deliverMasterSchema)], handler: wrapHandler(ctrl.deliverFinalMaster as any) });
  app.post("/:deliveryId/dispute", { preHandler: [authenticateToken, validateBody(disputeSchema)], handler: wrapHandler(ctrl.disputeDelivery as any) });
}
