import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  createReview,
  updateReview,
  deleteReview,
  getReview,
  getFreelancerReviews,
  respondToReview,
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
