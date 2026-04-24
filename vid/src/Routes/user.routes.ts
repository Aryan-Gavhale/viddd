import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateUser,
  getUserProfile,
  deleteUser,
  deleteItem,
  getAllBadges,
  getAllFreelancers,
  getFreelancerById,
} from "../Controllers/user.controller.js";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { uploadSingle } from "../Middlewares/upload.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import Joi from "joi";

const passwordSchema = Joi.string()
  .min(8)
  .pattern(/[A-Z]/, "uppercase letter")
  .pattern(/[a-z]/, "lowercase letter")
  .pattern(/[0-9]/, "number")
  .pattern(/[!@#$%^&*(),.?":{}|<>]/, "special character")
  .messages({
    "string.min": "Password must be at least 8 characters",
    "string.pattern.name": "Password must contain at least one {#name}",
  });

const registerUserSchema = Joi.object({
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  email: Joi.string().email().required(),
  password: passwordSchema.required(),
  country: Joi.string().required(),
  role: Joi.string().valid("FREELANCER", "CLIENT").required(),
});

const loginUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateUserSchema = Joi.object({
  firstname: Joi.string().optional(),
  lastname: Joi.string().optional(),
  email: Joi.string().email().optional(),
  country: Joi.string().optional(),
  password: passwordSchema.optional(),
  username: Joi.string().optional(),
  bio: Joi.string().allow("").optional(),
  company: Joi.string().allow("").optional(),
  companyEmail: Joi.string().email().allow("").optional(),
  profilePicture: Joi.any().optional(),
  portfolio: Joi.array().items(Joi.object({ id: Joi.string(), title: Joi.string(), category: Joi.string(), url: Joi.string() })).optional(),
  services: Joi.array().items(Joi.object({ id: Joi.string(), title: Joi.string(), description: Joi.string() })).optional(),
  gigs: Joi.array().items(Joi.object({ id: Joi.string(), title: Joi.string(), price: Joi.string(), description: Joi.string(), deliveryTime: Joi.string() })).optional(),
  userBadges: Joi.array().items(Joi.object({ id: Joi.string(), badgeId: Joi.string(), isVisible: Joi.boolean() })).optional(),
  city: Joi.string().allow("").optional(),
  pinCode: Joi.string().allow("").optional(),
  state: Joi.string().allow("").optional(),
  jobTitle: Joi.string().allow("").optional(),
  overview: Joi.string().allow("").optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  languages: Joi.array().items(Joi.string()).optional(),
  socialLinks: Joi.object().optional(),
  tools: Joi.array().items(Joi.string()).optional(),
  equipmentCameras: Joi.string().allow("").optional(),
  equipmentLenses: Joi.string().allow("").optional(),
  equipmentLighting: Joi.string().allow("").optional(),
  equipmentOther: Joi.string().allow("").optional(),
  certifications: Joi.array().items(Joi.string()).optional(),
  minimumRate: Joi.number().optional(),
  maximumRate: Joi.number().optional(),
  hourlyRate: Joi.number().optional(),
  weeklyHours: Joi.number().integer().optional(),
  availabilityStatus: Joi.string().valid("FULL_TIME", "PART_TIME", "UNAVAILABLE").optional(),
  experienceLevel: Joi.string().valid("ENTRY", "INTERMEDIATE", "EXPERT").optional(),
}).min(1);

const freelancerQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow("").optional(),
  skills: Joi.string().allow("").optional(),
  location: Joi.string().allow("").optional(),
  experienceLevel: Joi.string().valid("ENTRY", "INTERMEDIATE", "EXPERT", "").allow("").optional(),
});

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // Public routes with per-route rate limits
  fastify.post("/register", {
    config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    preHandler: [validateBody(registerUserSchema)],
    handler: wrapHandler(registerUser),
  });
  fastify.post("/login", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    preHandler: [validateBody(loginUserSchema)],
    handler: wrapHandler(loginUser),
  });
  fastify.get("/profile/:userId", { handler: wrapHandler(getUserProfile) });

  // Logout (clears cookies + revokes refresh family)
  fastify.post("/logout", { preHandler: [authenticateToken], handler: wrapHandler(logoutUser) });

  // FIX M1: refresh endpoint — rotates refresh token, mints fresh access JWT.
  // No `authenticate` preHandler: the refresh cookie itself is the credential.
  fastify.post("/refresh", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    handler: wrapHandler(refreshAccessToken),
  });

  // Protected routes
  fastify.get("/me", { preHandler: [authenticateToken], handler: wrapHandler(getUserProfile) });
  fastify.patch("/me", {
    preHandler: [authenticateToken, uploadSingle("profilePicture"), validateBody(updateUserSchema)],
    handler: wrapHandler(updateUser),
  });
  fastify.delete("/delete", { preHandler: [authenticateToken], handler: wrapHandler(deleteUser) });
  fastify.delete("/me/:type/:id", { preHandler: [authenticateToken], handler: wrapHandler(deleteItem) });
  fastify.get("/badges", { preHandler: [authenticateToken], handler: wrapHandler(getAllBadges) });
  fastify.get("/freelancers", {
    preHandler: [authenticateToken, validateQuery(freelancerQuerySchema)],
    handler: wrapHandler(getAllFreelancers),
  });
  fastify.get("/freelancers/:freelancerId", { preHandler: [authenticateToken], handler: wrapHandler(getFreelancerById) });
}
