import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 300);
}

export const createBlogPost: H = async (req, res, next) => {
  try {
    if (!req.user?.id || req.user.role !== "ADMIN") return next(new ApiError(403, "Admin only"));
    const b = req.body as Record<string, unknown>;
    const slug = slugify(String(b.title)) + "-" + Date.now().toString(36);
    const readTime = Math.max(1, Math.ceil(String(b.content || "").split(/\s+/).length / 200));

    const post = await sqlOne(
      `INSERT INTO "BlogPost" ("authorId","title","slug","excerpt","content","coverImageUrl","category","tags","status","readTimeMinutes","isFeatured","publishedAt","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) RETURNING *`,
      [req.user.id, String(b.title), slug, b.excerpt || null, String(b.content),
       b.coverImageUrl || null, String(b.category), (b.tags as string[]) || [],
       b.status || "DRAFT", readTime, b.isFeatured || false,
       b.status === "PUBLISHED" ? new Date() : null]
    );
    return res.status(201).json(new ApiResponse(201, post, "Blog post created"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("createBlogPost: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};

export const getPublishedPosts: H = async (req, res, next) => {
  try {
    const q = req.query as Record<string, string>;
    const category = q.category || null;
    const conditions = [`status='PUBLISHED'`];
    const params: unknown[] = [];
    let idx = 1;
    if (category) { conditions.push(`category=$${idx++}`); params.push(category); }

    const posts = await sql(
      `SELECT bp.*, u."firstname" AS "authorFirst", u."lastname" AS "authorLast", u."profilePicture" AS "authorAvatar"
       FROM "BlogPost" bp JOIN "User" u ON u.id=bp."authorId"
       WHERE ${conditions.join(" AND ")}
       ORDER BY "isFeatured" DESC, "publishedAt" DESC LIMIT 50`,
      params
    );
    return res.status(200).json(new ApiResponse(200, posts, "Blog posts"));
  } catch (e) {
    logger.error("getPublishedPosts: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};

export const getBlogPost: H = async (req, res, next) => {
  try {
    const { slug } = req.params as Record<string, string>;
    const post = await sqlOne(
      `SELECT bp.*, u."firstname" AS "authorFirst", u."lastname" AS "authorLast", u."profilePicture" AS "authorAvatar"
       FROM "BlogPost" bp JOIN "User" u ON u.id=bp."authorId"
       WHERE bp.slug=$1 AND bp.status='PUBLISHED'`,
      [slug]
    );
    if (!post) return next(new ApiError(404, "Post not found"));
    await sql(`UPDATE "BlogPost" SET "viewCount"="viewCount"+1 WHERE id=$1`, [post.id]);
    return res.status(200).json(new ApiResponse(200, post, "Post retrieved"));
  } catch (e) {
    logger.error("getBlogPost: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};

export const updateBlogPost: H = async (req, res, next) => {
  try {
    if (!req.user?.id || req.user.role !== "ADMIN") return next(new ApiError(403, "Admin only"));
    const { postId } = req.params as Record<string, string>;
    const b = req.body as Record<string, unknown>;
    const fields: string[] = [];
    const vals: unknown[] = [];
    let i = 1;

    for (const key of ["title", "excerpt", "content", "coverImageUrl", "category", "status", "isFeatured"] as const) {
      if (b[key] !== undefined) { fields.push(`"${key}"=$${i++}`); vals.push(b[key]); }
    }
    if (b.tags !== undefined) { fields.push(`tags=$${i++}`); vals.push(b.tags); }
    if (b.status === "PUBLISHED") { fields.push(`"publishedAt"=COALESCE("publishedAt",NOW())`); }
    if (fields.length === 0) return next(new ApiError(400, "Nothing to update"));
    fields.push(`"updatedAt"=NOW()`);
    vals.push(parseInt(postId, 10));

    const updated = await sqlOne(`UPDATE "BlogPost" SET ${fields.join(",")} WHERE id=$${i} RETURNING *`, vals);
    return res.status(200).json(new ApiResponse(200, updated, "Updated"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("updateBlogPost: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};
