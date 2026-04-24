import { sql, sqlOne, sqlCount } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const createPost: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;
    const post = await sqlOne(
      `INSERT INTO "CommunityPost" ("authorId","type","title","content","tags","mediaUrl","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING *`,
      [req.user.id, b.type || "DISCUSSION", String(b.title), b.content || null,
       (b.tags as string[]) || [], b.mediaUrl || null]
    );
    return res.status(201).json(new ApiResponse(201, post, "Post created"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("createPost: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to create post"));
  }
};

export const getPosts: H = async (req, res, next) => {
  try {
    const q = req.query as Record<string, string>;
    const type = q.type || null;
    const page = parseInt(q.page || "1", 10);
    const limit = Math.min(parseInt(q.limit || "20", 10), 50);
    const offset = (page - 1) * limit;

    const where = type ? `WHERE p.type=$1` : "";
    const params: unknown[] = type ? [type, limit, offset] : [limit, offset];

    const posts = await sql(
      `SELECT p.*, u."firstname", u."lastname", u."profilePicture"
       FROM "CommunityPost" p JOIN "User" u ON u.id=p."authorId"
       ${where} ORDER BY p."isPinned" DESC, p."createdAt" DESC
       LIMIT $${type ? 2 : 1} OFFSET $${type ? 3 : 2}`,
      params
    );
    const total = await sqlCount(
      `SELECT COUNT(*)::int AS count FROM "CommunityPost" ${type ? `WHERE type=$1` : ""}`,
      type ? [type] : []
    );
    return res.status(200).json(new ApiResponse(200, { posts, total, page, limit }, "Posts retrieved"));
  } catch (e) {
    logger.error("getPosts: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get posts"));
  }
};

export const getPost: H = async (req, res, next) => {
  try {
    const { postId } = req.params as Record<string, string>;
    const post = await sqlOne(
      `SELECT p.*, u."firstname", u."lastname", u."profilePicture"
       FROM "CommunityPost" p JOIN "User" u ON u.id=p."authorId" WHERE p.id=$1`,
      [parseInt(postId, 10)]
    );
    if (!post) return next(new ApiError(404, "Post not found"));
    await sql(`UPDATE "CommunityPost" SET "viewsCount"="viewsCount"+1 WHERE id=$1`, [parseInt(postId, 10)]);

    const comments = await sql(
      `SELECT c.*, u."firstname", u."lastname", u."profilePicture"
       FROM "CommunityComment" c JOIN "User" u ON u.id=c."authorId"
       WHERE c."postId"=$1 ORDER BY c."createdAt" ASC
       LIMIT 100`,
      [parseInt(postId, 10)]
    );
    return res.status(200).json(new ApiResponse(200, { ...post, comments }, "Post retrieved"));
  } catch (e) {
    logger.error("getPost: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};

export const addComment: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { postId } = req.params as Record<string, string>;
    const b = req.body as Record<string, unknown>;
    const comment = await sqlOne(
      `INSERT INTO "CommunityComment" ("postId","authorId","content","parentId","createdAt")
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [parseInt(postId, 10), req.user.id, String(b.content), b.parentId ? parseInt(String(b.parentId), 10) : null]
    );
    await sql(`UPDATE "CommunityPost" SET "commentsCount"="commentsCount"+1 WHERE id=$1`, [parseInt(postId, 10)]);
    return res.status(201).json(new ApiResponse(201, comment, "Comment added"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("addComment: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};

export const toggleLike: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { postId } = req.params as Record<string, string>;
    const pid = parseInt(postId, 10);
    const existing = await sqlOne(
      `SELECT id FROM "CommunityLike" WHERE "userId"=$1 AND "postId"=$2`, [req.user.id, pid]
    );
    if (existing) {
      await sql(`DELETE FROM "CommunityLike" WHERE id=$1`, [existing.id]);
      await sql(`UPDATE "CommunityPost" SET "likesCount"=GREATEST("likesCount"-1,0) WHERE id=$1`, [pid]);
      return res.status(200).json(new ApiResponse(200, { liked: false }, "Unliked"));
    } else {
      await sql(`INSERT INTO "CommunityLike" ("userId","postId","createdAt") VALUES ($1,$2,NOW())`, [req.user.id, pid]);
      await sql(`UPDATE "CommunityPost" SET "likesCount"="likesCount"+1 WHERE id=$1`, [pid]);
      return res.status(200).json(new ApiResponse(200, { liked: true }, "Liked"));
    }
  } catch (e) {
    logger.error("toggleLike: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};

export const getCommunityStats: H = async (req, res, next) => {
  try {
    const stats = await sqlOne(`
      SELECT
        (SELECT COUNT(*) FROM "CommunityPost" WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS "postsThisWeek",
        (SELECT COUNT(*) FROM "CommunityPost" WHERE type='SHOWCASE')::int AS "totalShowcases",
        (SELECT COUNT(*) FROM "CommunityComment" WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS "commentsThisWeek",
        (SELECT COUNT(DISTINCT "authorId") FROM "CommunityPost" WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS "activeMembers"
    `, []);
    return res.status(200).json(new ApiResponse(200, stats, "Community stats"));
  } catch (e) {
    logger.error("getCommunityStats: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};
