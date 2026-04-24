import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  createGig,
  createGigDraft,
  updateGig,
  updateGigDraft,
  deleteGig,
  deleteGigDraft,
  getGig,
  getGigAnalytics,
  getFreelancerGigs,
  getAllGigs,
  pauseGig,
} from "../Controllers/gig.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { checkOwnership } from "../Middlewares/ownership.middleware.js";
import { uploadFields } from "../Middlewares/upload.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import Joi from "joi";

// FIX M10: gigs now upload directly to S3 via the shared multer middleware.
const gigUploadFields = () =>
  uploadFields([
    { name: "thumbnail", maxCount: 1 },
    { name: "sampleMedia", maxCount: 3 },
  ]);

// Shared field shapes (multiparty JSON fields may arrive as strings; validate.middleware parses JSON strings to objects/arrays)
const pricingValueSchema = Joi.alternatives()
  .try(
    Joi.array().min(1).items(Joi.alternatives().try(Joi.object(), Joi.string())),
    Joi.object(),
    Joi.string()
  );

const tagsValueSchema = Joi.alternatives().try(
  Joi.array().items(Joi.string()),
  Joi.string()
);

const faqsOrPackageDetailsSchema = Joi.alternatives().try(
  Joi.array().items(Joi.alternatives().try(Joi.object(), Joi.string())),
  Joi.object(),
  Joi.string()
);

const createGigBodySchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  description: Joi.string().allow("", null).optional(),
  category: Joi.string().allow("", null).optional(),
  pricing: pricingValueSchema.required(),
  deliveryTime: Joi.number().integer().positive().optional().allow(null),
  revisionCount: Joi.number().integer().min(0).optional().allow(null),
  requirements: Joi.string().allow("", null).optional(),
  tags: tagsValueSchema.optional(),
  faqs: faqsOrPackageDetailsSchema.optional(),
  packageDetails: faqsOrPackageDetailsSchema.optional(),
});

const createGigDraftBodySchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  description: Joi.string().allow("", null).optional(),
  category: Joi.string().allow("", null).optional(),
  pricing: pricingValueSchema.optional(),
  deliveryTime: Joi.number().integer().positive().optional().allow(null),
  revisionCount: Joi.number().integer().min(0).optional().allow(null),
  requirements: Joi.string().allow("", null).optional(),
  tags: tagsValueSchema.optional(),
  faqs: faqsOrPackageDetailsSchema.optional(),
  packageDetails: faqsOrPackageDetailsSchema.optional(),
});

const updateGigBodySchema = Joi.object({
  title: Joi.string().trim().min(1).optional(),
  description: Joi.string().allow("", null).optional(),
  category: Joi.string().allow("", null).optional(),
  pricing: pricingValueSchema.optional(),
  deliveryTime: Joi.number().integer().positive().optional().allow(null),
  revisionCount: Joi.number().integer().min(0).optional().allow(null),
  requirements: Joi.string().allow("", null).optional(),
  tags: tagsValueSchema.optional(),
  faqs: faqsOrPackageDetailsSchema.optional(),
  packageDetails: faqsOrPackageDetailsSchema.optional(),
}).min(1);

const updateGigDraftBodySchema = updateGigBodySchema;

const getAllGigsQuerySchema = Joi.object({
  category: Joi.string().optional().allow(""),
  search: Joi.string().max(200).optional().allow(""),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // Public routes
  fastify.get("/all", { preHandler: [validateQuery(getAllGigsQuerySchema)], handler: wrapHandler(getAllGigs) });

  // Protected routes
  const withAuth = [authenticateToken];
  fastify.get("/freelancer", { preHandler: withAuth, handler: wrapHandler(getFreelancerGigs) });
  fastify.get("/:gigId/analytics", {
    preHandler: [...withAuth, checkOwnership("Gig", "gigId", "freelancerId")],
    handler: wrapHandler(getGigAnalytics),
  });
  fastify.get("/:gigId", { preHandler: withAuth, handler: wrapHandler(getGig) });
  fastify.post("/", {
    preHandler: [...withAuth, gigUploadFields(), validateBody(createGigBodySchema)],
    handler: wrapHandler(createGig),
  });
  fastify.post("/draft", {
    preHandler: [...withAuth, gigUploadFields(), validateBody(createGigDraftBodySchema)],
    handler: wrapHandler(createGigDraft),
  });
  fastify.put("/:gigId", {
    preHandler: [
      ...withAuth,
      checkOwnership("Gig", "gigId", "freelancerId"),
      gigUploadFields(),
      validateBody(updateGigBodySchema),
    ],
    handler: wrapHandler(updateGig),
  });
  fastify.put("/draft/:gigId", {
    preHandler: [
      ...withAuth,
      checkOwnership("Gig", "gigId", "freelancerId"),
      gigUploadFields(),
      validateBody(updateGigDraftBodySchema),
    ],
    handler: wrapHandler(updateGigDraft),
  });
  fastify.delete("/:gigId", {
    preHandler: [...withAuth, checkOwnership("Gig", "gigId", "freelancerId")],
    handler: wrapHandler(deleteGig),
  });
  fastify.delete("/draft/:gigId", {
    preHandler: [...withAuth, checkOwnership("Gig", "gigId", "freelancerId")],
    handler: wrapHandler(deleteGigDraft),
  });
  fastify.patch("/:gigId/pause", {
    preHandler: [...withAuth, checkOwnership("Gig", "gigId", "freelancerId")],
    handler: wrapHandler(pauseGig),
  });
}
