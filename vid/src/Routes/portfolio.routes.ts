import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { wrapHandler } from "../Utils/wrapHandler.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import {
  getPortfolioStats,
  getFeaturedPortfolios,
  getPortfolioByFreelancerId,
  getPortfolioVideoById,
  addPortfolioVideo,
  updatePortfolioVideo,
  deletePortfolioVideo,
} from "../Controllers/portfolio.controller.js";

const addPortfolioBodySchema = Joi.object({
  title: Joi.string().max(500).allow("", null).optional(),
  description: Joi.string().allow("", null).optional(),
  videoUrl: Joi.string().trim().min(1).required(),
  category: Joi.string().max(120).allow("", null).optional(),
});

const updatePortfolioBodySchema = Joi.object({
  title: Joi.string().max(500).optional(),
  description: Joi.string().allow(null, "").optional(),
  category: Joi.string().max(120).allow(null, "").optional(),
}).min(1);

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  const auth = [authenticateToken];

  fastify.get("/featured", { handler: wrapHandler(getFeaturedPortfolios) });
  fastify.get("/stats", { preHandler: auth, handler: wrapHandler(getPortfolioStats) });
  fastify.get("/video/:videoId", { handler: wrapHandler(getPortfolioVideoById) });
  fastify.get("/:freelancerId", { handler: wrapHandler(getPortfolioByFreelancerId) });

  fastify.post("/", {
    preHandler: [...auth, validateBody(addPortfolioBodySchema)],
    handler: wrapHandler(addPortfolioVideo),
  });
  fastify.put("/:videoId", {
    preHandler: [...auth, validateBody(updatePortfolioBodySchema)],
    handler: wrapHandler(updatePortfolioVideo),
  });
  fastify.delete("/:videoId", { preHandler: auth, handler: wrapHandler(deletePortfolioVideo) });
}
