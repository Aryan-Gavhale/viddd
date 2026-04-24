import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateWithDB } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/blog.controller.js";

const createSchema = Joi.object({
  title: Joi.string().min(5).max(300).required(),
  excerpt: Joi.string().max(500).optional().allow(""),
  content: Joi.string().min(10).required(),
  coverImageUrl: Joi.string().uri().optional().allow(""),
  category: Joi.string().min(1).max(50).required(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  status: Joi.string().valid("DRAFT", "PUBLISHED").default("DRAFT"),
  isFeatured: Joi.boolean().optional(),
});

const updateSchema = Joi.object({
  title: Joi.string().max(300).optional(),
  excerpt: Joi.string().max(500).optional().allow(""),
  content: Joi.string().min(10).optional(),
  coverImageUrl: Joi.string().uri().optional().allow(""),
  category: Joi.string().max(50).optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  status: Joi.string().valid("DRAFT", "PUBLISHED").optional(),
  isFeatured: Joi.boolean().optional(),
}).min(1);

export default async function blogRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/", ctrl.getPublishedPosts as any);
  app.get("/:slug", ctrl.getBlogPost as any);
  app.post("/", { preHandler: [authenticateWithDB, validateBody(createSchema)] }, ctrl.createBlogPost as any);
  app.put("/:postId", { preHandler: [authenticateWithDB, validateBody(updateSchema)] }, ctrl.updateBlogPost as any);
}
