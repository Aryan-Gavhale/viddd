import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { sendVerificationEmail, verifyEmailToken, resendVerificationEmail } from "../Controllers/emailVerification.controller.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import Joi from "joi";

const sendSchema = Joi.object({
  email: Joi.string().email().required(),
});

const verifyQuerySchema = Joi.object({
  token: Joi.string().required(),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/send", {
    config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    preHandler: [validateBody(sendSchema)],
    handler: wrapHandler(sendVerificationEmail),
  });

  fastify.get("/verify", {
    preHandler: [validateQuery(verifyQuerySchema)],
    handler: wrapHandler(verifyEmailToken),
  });

  fastify.post("/resend", {
    config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    preHandler: [validateBody(sendSchema)],
    handler: wrapHandler(resendVerificationEmail),
  });
}
