import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import { sqlOne, sql } from "../db.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import type { AuthUser, DbRow } from "../types/index.js";
import { countOpenReviewComments } from "../Controllers/videoReview.controller.js";
import Joi from "joi";

const createTimelineSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional().allow(""),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  color: Joi.string().max(20).optional(),
  dependsOnId: Joi.number().integer().optional().allow(null),
});

const updateTimelineSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional().allow(""),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  status: Joi.string().valid("PENDING", "IN_PROGRESS", "COMPLETED").optional(),
  progress: Joi.number().integer().min(0).max(100).optional(),
  color: Joi.string().max(20).optional(),
  dependsOnId: Joi.number().integer().optional().allow(null),
})
  .min(1)
  .messages({ "object.min": "At least one field is required" });

type AuthedRequest = FastifyRequest & { user: AuthUser };

async function assertJobParticipant(jobId: string, userId: number): Promise<DbRow> {
  const job = await sqlOne(
    `SELECT posted_by_id AS "postedById", freelancer_id AS "freelancerId" FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
    [parseInt(jobId, 10)]
  );

  if (!job) throw new ApiError(404, "Project not found");

  if (job["postedById"] !== userId && job["freelancerId"] !== userId) {
    throw new ApiError(403, "You are not a participant of this project");
  }

  return job;
}

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/projects/:jobId", {
    preHandler: [authenticateToken, validateBody(createTimelineSchema)],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const req = request as AuthedRequest;
      const { jobId } = request.params as { jobId: string };
      const { title, description, startDate, endDate, color, dependsOnId } = request.body as {
        title: string;
        description?: string;
        startDate?: string | Date;
        endDate?: string | Date;
        color?: string;
        dependsOnId?: number;
      };

      await assertJobParticipant(jobId, req.user.id);

      const timelineItem = await sqlOne(
        `INSERT INTO "Timeline" ("jobId", "title", "description", "startDate", "endDate", "color", "dependsOnId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [parseInt(jobId, 10), title, description || null, startDate ? new Date(startDate) : null, endDate ? new Date(endDate) : null, color || null, dependsOnId || null]
      );

      return reply.code(201).send(new ApiResponse(201, timelineItem, "Timeline item created"));
    },
  });

  fastify.get("/projects/:jobId", {
    preHandler: [authenticateToken],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const req = request as AuthedRequest;
      const { jobId } = request.params as { jobId: string };

      await assertJobParticipant(jobId, req.user.id);

      const timelineItems: DbRow[] = await sql(
        `SELECT * FROM "Timeline" WHERE "jobId" = $1 ORDER BY "startDate" ASC`,
        [parseInt(jobId, 10)]
      );

      return reply.send(new ApiResponse(200, timelineItems, "Timeline retrieved"));
    },
  });

  fastify.put("/:id", {
    preHandler: [authenticateToken, validateBody(updateTimelineSchema)],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const req = request as AuthedRequest;
      const { id } = request.params as { id: string };
      const { title, description, startDate, endDate, status, progress, color, dependsOnId } = request.body as {
        title?: string;
        description?: string;
        startDate?: string | Date;
        endDate?: string | Date;
        status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
        progress?: number;
        color?: string;
        dependsOnId?: number | null;
      };

      const timeline = await sqlOne(
        `SELECT t.*, j.posted_by_id AS "postedById", j.freelancer_id AS "freelancerId"
         FROM "Timeline" t
         JOIN "Job" j ON j."id" = t."jobId"
         WHERE t."id" = $1`,
        [parseInt(id, 10)]
      );

      if (!timeline) throw new ApiError(404, "Timeline item not found");

      if (timeline["postedById"] !== req.user.id && timeline["freelancerId"] !== req.user.id) {
        throw new ApiError(403, "You are not a participant of this project");
      }

      // Block milestone completion while review feedback is still open. The
      // editor must address every client comment before the milestone (and the
      // money tied to it) can move forward. Mirrored on the order side too.
      const wantsCompletion = status === "COMPLETED" || (progress != null && progress >= 100);
      const alreadyCompleted = Boolean(timeline["isCompleted"]) || String(timeline["status"]) === "COMPLETED";
      if (wantsCompletion && !alreadyCompleted) {
        const openCount = await countOpenReviewComments({
          kind: "JOB",
          id: Number(timeline["jobId"]),
        });
        if (openCount > 0) {
          throw new ApiError(
            409,
            `Resolve all open review comments before completing this milestone (${openCount} still open).`
          );
        }
      }

      const setClauses: string[] = [`"updatedAt" = NOW()`];
      const params: unknown[] = [];
      let p = 1;

      if (title !== undefined) { setClauses.push(`"title" = $${p}`); params.push(title); p++; }
      if (description !== undefined) { setClauses.push(`"description" = $${p}`); params.push(description); p++; }
      if (startDate !== undefined) { setClauses.push(`"startDate" = $${p}`); params.push(new Date(startDate)); p++; }
      if (endDate !== undefined) { setClauses.push(`"endDate" = $${p}`); params.push(new Date(endDate)); p++; }
      if (status !== undefined) {
        setClauses.push(`"isCompleted" = $${p}`); params.push(status === "COMPLETED"); p++;
        setClauses.push(`"status" = $${p}`); params.push(status); p++;
      }
      if (progress !== undefined) { setClauses.push(`"progress" = $${p}`); params.push(progress); p++; }
      if (color !== undefined) { setClauses.push(`"color" = $${p}`); params.push(color); p++; }
      if (dependsOnId !== undefined) { setClauses.push(`"dependsOnId" = $${p}`); params.push(dependsOnId); p++; }

      params.push(parseInt(id, 10));
      const updatedItem = await sqlOne(
        `UPDATE "Timeline" SET ${setClauses.join(", ")} WHERE "id" = $${p} RETURNING *`,
        params
      );

      return reply.send(new ApiResponse(200, updatedItem, "Timeline item updated"));
    },
  });

  fastify.delete("/:id", {
    preHandler: [authenticateToken],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const req = request as AuthedRequest;
      const { id } = request.params as { id: string };

      const timeline = await sqlOne(
        `SELECT t.*, j.posted_by_id AS "postedById", j.freelancer_id AS "freelancerId"
         FROM "Timeline" t
         JOIN "Job" j ON j."id" = t."jobId"
         WHERE t."id" = $1`,
        [parseInt(id, 10)]
      );

      if (!timeline) throw new ApiError(404, "Timeline item not found");

      if (timeline["postedById"] !== req.user.id && timeline["freelancerId"] !== req.user.id) {
        throw new ApiError(403, "You are not a participant of this project");
      }

      await sql(`DELETE FROM "Timeline" WHERE "id" = $1`, [parseInt(id, 10)]);

      return reply.code(204).send();
    },
  });
}
