import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const generateThumbnails: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));

    const videos = await sql(
      `SELECT pv.id, pv."videoUrl", pv."thumbnailUrl"
       FROM "PortfolioVideo" pv
       INNER JOIN "FreelancerProfile" fp ON fp.id = pv.freelancer_id
       WHERE fp.user_id = $1 AND (pv."thumbnailUrl" IS NULL OR pv."thumbnailUrl" = '')
       ORDER BY pv."uploadedAt" DESC NULLS LAST
       LIMIT 20`,
      [req.user.id]
    );

    if ((videos as unknown[]).length === 0) {
      return res.status(200).json(new ApiResponse(200, { updated: 0 }, "All videos already have thumbnails"));
    }

    let updated = 0;
    for (const video of videos) {
      const v = video as Record<string, unknown>;
      const videoUrl = String(v.videoUrl || "");
      if (!videoUrl) continue;

      let thumbUrl = "";
      if (videoUrl.includes("amazonaws.com")) {
        const key = videoUrl.split(".com/")[1] || "";
        const thumbKey = key.replace(/\.[^.]+$/, "_thumb.jpg");
        thumbUrl = videoUrl.split(".com/")[0] + ".com/" + thumbKey;
      } else {
        const hash = String(v.id).padStart(6, "0");
        thumbUrl = `https://img.youtube.com/vi/placeholder/maxresdefault.jpg?v=${hash}`;
      }

      await sqlOne(
        `UPDATE "PortfolioVideo" SET "thumbnailUrl" = $1 WHERE id = $2 RETURNING id`,
        [thumbUrl, v.id]
      );
      updated++;
    }

    return res.status(200).json(new ApiResponse(200, { updated }, `Generated ${updated} thumbnails`));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("generateThumbnails: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to generate thumbnails"));
  }
};

export const getPortfolioWithThumbnails: H = async (req, res, next) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const uid = parseInt(userId, 10);
    if (Number.isNaN(uid) || uid < 1) {
      return next(new ApiError(400, "Invalid user id"));
    }

    const videos = await sql(
      `SELECT pv.id, pv."videoUrl", pv."thumbnailUrl", pv.title, pv.description, pv.category,
              pv.views AS "viewCount", pv."uploadedAt" AS "createdAt"
       FROM "PortfolioVideo" pv
       INNER JOIN "FreelancerProfile" fp ON fp.id = pv.freelancer_id
       WHERE fp.user_id = $1
       ORDER BY pv."uploadedAt" DESC NULLS LAST
       LIMIT 50`,
      [uid]
    );

    const withThumbs = (videos as Record<string, unknown>[]).map((v) => ({
      ...v,
      thumbnailUrl: v.thumbnailUrl || generatePlaceholderThumb(v),
    }));

    return res.status(200).json(new ApiResponse(200, withThumbs, "Portfolio retrieved"));
  } catch (e) {
    logger.error("getPortfolioWithThumbnails: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get portfolio"));
  }
};

function generatePlaceholderThumb(video: Record<string, unknown>): string {
  const colors = ["4F46E5", "7C3AED", "EC4899", "F59E0B", "10B981", "3B82F6"];
  const idx = (Number(video.id) || 0) % colors.length;
  const title = encodeURIComponent(String(video.title || "Video").substring(0, 20));
  return `https://via.placeholder.com/640x360/${colors[idx]}/FFFFFF?text=${title}`;
}
