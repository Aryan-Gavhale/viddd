import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const getSubCategories: H = async (req, res, next) => {
  try {
    const q = req.query as Record<string, string>;
    const parent = q.parent || null;
    const where = parent ? `WHERE "parentCategory"=$1 AND "isActive"=true` : `WHERE "isActive"=true`;
    const params = parent ? [parent] : [];
    const categories = await sql(
      `SELECT * FROM "SubCategory" ${where} ORDER BY "parentCategory", "sortOrder"`, params
    );

    const grouped: Record<string, unknown[]> = {};
    for (const c of categories) {
      const key = (c as any).parentCategory;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    }

    return res.status(200).json(new ApiResponse(200, { categories, grouped }, "Sub-categories retrieved"));
  } catch (e) {
    logger.error("getSubCategories: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};

export const createSubCategory: H = async (req, res, next) => {
  try {
    if (!req.user?.id || req.user.role !== "ADMIN") return next(new ApiError(403, "Admin only"));
    const b = req.body as Record<string, unknown>;
    const slug = String(b.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const cat = await sqlOne(
      `INSERT INTO "SubCategory" ("parentCategory","name","slug","description","iconName","sortOrder","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
      [String(b.parentCategory), String(b.name), slug, b.description || null, b.iconName || null, Number(b.sortOrder || 0)]
    );
    return res.status(201).json(new ApiResponse(201, cat, "Sub-category created"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("createSubCategory: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};
