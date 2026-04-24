import type { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { handleStripeWebhook } from "../Controllers/webhook.controller.js";
import { wrapHandler } from "../Utils/wrapHandler.js";

type RequestWithRawBody = FastifyRequest & { rawBody?: Buffer };

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req: FastifyRequest, body: Buffer, done) => {
      try {
        (req as RequestWithRawBody).rawBody = body;
        const json = JSON.parse(body.toString());
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  fastify.post("/stripe", { handler: wrapHandler(handleStripeWebhook) });
}
