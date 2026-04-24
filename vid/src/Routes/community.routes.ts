import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/community.controller.js";

const postSchema = Joi.object({
  type: Joi.string().valid("DISCUSSION", "SHOWCASE", "QUESTION", "COLLAB", "CHALLENGE").default("DISCUSSION"),
  title: Joi.string().min(3).max(300).required(),
  content: Joi.string().max(10000).optional().allow(""),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  mediaUrl: Joi.string().uri().optional().allow(""),
});

const commentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required(),
  parentId: Joi.number().integer().optional(),
});

export default async function communityRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/stats", ctrl.getCommunityStats as any);
  app.get("/posts", { preHandler: [authenticateToken] }, ctrl.getPosts as any);
  app.get("/posts/:postId", { preHandler: [authenticateToken] }, ctrl.getPost as any);
  app.post("/posts", { preHandler: [authenticateToken, validateBody(postSchema)] }, ctrl.createPost as any);
  app.post("/posts/:postId/comments", { preHandler: [authenticateToken, validateBody(commentSchema)] }, ctrl.addComment as any);
  app.post("/posts/:postId/like", { preHandler: [authenticateToken] }, ctrl.toggleLike as any);
}
