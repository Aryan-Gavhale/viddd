import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import Joi from "joi";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  listSavedItems,
  getSavedSummary,
  createSavedItem,
  deleteSavedByEntity,
  deleteSavedById,
} from "../Controllers/savedItem.controller.js";

const auth = [authenticateToken];

const entityType = Joi.string().valid("GIG", "FREELANCER", "JOB", "EDITOR", "SERVICE");

const listSavedSchema = Joi.object({
  entityType: entityType.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(12),
});

const createSavedSchema = Joi.object({
  entityType: entityType.required(),
  entityId: Joi.number().integer().positive().required(),
  note: Joi.string().max(500).allow("", null).optional(),
});

export default async function routes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  fastify.get("/", {
    preHandler: [...auth, validateQuery(listSavedSchema)],
    handler: wrapHandler(listSavedItems),
  });
  fastify.get("/summary", {
    preHandler: auth,
    handler: wrapHandler(getSavedSummary),
  });
  fastify.post("/", {
    preHandler: [...auth, validateBody(createSavedSchema)],
    handler: wrapHandler(createSavedItem),
  });
  fastify.delete("/items/:savedItemId", {
    preHandler: auth,
    handler: wrapHandler(deleteSavedById),
  });
  fastify.delete("/:entityType/:entityId", {
    preHandler: auth,
    handler: wrapHandler(deleteSavedByEntity),
  });
}
