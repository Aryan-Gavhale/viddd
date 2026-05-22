import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  acceptTeamInvite,
} from "../Controllers/team.controller.js";
import {
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
} from "../Schemas/settings.schemas.js";

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.get("/members", {
    preHandler: [authenticateToken],
    handler: wrapHandler(listTeamMembers),
  });
  fastify.post("/members/invite", {
    preHandler: [authenticateToken, validateBody(inviteTeamMemberSchema)],
    handler: wrapHandler(inviteTeamMember),
  });
  fastify.get("/members/accept", {
    preHandler: [authenticateToken],
    handler: wrapHandler(acceptTeamInvite),
  });
  fastify.patch("/members/:id", {
    preHandler: [authenticateToken, validateBody(updateTeamMemberSchema)],
    handler: wrapHandler(updateTeamMemberRole),
  });
  fastify.delete("/members/:id", {
    preHandler: [authenticateToken],
    handler: wrapHandler(removeTeamMember),
  });
}
