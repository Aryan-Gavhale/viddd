import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  listConnectedAccounts,
  startOAuthConnect,
  oauthCallback,
  disconnectAccount,
} from "../Controllers/connectedAccounts.controller.js";

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.get("/", {
    preHandler: [authenticateToken],
    handler: wrapHandler(listConnectedAccounts),
  });
  fastify.get("/start/:provider", {
    preHandler: [authenticateToken],
    handler: wrapHandler(startOAuthConnect),
  });
  // Public callback — provider sends the user back here.
  fastify.get("/callback/:provider", { handler: wrapHandler(oauthCallback) });
  fastify.delete("/:provider", {
    preHandler: [authenticateToken],
    handler: wrapHandler(disconnectAccount),
  });
}
