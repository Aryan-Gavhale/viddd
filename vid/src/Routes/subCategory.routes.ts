import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/auth.middleware.js";
import { isAdmin } from "../Middlewares/admin.middleware.js";
import { validateBody } from "../Middlewares/validate.middleware.js";
import Joi from "joi";
import * as ctrl from "../Controllers/subCategory.controller.js";

const createSchema = Joi.object({
  parentCategory: Joi.string().min(1).max(50).required(),
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional().allow(""),
  iconName: Joi.string().max(50).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

export default async function subCategoryRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get("/", ctrl.getSubCategories as any);
  app.post("/", { preHandler: [authenticateToken, isAdmin, validateBody(createSchema)] }, ctrl.createSubCategory as any);
}
