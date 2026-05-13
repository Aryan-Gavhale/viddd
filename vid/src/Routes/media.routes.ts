import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import Joi from "joi";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateQuery } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import { getMediaAssetForProjectFile, getMediaAssetUrls, retryMediaAsset } from "../Controllers/media.controller.js";

const auth = [authenticateToken];

const urlQuery = Joi.object({
  kind: Joi.string().valid("preview", "watermarked", "original", "poster", "variant").default("preview"),
  variantId: Joi.string().max(80).optional(),
});

export default async function mediaRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.get("/assets/:projectFileId", {
    preHandler: auth,
    handler: wrapHandler(getMediaAssetForProjectFile),
  });

  fastify.get("/assets/:assetId/urls", {
    preHandler: [...auth, validateQuery(urlQuery)],
    handler: wrapHandler(getMediaAssetUrls),
  });

  fastify.post("/assets/:assetId/retry", {
    preHandler: auth,
    handler: wrapHandler(retryMediaAsset),
  });
}
