import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { wrapHandler } from "../Utils/wrapHandler.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import {
  getFreelancerSkills,
  getFreelancerSoftware,
} from "../Controllers/freelancer.controller.js";

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  const auth = [authenticateToken];

  fastify.get("/skills", { preHandler: auth, handler: wrapHandler(getFreelancerSkills) });
  fastify.get("/software", { preHandler: auth, handler: wrapHandler(getFreelancerSoftware) });
}
