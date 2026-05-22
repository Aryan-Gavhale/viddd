import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  changePassword,
  passwordForgot,
  passwordReset,
} from "../Controllers/security.controller.js";
import {
  get2faStatus,
  setup2fa,
  verify2faSetup,
  disable2fa,
} from "../Controllers/twoFactor.controller.js";
import {
  listSessions,
  revokeSession,
  revokeAllOtherSessions,
} from "../Controllers/sessions.controller.js";
import {
  changePasswordSchema,
  verify2faSetupSchema,
  disable2faSchema,
  passwordForgotSchema,
  passwordResetSchema,
  login2faChallengeSchema,
} from "../Schemas/settings.schemas.js";
import { complete2faLoginRoute } from "../Controllers/auth.bridge.js";

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  const isDev = process.env.NODE_ENV !== "production";

  // ── Password ──────────────────────────────────────────────────────────
  fastify.post("/password/change", {
    config: { rateLimit: { max: isDev ? 30 : 5, timeWindow: "1 minute" } },
    preHandler: [authenticateToken, validateBody(changePasswordSchema)],
    handler: wrapHandler(changePassword),
  });
  fastify.post("/password/forgot", {
    config: { rateLimit: { max: isDev ? 30 : 5, timeWindow: "1 hour" } },
    preHandler: [validateBody(passwordForgotSchema)],
    handler: wrapHandler(passwordForgot),
  });
  fastify.post("/password/reset", {
    config: { rateLimit: { max: isDev ? 30 : 10, timeWindow: "1 hour" } },
    preHandler: [validateBody(passwordResetSchema)],
    handler: wrapHandler(passwordReset),
  });

  // ── 2FA ──────────────────────────────────────────────────────────────
  fastify.get("/2fa/status", {
    preHandler: [authenticateToken],
    handler: wrapHandler(get2faStatus),
  });
  fastify.post("/2fa/setup", {
    preHandler: [authenticateToken],
    handler: wrapHandler(setup2fa),
  });
  fastify.post("/2fa/verify-setup", {
    preHandler: [authenticateToken, validateBody(verify2faSetupSchema)],
    handler: wrapHandler(verify2faSetup),
  });
  fastify.post("/2fa/disable", {
    preHandler: [authenticateToken, validateBody(disable2faSchema)],
    handler: wrapHandler(disable2fa),
  });
  fastify.post("/2fa/login", {
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    preHandler: [validateBody(login2faChallengeSchema)],
    handler: wrapHandler(complete2faLoginRoute),
  });

  // ── Sessions ─────────────────────────────────────────────────────────
  fastify.get("/sessions", {
    preHandler: [authenticateToken],
    handler: wrapHandler(listSessions),
  });
  fastify.delete("/sessions", {
    preHandler: [authenticateToken],
    handler: wrapHandler(revokeAllOtherSessions),
  });
  fastify.delete("/sessions/:jti", {
    preHandler: [authenticateToken],
    handler: wrapHandler(revokeSession),
  });
}
