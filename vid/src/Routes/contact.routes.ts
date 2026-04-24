import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { wrapHandler } from "../Utils/wrapHandler.js";
import { protect, restrictTo } from "../Middlewares/auth.middleware.js";
import { isAdmin } from "../Middlewares/admin.middleware.js";
import { uploadMultiple } from "../Middlewares/upload.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import {
  createContactSubmission,
  getContactSubmissions,
  getContactSubmissionById,
  updateContactSubmission,
  deleteContactSubmission,
  assignAdminToSubmission,
  addResolutionNote,
  getSubmissionFiles,
  deleteSubmissionFile,
  submitContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
} from "../Controllers/contact.controller.js";

const CATEGORIES = ["TECHNICAL", "BILLING", "ACCOUNT", "FEATURE", "OTHER"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const CONTACT_METHODS = ["EMAIL", "PHONE", "ANY"] as const;
const CONTACT_STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const PHONE_RE = /^\+?[\d\s-]{7,15}$/;

const contactFormBodySchema = Joi.object({
  firstName: Joi.string().trim().max(100).required(),
  lastName: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().email().max(255).required(),
  phone: Joi.alternatives()
    .try(Joi.string().valid(""), Joi.string().trim().max(20).pattern(PHONE_RE))
    .optional()
    .messages({ "alternatives.match": "Invalid phone number format" }),
  category: Joi.string()
    .valid(...CATEGORIES)
    .optional()
    .allow(""),
  subject: Joi.string().trim().max(255).required(),
  message: Joi.string().trim().min(1).required(),
  priority: Joi.string()
    .valid(...PRIORITIES)
    .optional()
    .allow(""),
  contactMethod: Joi.string()
    .valid(...CONTACT_METHODS)
    .optional()
    .allow(""),
  description: Joi.string().trim().max(2000).optional().allow(""),
});

const adminListQuerySchema = Joi.object({
  status: Joi.string().trim().optional().allow(""),
  priority: Joi.string().trim().optional().allow(""),
  category: Joi.string()
    .valid(...CATEGORIES)
    .optional()
    .allow(""),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort: Joi.string().trim().optional().allow(""),
});

const contactSubmissionsQuerySchema = Joi.object({
  status: Joi.string().trim().optional().allow(""),
  priority: Joi.string().trim().optional().allow(""),
  category: Joi.string()
    .valid(...CATEGORIES)
    .optional()
    .allow(""),
  isResolved: Joi.string().valid("true", "false").optional(),
  email: Joi.string().trim().max(255).optional().allow(""),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort: Joi.string().trim().optional().allow(""),
});

const updateContactStatusBodySchema = Joi.object({
  status: Joi.string()
    .valid(...CONTACT_STATUSES)
    .required(),
});

const assignAdminBodySchema = Joi.object({
  adminId: Joi.string().trim().min(1).required(),
});

const addNoteBodySchema = Joi.object({
  note: Joi.string().trim().min(1).max(2000).required(),
});

const updateContactSubmissionBodySchema = Joi.object({
  status: Joi.string()
    .valid(...CONTACT_STATUSES)
    .optional(),
  priority: Joi.string()
    .valid(...PRIORITIES)
    .optional(),
  category: Joi.string()
    .valid(...CATEGORIES)
    .optional(),
  contactMethod: Joi.string()
    .valid(...CONTACT_METHODS)
    .optional(),
  isResolved: Joi.boolean().optional(),
  resolutionNotes: Joi.string().max(20000).optional().allow(""),
  assignedAdminId: Joi.string().uuid().optional(),
  firstName: Joi.string().trim().max(100).optional().allow(""),
  lastName: Joi.string().trim().max(100).optional().allow(""),
  email: Joi.string().trim().email().max(255).optional().allow(""),
  subject: Joi.string().trim().max(255).optional().allow(""),
  message: Joi.string().min(1).max(20000).optional().allow(""),
  phone: Joi.alternatives()
    .try(Joi.string().valid(""), Joi.string().trim().max(20).pattern(PHONE_RE))
    .optional()
    .messages({ "alternatives.match": "Invalid phone number format" }),
  description: Joi.string().trim().max(2000).optional().allow(""),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/", {
    config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    preHandler: [uploadMultiple("files", 5), validateBody(contactFormBodySchema)],
    handler: wrapHandler(createContactSubmission),
  });
  fastify.post("/submit", {
    config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    preHandler: [uploadMultiple("files", 10), validateBody(contactFormBodySchema)],
    handler: wrapHandler(submitContact),
  });

  const protectAdmin = [protect, isAdmin];
  fastify.get("/admin", {
    preHandler: [...protectAdmin, validateQuery(adminListQuerySchema)],
    handler: wrapHandler(getAllContacts),
  });
  fastify.get("/admin/:id", { preHandler: protectAdmin, handler: wrapHandler(getContactById) });
  fastify.patch("/admin/:id/status", {
    preHandler: [...protectAdmin, validateBody(updateContactStatusBodySchema)],
    handler: wrapHandler(updateContactStatus),
  });
  fastify.delete("/admin/:id", { preHandler: protectAdmin, handler: wrapHandler(deleteContact) });

  const protectRoleAdmin = [protect, restrictTo("admin")];
  fastify.get("/", {
    preHandler: [...protectRoleAdmin, validateQuery(contactSubmissionsQuerySchema)],
    handler: wrapHandler(getContactSubmissions),
  });
  fastify.get("/:id/files", { preHandler: protectRoleAdmin, handler: wrapHandler(getSubmissionFiles) });
  fastify.get("/:id", { preHandler: protectRoleAdmin, handler: wrapHandler(getContactSubmissionById) });
  fastify.patch("/:id/assign", {
    preHandler: [...protectRoleAdmin, validateBody(assignAdminBodySchema)],
    handler: wrapHandler(assignAdminToSubmission),
  });
  fastify.patch("/:id", {
    preHandler: [...protectRoleAdmin, validateBody(updateContactSubmissionBodySchema)],
    handler: wrapHandler(updateContactSubmission),
  });
  fastify.post("/:id/notes", {
    preHandler: [...protectRoleAdmin, validateBody(addNoteBodySchema)],
    handler: wrapHandler(addResolutionNote),
  });
  fastify.delete("/:id/files/:fileId", { preHandler: protectRoleAdmin, handler: wrapHandler(deleteSubmissionFile) });
  fastify.delete("/:id", { preHandler: protectRoleAdmin, handler: wrapHandler(deleteContactSubmission) });
}
