import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  createReview,
  updateReview,
  deleteReview,
  getReview,
  getFreelancerReviews,
  respondToReview,
  getCloseoutReviewState,
  submitCloseoutReview,
} from "../Controllers/review.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { restrictTo } from "../Middlewares/restrict.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import Joi from "joi";

const createReviewSchema = Joi.object({
  orderId: Joi.number().integer().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().optional(),
  title: Joi.string().optional(),
  isAnonymous: Joi.boolean().optional(),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().optional(),
  title: Joi.string().optional(),
  isAnonymous: Joi.boolean().optional(),
}).min(1);

const respondReviewSchema = Joi.object({
  response: Joi.string().required(),
});

const closeoutReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  criteriaRatings: Joi.object().pattern(Joi.string().max(80), Joi.number().integer().min(1).max(5)).default({}),
  tags: Joi.array().items(Joi.string().trim().max(80)).max(12).default([]),
  publicComment: Joi.string().trim().max(3000).allow("").optional(),
  comment: Joi.string().trim().max(3000).allow("").optional(),
  privateNote: Joi.string().trim().max(3000).allow("").optional(),
  wouldWorkAgain: Joi.boolean().default(true),
});

const getReviewsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const auth = [authenticateToken];

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // Public routes
  fastify.get("/freelancer/:freelancerId", {
    preHandler: [validateQuery(getReviewsSchema)],
    handler: wrapHandler(getFreelancerReviews),
  });
  fastify.get("/closeout/:scopeType/:scopeId", {
    preHandler: auth,
    handler: wrapHandler(getCloseoutReviewState),
  });
  fastify.post("/closeout/:scopeType/:scopeId", {
    preHandler: [...auth, validateBody(closeoutReviewSchema)],
    handler: wrapHandler(submitCloseoutReview),
  });
  fastify.get("/:reviewId", { handler: wrapHandler(getReview) });

  // Protected routes
  fastify.post("/", { preHandler: [...auth, validateBody(createReviewSchema)], handler: wrapHandler(createReview) });
  fastify.put("/:reviewId", { preHandler: [...auth, validateBody(updateReviewSchema)], handler: wrapHandler(updateReview) });
  fastify.delete("/:reviewId", { preHandler: auth, handler: wrapHandler(deleteReview) });
  fastify.post("/:reviewId/respond", {
    preHandler: [...auth, restrictTo("FREELANCER"), validateBody(respondReviewSchema)],
    handler: wrapHandler(respondToReview),
  });
}
