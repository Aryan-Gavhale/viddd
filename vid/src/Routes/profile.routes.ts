import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { wrapHandler } from "../Utils/wrapHandler.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { uploadSingle } from "../Middlewares/upload.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import {
  createFreelancerProfile,
  updateFreelancerProfile,
  getFreelancerProfile,
  deleteFreelancerProfile,
  addPortfolioVideo,
  updatePortfolioVideo,
  deletePortfolioVideo,
  getPublicFreelancerProfile,
} from "../Controllers/profile.controller.js";
import Joi from "joi";

const profileSchema = Joi.object({
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  pinCode: Joi.string().optional(),
  jobTitle: Joi.string().required(),
  overview: Joi.string().required(),
  skills: Joi.array().items(Joi.string()).min(1).required(),
  tools: Joi.array().items(Joi.string()).optional(),
  equipmentCameras: Joi.string().optional(),
  equipmentLenses: Joi.string().optional(),
  equipmentLighting: Joi.string().optional(),
  equipmentOther: Joi.string().optional(),
  certifications: Joi.string().optional(),
  minimumRate: Joi.number().positive().optional(),
  maximumRate: Joi.number().positive().greater(Joi.ref("minimumRate")).optional(),
  availabilityStatus: Joi.string().valid("FULL_TIME", "PART_TIME", "UNAVAILABLE").optional(),
  weeklyHours: Joi.number().integer().min(0).optional(),
});

const updateProfileSchema = profileSchema
  .fork(Object.keys(profileSchema.describe().keys), (field) => field.optional())
  .min(1);

const portfolioVideoSchema = Joi.object({
  videoUrl: Joi.string().uri().optional(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
}).or("videoUrl");

const updatePortfolioVideoBodySchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  category: Joi.string().optional(),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.get("/public/:userId", { handler: wrapHandler(getPublicFreelancerProfile) });

  const auth = [authenticateToken];

  fastify.post("/freelancer", {
    preHandler: [...auth, validateBody(profileSchema)],
    handler: wrapHandler(createFreelancerProfile),
  });
  fastify.put("/freelancer", {
    preHandler: [...auth, validateBody(updateProfileSchema)],
    handler: wrapHandler(updateFreelancerProfile),
  });
  fastify.get("/freelancer", { preHandler: auth, handler: wrapHandler(getFreelancerProfile) });
  fastify.delete("/freelancer", { preHandler: auth, handler: wrapHandler(deleteFreelancerProfile) });
  fastify.post("/freelancer/portfolio-video", {
    preHandler: [...auth, uploadSingle("video"), validateBody(portfolioVideoSchema)],
    handler: wrapHandler(addPortfolioVideo),
  });
  fastify.put("/freelancer/portfolio-video/:videoId", {
    preHandler: [...auth, uploadSingle("video"), validateBody(updatePortfolioVideoBodySchema)],
    handler: wrapHandler(updatePortfolioVideo),
  });
  fastify.delete("/freelancer/portfolio-video/:videoId", {
    preHandler: auth,
    handler: wrapHandler(deletePortfolioVideo),
  });
}
