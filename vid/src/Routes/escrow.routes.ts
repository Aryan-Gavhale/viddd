import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateWithDB } from "../Middlewares/auth.middleware.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { releaseEscrow, requestEscrowRelease, disputeEscrow, getEscrowStatus } from "../Controllers/escrow.controller.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";

const disputeSchema = Joi.object({
  reason: Joi.string().min(10).max(1000).required(),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.get("/:orderId", { preHandler: [authenticateToken], handler: wrapHandler(getEscrowStatus) });
  fastify.post("/:orderId/release", { preHandler: [authenticateWithDB], handler: wrapHandler(releaseEscrow) });
  fastify.post("/:orderId/request-release", { preHandler: [authenticateWithDB], handler: wrapHandler(requestEscrowRelease) });
  fastify.post("/:orderId/dispute", {
    preHandler: [authenticateWithDB, validateBody(disputeSchema)],
    handler: wrapHandler(disputeEscrow),
  });
}
