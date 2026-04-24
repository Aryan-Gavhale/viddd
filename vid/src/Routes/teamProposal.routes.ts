import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/teamProposal.controller.js";

const createSchema = Joi.object({
  jobId: Joi.number().integer().required(),
  teamName: Joi.string().min(1).max(100).required(),
  coverLetter: Joi.string().max(5000).optional().allow(""),
  estimatedDays: Joi.number().integer().min(1).max(365).optional(),
  members: Joi.array().items(Joi.object({
    userId: Joi.number().integer().required(),
    role: Joi.string().min(1).max(50).required(),
    responsibility: Joi.string().max(500).optional().allow(""),
    rate: Joi.number().integer().min(0).optional(),
  })).min(1).max(20).required(),
});

const respondSchema = Joi.object({
  accept: Joi.boolean().required(),
});

const acceptSchema = Joi.object({
  note: Joi.string().max(2000).optional().allow(""),
});

export default async function teamProposalRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post("/", { preHandler: [authenticateToken, validateBody(createSchema)] }, ctrl.createTeamProposal as any);
  app.get("/job/:jobId", { preHandler: [authenticateToken] }, ctrl.getTeamProposals as any);
  app.get("/my", { preHandler: [authenticateToken] }, ctrl.getMyTeamProposals as any);
  app.get("/invitations", { preHandler: [authenticateToken] }, ctrl.getMyInvitations as any);
  app.post("/members/:memberId/respond", { preHandler: [authenticateToken, validateBody(respondSchema)] }, ctrl.respondToInvite as any);
  app.post("/:proposalId/accept", { preHandler: [authenticateToken, validateBody(acceptSchema)] }, ctrl.acceptTeamProposal as any);
}
