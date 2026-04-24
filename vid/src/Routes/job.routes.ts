import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  createJob,
  updateJob,
  deleteJob,
  getJob,
  getClientJobs,
  getAllJobs,
  applyJob,
  checkApplicationStatus,
  getCurrentJobs,
  getAppliedJobs,
  getCompletedJobs,
  getJobApplications,
  acceptApplication,
  rejectApplication,
  getAllJobsAdmin,
  verifyJob,
  unverifyJob,
  deleteJobAdmin,
  getAllApplicationsAdmin,
  getActiveJobs,
} from "../Controllers/job.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { restrictTo } from "../Middlewares/restrict.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { uploadSingle } from "../Middlewares/upload.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import Joi from "joi";

// Joi schemas for validation
const jobSchema = Joi.object({
  title: Joi.string().max(100).required().messages({ "string.max": "Title must be 100 characters or less" }),
  description: Joi.string().max(5000).required().messages({ "string.max": "Description must be 5000 characters or less" }),
  category: Joi.array().items(Joi.string().max(50)).min(1).required().messages({ "array.min": "At least one category is required" }),
  budgetMin: Joi.number().positive().required(),
  budgetMax: Joi.number().positive().greater(Joi.ref("budgetMin")).required(),
  deadline: Joi.date().greater("now").required(),
  jobDifficulty: Joi.string().valid("EASY", "INTERMEDIATE", "HARD").required(),
  projectLength: Joi.string().valid("SHORT_TERM", "MEDIUM_TERM", "LONG_TERM").required(),
  keyResponsibilities: Joi.array().items(Joi.string().max(100)).required(),
  requiredSkills: Joi.array().items(Joi.string().max(100)).min(1).required().messages({ "array.min": "At least one skill is required" }),
  tools: Joi.array().items(Joi.string().max(100)).optional(),
  scope: Joi.string().max(5000).required(),
  name: Joi.string().max(100).required(),
  email: Joi.string().email().required(),
  company: Joi.string().max(100).optional(),
  note: Joi.string().max(2000).optional(),
  videoFileUrl: Joi.string().uri().optional(),
});

const updateJobSchema = jobSchema.fork(Object.keys(jobSchema.describe().keys), (field) => field.optional()).min(1);

const getJobsSchema = Joi.object({
  category: Joi.string().optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const applicationActionSchema = Joi.object({
  freelancerId: Joi.number().integer().min(1).required(),
});

const applyBodySchema = Joi.object({
  aboutFreelancer: Joi.string().max(5000).required(),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // Public + mixed routes
  fastify.get("/all", { preHandler: [validateQuery(getJobsSchema)], handler: wrapHandler(getAllJobs) });
  fastify.get("/current", { preHandler: [authenticateToken], handler: wrapHandler(getCurrentJobs) });
  fastify.get("/applied", { preHandler: [authenticateToken], handler: wrapHandler(getAppliedJobs) });
  fastify.get("/completed", { preHandler: [authenticateToken], handler: wrapHandler(getCompletedJobs) });
  fastify.get("/active", { preHandler: [authenticateToken, restrictTo(["FREELANCER"])], handler: wrapHandler(getActiveJobs) });
  fastify.get("/:jobId", { handler: wrapHandler(getJob) });

  // Protected routes (require authentication)
  const auth = [authenticateToken];

  fastify.get("/apply/status/:jobId", { preHandler: auth, handler: wrapHandler(checkApplicationStatus) });
  fastify.post("/", { preHandler: [...auth, uploadSingle("videoFile"), validateBody(jobSchema)], handler: wrapHandler(createJob) });
  fastify.put("/:jobId", { preHandler: [...auth, uploadSingle("videoFile"), validateBody(updateJobSchema)], handler: wrapHandler(updateJob) });
  fastify.delete("/:jobId", { preHandler: auth, handler: wrapHandler(deleteJob) });
  fastify.get("/", { preHandler: [...auth, validateQuery(getJobsSchema)], handler: wrapHandler(getClientJobs) });
  fastify.post("/apply/:jobId", { preHandler: [...auth, validateBody(applyBodySchema)], handler: wrapHandler(applyJob) });

  // Client-specific routes
  fastify.get("/:jobId/applications", { preHandler: [...auth, restrictTo(["CLIENT"])], handler: wrapHandler(getJobApplications) });
  fastify.post("/:jobId/apply/accept", {
    preHandler: [...auth, validateBody(applicationActionSchema), restrictTo("CLIENT")],
    handler: wrapHandler(acceptApplication),
  });
  fastify.post("/:jobId/apply/reject", {
    preHandler: [...auth, validateBody(applicationActionSchema), restrictTo("CLIENT")],
    handler: wrapHandler(rejectApplication),
  });

  // Application routes
  fastify.post("/:jobId/apply", { preHandler: [...auth, restrictTo("FREELANCER")], handler: wrapHandler(applyJob) });
  fastify.get("/:jobId/apply/status", { preHandler: auth, handler: wrapHandler(checkApplicationStatus) });
  fastify.post("/:jobId/accept", { preHandler: [...auth, restrictTo("CLIENT")], handler: wrapHandler(acceptApplication) });
  fastify.post("/:jobId/reject", { preHandler: [...auth, restrictTo("CLIENT")], handler: wrapHandler(rejectApplication) });

  // Admin routes (use("/admin", restrictTo(["ADMIN", "SUPERADMIN"])) + per-route)
  const admin = [authenticateToken, restrictTo(["ADMIN", "SUPERADMIN"])];

  fastify.get("/admin/jobs", { preHandler: [...admin, validateQuery(getJobsSchema)], handler: wrapHandler(getAllJobsAdmin) });
  fastify.put("/admin/jobs/:jobId/verify", {
    preHandler: [...admin, restrictTo(["SUPERADMIN"])],
    handler: wrapHandler(verifyJob),
  });
  fastify.put("/admin/jobs/:jobId/unverify", {
    preHandler: [...admin, restrictTo(["SUPERADMIN"])],
    handler: wrapHandler(unverifyJob),
  });
  fastify.delete("/admin/jobs/:jobId", { preHandler: admin, handler: wrapHandler(deleteJobAdmin) });
  fastify.get("/admin/applications", { preHandler: [...admin, validateQuery(getJobsSchema)], handler: wrapHandler(getAllApplicationsAdmin) });
}
