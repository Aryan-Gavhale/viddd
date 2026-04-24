import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticate } from "../Middlewares/auth.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import {
  setAvailability,
  getMyAvailability,
  getFreelancerAvailability,
  deleteSlot,
} from "../Controllers/calendar.controller.js";
import Joi from "joi";

const slotSchema = Joi.object({
  id: Joi.number().integer().optional(),
  dayOfWeek: Joi.number().integer().min(0).max(6).optional().allow(null),
  specificDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().allow(null, ""),
  startTime: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required(),
  endTime: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required(),
  isAvailable: Joi.boolean().optional(),
  timezone: Joi.string().max(50).optional(),
  note: Joi.string().max(2000).optional().allow(""),
}).or("dayOfWeek", "specificDate");

const setAvailabilitySchema = Joi.object({
  slots: Joi.array().items(slotSchema).min(1).required(),
});

export default async function calendarRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/availability", { preHandler: [authenticate, validateBody(setAvailabilitySchema)] }, setAvailability as any);
  fastify.get("/availability", { preHandler: [authenticate] }, getMyAvailability as any);
  fastify.get("/freelancer/:userId", getFreelancerAvailability as any);
  fastify.delete("/availability/:slotId", { preHandler: [authenticate] }, deleteSlot as any);
}
