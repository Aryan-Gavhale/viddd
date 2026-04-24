import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const autoGenerateReel: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));

    const portfolioVideos = await sql(
      `SELECT id, "videoUrl", title, description FROM "PortfolioVideo" WHERE freelancer_id =
        (SELECT id FROM "FreelancerProfile" WHERE user_id=$1)
       ORDER BY "uploadedAt" DESC LIMIT 10`,
      [req.user.id]
    );

    const completedDeliverables = await sql(
      `SELECT DISTINCT o.id AS "orderId", g.title AS "gigTitle", g.category
       FROM "Order" o JOIN "Gig" g ON g.id=o."gigId"
       WHERE o."freelancerId"=$1 AND o.status='COMPLETED'
       ORDER BY o."completedAt" DESC LIMIT 10`,
      [req.user.id]
    );

    const clips = portfolioVideos.map((v: any, i: number) => ({
      type: "portfolio", sourceId: v.id, videoUrl: v.videoUrl,
      title: v.title || `Clip ${i + 1}`, description: v.description || "",
      order: i, included: true,
    }));

    const b = req.body as Record<string, unknown>;
    const reel = await sqlOne(
      `INSERT INTO "DemoReel" ("userId","title","description","status","clips","isPublic","createdAt","updatedAt")
       VALUES ($1,$2,$3,'DRAFT',$4,false,NOW(),NOW()) RETURNING *`,
      [req.user.id, b.title || "My Demo Reel", b.description || "", JSON.stringify(clips)]
    );

    return res.status(201).json(new ApiResponse(201, {
      reel, availableClips: clips,
      completedProjects: completedDeliverables,
    }, "Reel auto-generated from your portfolio"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("autoGenerateReel: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to generate reel"));
  }
};

export const updateReel: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { reelId } = req.params as Record<string, string>;
    const reel = await sqlOne(`SELECT * FROM "DemoReel" WHERE id=$1`, [parseInt(reelId, 10)]);
    if (!reel) return next(new ApiError(404, "Reel not found"));
    if (reel.userId !== req.user.id) return next(new ApiError(403, "Forbidden"));

    const b = req.body as Record<string, unknown>;
    const fields: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (b.title !== undefined) { fields.push(`"title"=$${idx++}`); vals.push(String(b.title)); }
    if (b.description !== undefined) { fields.push(`"description"=$${idx++}`); vals.push(String(b.description)); }
    if (b.clips !== undefined) { fields.push(`"clips"=$${idx++}`); vals.push(JSON.stringify(b.clips)); }
    if (b.isPublic !== undefined) { fields.push(`"isPublic"=$${idx++}`); vals.push(Boolean(b.isPublic)); }
    if (b.status !== undefined) { fields.push(`"status"=$${idx++}`); vals.push(String(b.status)); }
    if (b.totalDuration !== undefined) { fields.push(`"totalDuration"=$${idx++}`); vals.push(Number(b.totalDuration)); }
    if (b.thumbnailUrl !== undefined) { fields.push(`"thumbnailUrl"=$${idx++}`); vals.push(String(b.thumbnailUrl)); }

    if (fields.length === 0) return next(new ApiError(400, "Nothing to update"));
    fields.push(`"updatedAt"=NOW()`);
    vals.push(parseInt(reelId, 10));

    const updated = await sqlOne(
      `UPDATE "DemoReel" SET ${fields.join(",")} WHERE id=$${idx} RETURNING *`, vals
    );
    return res.status(200).json(new ApiResponse(200, updated, "Reel updated"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("updateReel: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to update reel"));
  }
};

export const getMyReels: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const reels = await sql(
      `SELECT * FROM "DemoReel" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 50`,
      [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, reels, "Your reels"));
  } catch (e) {
    logger.error("getMyReels: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get reels"));
  }
};

export const getPublicReel: H = async (req, res, next) => {
  try {
    const { reelId } = req.params as Record<string, string>;
    const reel = await sqlOne(
      `SELECT r.*, u."firstname", u."lastname", u."profilePicture"
       FROM "DemoReel" r JOIN "User" u ON u.id=r."userId"
       WHERE r.id=$1 AND r."isPublic"=true`, [parseInt(reelId, 10)]
    );
    if (!reel) return next(new ApiError(404, "Reel not found or private"));
    await sql(`UPDATE "DemoReel" SET "viewCount"="viewCount"+1 WHERE id=$1`, [parseInt(reelId, 10)]);
    return res.status(200).json(new ApiResponse(200, reel, "Reel retrieved"));
  } catch (e) {
    logger.error("getPublicReel: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get reel"));
  }
};

export const getUserReels: H = async (req, res, next) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const reels = await sql(
      `SELECT id, title, description, "thumbnailUrl", "totalDuration", "viewCount", "createdAt"
       FROM "DemoReel" WHERE "userId"=$1 AND "isPublic"=true ORDER BY "createdAt" DESC LIMIT 50`,
      [parseInt(userId, 10)]
    );
    return res.status(200).json(new ApiResponse(200, reels, "User reels"));
  } catch (e) {
    logger.error("getUserReels: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get reels"));
  }
};

export const deleteReel: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { reelId } = req.params as Record<string, string>;
    const reel = await sqlOne(`SELECT * FROM "DemoReel" WHERE id=$1`, [parseInt(reelId, 10)]);
    if (!reel) return next(new ApiError(404, "Not found"));
    if (reel.userId !== req.user.id) return next(new ApiError(403, "Forbidden"));
    await sql(`DELETE FROM "DemoReel" WHERE id=$1`, [parseInt(reelId, 10)]);
    return res.status(200).json(new ApiResponse(200, null, "Reel deleted"));
  } catch (e) {
    logger.error("deleteReel: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to delete reel"));
  }
};
