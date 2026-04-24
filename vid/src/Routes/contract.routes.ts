import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { ObjectSchema } from "joi";
import { authenticate } from "../Middlewares/auth.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import {
  getTemplates,
  createContract,
  getMyContracts,
  getContract,
  signContract,
} from "../Controllers/contract.controller.js";
import Joi from "joi";

const templateQuerySchema = Joi.object({
  type: Joi.string().max(30).optional(),
});

const createContractBase = {
  templateId: Joi.number().integer().required(),
  variables: Joi.object()
    .pattern(/.+/, Joi.alternatives().try(Joi.string().max(5000), Joi.number()))
    .optional(),
  title: Joi.string().max(300).optional().allow(""),
  expiresAt: Joi.date().iso().optional().allow(null),
};

const createContractSchema = Joi.alternatives().try(
  Joi.object({
    ...createContractBase,
    orderId: Joi.number().integer().required(),
  }),
  Joi.object({
    ...createContractBase,
    clientId: Joi.number().integer().required(),
    freelancerId: Joi.number().integer().required(),
  })
);

const signSchema = Joi.object({
  role: Joi.string().valid("CLIENT", "FREELANCER").required(),
});

export default async function contractRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.get("/templates", { preHandler: [authenticate, validateQuery(templateQuerySchema)] }, getTemplates as any);
  fastify.get("/", { preHandler: [authenticate] }, getMyContracts as any);
  fastify.post("/", { preHandler: [authenticate, validateBody(createContractSchema as unknown as ObjectSchema)] }, createContract as any);
  fastify.get("/:id", { preHandler: [authenticate] }, getContract as any);
  fastify.post("/:id/sign", { preHandler: [authenticate, validateBody(signSchema)] }, signContract as any);
}
