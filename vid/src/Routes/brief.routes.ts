import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import { createBrief, updateBrief, getBrief, getMyBriefs, deleteBrief } from "../Controllers/brief.controller.js";

const briefSchema = Joi.object({
  title: Joi.string().max(200).required(),
  status: Joi.string().valid("DRAFT", "SUBMITTED", "IN_REVIEW").optional(),
  projectType: Joi.string().max(50).optional().allow(null, ""),
  description: Joi.string().max(5000).optional().allow(null, ""),
  targetAudience: Joi.string().max(2000).optional().allow(null, ""),
  purpose: Joi.string().max(2000).optional().allow(null, ""),
  duration: Joi.string().max(50).optional().allow(null, ""),
  deadline: Joi.date().optional().allow(null),
  budget: Joi.string().max(50).optional().allow(null, ""),
  videoStyle: Joi.string().max(50).optional().allow(null, ""),
  tone: Joi.string().max(50).optional().allow(null, ""),
  pacing: Joi.string().max(50).optional().allow(null, ""),
  musicPreference: Joi.string().max(1000).optional().allow(null, ""),
  colorGrading: Joi.string().max(50).optional().allow(null, ""),
  styleNotes: Joi.string().max(3000).optional().allow(null, ""),
  referenceVideos: Joi.array().items(Joi.object({ url: Joi.string(), title: Joi.string().allow(""), notes: Joi.string().allow(""), timestamp: Joi.string().allow("") })).max(10).optional(),
  brandName: Joi.string().max(200).optional().allow(null, ""),
  brandColors: Joi.array().items(Joi.string()).max(10).optional(),
  brandFonts: Joi.string().max(500).optional().allow(null, ""),
  logoUrl: Joi.string().max(500).optional().allow(null, ""),
  brandVoice: Joi.string().max(2000).optional().allow(null, ""),
  dosAndDonts: Joi.object({ dos: Joi.array().items(Joi.string()), donts: Joi.array().items(Joi.string()) }).optional(),
  deliverables: Joi.array().items(Joi.object({ type: Joi.string(), description: Joi.string().allow(""), quantity: Joi.number().optional() })).max(20).optional(),
  aspectRatios: Joi.array().items(Joi.string()).max(10).optional(),
  fileFormats: Joi.array().items(Joi.string()).max(10).optional(),
  additionalNotes: Joi.string().max(5000).optional().allow(null, ""),
  moodBoardUrls: Joi.array().items(Joi.string()).max(20).optional(),
  jobId: Joi.number().integer().optional().allow(null),
  orderId: Joi.number().integer().optional().allow(null),
}).options({ stripUnknown: true });

const updateSchema = briefSchema.fork(["title"], (s) => s.optional());

function adapt(handler: Function) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as any;
    const res = { status: (code: number) => ({ json: (data: any) => reply.code(code).send(data) }) };
    const next = (err: any) => { if (err) throw err; };
    return handler(req, res, next);
  };
}

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/", { preHandler: [authenticateToken, validateBody(briefSchema)], handler: adapt(createBrief) });
  fastify.get("/my", { preHandler: [authenticateToken], handler: adapt(getMyBriefs) });
  fastify.get("/:briefId", { preHandler: [authenticateToken], handler: adapt(getBrief) });
  fastify.put("/:briefId", { preHandler: [authenticateToken, validateBody(updateSchema)], handler: adapt(updateBrief) });
  fastify.delete("/:briefId", { preHandler: [authenticateToken], handler: adapt(deleteBrief) });
}
