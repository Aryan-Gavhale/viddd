import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import { sql, sqlOne } from "../db.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateQuery } from "../Middlewares/validate.middleware.js";
import logger from "../Utils/logger.js";
import type { AuthUser, DbRow } from "../types/index.js";
import Joi from "joi";

const applicationsPaginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

type AuthedRequest = FastifyRequest & { user: AuthUser };

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  const auth = [authenticateToken];

  fastify.get("/client/jobs", {
    preHandler: [...auth, validateQuery(applicationsPaginationQuerySchema)],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const req = request as AuthedRequest;
      const clientId = req.user.id;
      const jobs: DbRow[] = await sql(
        `SELECT * FROM "Job" WHERE posted_by_id = $1 AND "deletedAt" IS NULL`,
        [clientId]
      );
      return reply.send({ success: true, data: jobs });
    },
  });

  fastify.get("/jobs/applications/:jobId", {
    preHandler: [...auth, validateQuery(applicationsPaginationQuerySchema)],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const req = request as AuthedRequest;
      try {
        const jobId = parseInt((request.params as { jobId: string }).jobId, 10);
        const job = await sqlOne(
          `SELECT posted_by_id AS "postedById" FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
          [jobId]
        );

        if (!job) {
          return reply.code(404).send({ message: "Job not found" });
        }

        if (req.user.role !== "ADMIN" && job["postedById"] !== req.user.id) {
          return reply.code(403).send({ message: "Unauthorized to view these applications" });
        }

        const applications: DbRow[] = await sql(
          `SELECT a.*,
                  u."id" AS "freelancer_id", u."firstname", u."lastname", u."username",
                  u."profilePicture", u."rating" AS "user_rating", u."totalJobs", u."successRate",
                  fp."jobTitle", fp."experienceLevel", fp."skills", fp."totalEarnings",
                  fp."hourlyRate", fp."rating" AS "fp_rating"
           FROM "Application" a
           JOIN "User" u ON u."id" = a."freelancerId"
           LEFT JOIN "FreelancerProfile" fp ON fp.user_id = u."id"
           WHERE a."jobId" = $1
           ORDER BY a."createdAt" DESC`,
          [jobId]
        );

        const formatted = applications.map((a: DbRow) => ({
          id: a["id"],
          jobId: a["jobId"],
          freelancerId: a["freelancerId"],
          aboutFreelancer: a["aboutFreelancer"],
          status: a["status"],
          createdAt: a["createdAt"],
          freelancer: {
            id: a["freelancer_id"],
            firstname: a["firstname"],
            lastname: a["lastname"],
            username: a["username"],
            profilePicture: a["profilePicture"],
            rating: a["user_rating"],
            totalJobs: a["totalJobs"],
            successRate: a["successRate"],
            freelancerProfile: a["jobTitle"] ? {
              jobTitle: a["jobTitle"],
              experienceLevel: a["experienceLevel"],
              skills: a["skills"],
              totalEarnings: a["totalEarnings"],
              hourlyRate: a["hourlyRate"],
              rating: a["fp_rating"],
            } : null,
          },
        }));

        return reply.code(200).send({
          success: true,
          count: formatted.length,
          data: formatted,
        });
      } catch (error) {
        logger.error((error as Error).message);
        return reply.code(500).send({
          message: "Server error while fetching applications",
          error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
      }
    },
  });
}
