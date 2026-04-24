import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import {
  createVideoComment,
  getVideoComments,
  updateVideoComment,
  deleteVideoComment,
  resolveVideoComment,
} from "../Controllers/videoReview.controller.js";

const createCommentSchema = Joi.object({
  videoUrl: Joi.string().required(),
  timecode: Joi.number().min(0).required(),
  content: Joi.string().min(1).max(2000).required(),
  parentId: Joi.number().integer().optional(),
  annotationData: Joi.string().max(500000).optional().allow(null, ""),
  frameSnapshot: Joi.string().max(2000000).optional().allow(null, ""),
});

const updateCommentSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
});

function adapt(handler: Function) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const res = {
      status: (code: number) => ({
        json: (data: any) => reply.code(code).send(data),
      }),
    };
    const next = (err: any) => {
      if (err) throw err;
    };
    return handler(req, res, next);
  };
}

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/:orderId/comments", {
    preHandler: [authenticateToken, validateBody(createCommentSchema)],
    handler: adapt(createVideoComment),
  });

  fastify.get("/:orderId/comments", {
    preHandler: [authenticateToken],
    handler: adapt(getVideoComments),
  });

  fastify.put("/comments/:commentId", {
    preHandler: [authenticateToken, validateBody(updateCommentSchema)],
    handler: adapt(updateVideoComment),
  });

  fastify.delete("/comments/:commentId", {
    preHandler: [authenticateToken],
    handler: adapt(deleteVideoComment),
  });

  fastify.post("/comments/:commentId/resolve", {
    preHandler: [authenticateToken],
    handler: adapt(resolveVideoComment),
  });
}
