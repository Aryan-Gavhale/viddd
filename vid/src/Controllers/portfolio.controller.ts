import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount } from "../db.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { DbRow } from "../types/index.js";

type ControllerHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

type FreelancerInfo = {
  id: number;
  userId: number;
  name: string;
  profilePicture: string | null;
};

type PortfolioVideoWithFreelancer = {
  id: number;
  freelancerId: number;
  videoUrl: string;
  title: string | null;
  description: string | null;
  uploadedAt: unknown;
  views: number;
  category: string;
  freelancer: FreelancerInfo;
};

const videoJoinSelect = `
  pv."id", pv."freelancer_id", pv."videoUrl", pv."title", pv."description",
  pv."uploadedAt", pv."views", pv."category",
  u."id" as "u_id", u."firstname", u."lastname", u."profilePicture" as "u_pp"
`;

function mapRowToVideoWithFreelancer(r: DbRow): PortfolioVideoWithFreelancer {
  const fn = String(r.firstname ?? "");
  const ln = String(r.lastname ?? "");
  const name = `${fn} ${ln}`.trim() || "Freelancer";
  return {
    id: r.id as number,
    freelancerId: (r.freelancer_id as number) || (r.freelancerId as number),
    videoUrl: String(r.videoUrl ?? ""),
    title: (r.title as string) ?? null,
    description: (r.description as string) ?? null,
    uploadedAt: r.uploadedAt,
    views: Number(r.views ?? 0),
    category: (r.category as string) || "Uncategorized",
    freelancer: {
      id: (r.freelancer_id as number) || 0,
      userId: r.u_id as number,
      name,
      profilePicture: (r.u_pp as string) ?? null,
    },
  };
}

const getPortfolioStats: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;

    const freelancer = (await sqlOne(
      `SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!freelancer) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    const videos = (await sql(
      `SELECT * FROM "PortfolioVideo" WHERE "freelancer_id" = $1 ORDER BY "uploadedAt" DESC NULLS LAST`,
      [freelancer.id as number]
    )) as DbRow[];

    const totalViews = videos.reduce((sum, video) => sum + Number(video.views ?? 0), 0);
    const popular = videos.slice(0, 3).map((video) => ({
      id: video.id,
      title: (video.title as string) || "Untitled",
      views: Number(video.views ?? 0),
      category: (video.category as string) || "Uncategorized",
      videoUrl: video.videoUrl,
    }));

    const videosList = videos.map((video) => ({
      id: video.id,
      title: (video.title as string) || "Untitled",
      description: video.description ?? null,
      views: Number(video.views ?? 0),
      category: (video.category as string) || "Uncategorized",
      videoUrl: String(video.videoUrl ?? ""),
      uploadedAt: video.uploadedAt,
    }));

    const metrics = [
      { id: 1, name: "Total Views", value: totalViews.toString(), percentage: 100, trend: "up" as const },
      {
        id: 2,
        name: "Portfolio Items",
        value: videos.length.toString(),
        percentage: Math.min(videos.length * 10, 100),
        trend: "up" as const,
      },
    ];

    const portfolioStats = { popular, metrics, videos: videosList };
    return res.status(200).json(new ApiResponse(200, portfolioStats, "Portfolio stats retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving portfolio stats: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve portfolio stats"));
  }
};

const getFeaturedPortfolios: ControllerHandler = async (_req, res, next) => {
  try {
    const rows = (await sql(
      `SELECT ${videoJoinSelect}
       FROM "PortfolioVideo" pv
       INNER JOIN "FreelancerProfile" fp ON pv."freelancer_id" = fp."id"
       INNER JOIN "User" u ON fp."user_id" = u."id"
       WHERE u."isActive" = true
       ORDER BY pv."views" DESC NULLS LAST, pv."uploadedAt" DESC NULLS LAST
       LIMIT 12`,
      []
    )) as DbRow[];

    const videos: PortfolioVideoWithFreelancer[] = rows.map((r) => mapRowToVideoWithFreelancer(r));
    return res.status(200).json(new ApiResponse(200, { videos }, "Featured portfolio videos retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving featured portfolios: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve featured portfolio videos"));
  }
};

const getPortfolioByFreelancerId: ControllerHandler = async (req, res, next) => {
  try {
    const { freelancerId } = req.params as Record<string, string>;
    const fpId = parseInt(freelancerId, 10);
    if (Number.isNaN(fpId) || fpId < 1) {
      return next(new ApiError(400, "Invalid freelancer id"));
    }

    const q = req.query as Record<string, string | string[] | undefined>;
    const page = Math.max(1, parseInt(String(Array.isArray(q.page) ? q.page[0] : q.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(Array.isArray(q.limit) ? q.limit[0] : q.limit || "12"), 10) || 12));
    const offset = (page - 1) * limit;
    const categoryRaw = Array.isArray(q.category) ? q.category[0] : q.category;
    const category = categoryRaw != null ? String(categoryRaw).trim() : "";

    let count: number;
    if (category !== "") {
      count = await sqlCount(
        `SELECT COUNT(*)::int AS count
         FROM "PortfolioVideo" pv
         WHERE pv."freelancer_id" = $1 AND pv."category" = $2`,
        [fpId, category]
      );
    } else {
      count = await sqlCount(
        `SELECT COUNT(*)::int AS count
         FROM "PortfolioVideo" pv
         WHERE pv."freelancer_id" = $1`,
        [fpId]
      );
    }

    const rows: DbRow[] = category !== ""
      ? (await sql(
          `SELECT ${videoJoinSelect}
           FROM "PortfolioVideo" pv
           INNER JOIN "FreelancerProfile" fp ON pv."freelancer_id" = fp."id"
           INNER JOIN "User" u ON fp."user_id" = u."id"
           WHERE pv."freelancer_id" = $1 AND pv."category" = $2
           ORDER BY pv."uploadedAt" DESC NULLS LAST
           LIMIT $3 OFFSET $4`,
          [fpId, category, limit, offset]
        )) as DbRow[]
      : (await sql(
          `SELECT ${videoJoinSelect}
           FROM "PortfolioVideo" pv
           INNER JOIN "FreelancerProfile" fp ON pv."freelancer_id" = fp."id"
           INNER JOIN "User" u ON fp."user_id" = u."id"
           WHERE pv."freelancer_id" = $1
           ORDER BY pv."uploadedAt" DESC NULLS LAST
           LIMIT $2 OFFSET $3`,
          [fpId, limit, offset]
        )) as DbRow[];

    const videos: PortfolioVideoWithFreelancer[] = rows.map((r) => mapRowToVideoWithFreelancer(r));
    const totalPages = count === 0 ? 0 : Math.max(1, Math.ceil(count / limit));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          videos,
          pagination: { page, limit, total: count, totalPages },
        },
        "Portfolio videos retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving portfolio by freelancer: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve portfolio videos"));
  }
};

const getPortfolioVideoById: ControllerHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params as Record<string, string>;
    const id = parseInt(videoId, 10);
    if (Number.isNaN(id) || id < 1) {
      return next(new ApiError(400, "Invalid video id"));
    }

    const row = (await sqlOne(
      `SELECT ${videoJoinSelect}
       FROM "PortfolioVideo" pv
       INNER JOIN "FreelancerProfile" fp ON pv."freelancer_id" = fp."id"
       INNER JOIN "User" u ON fp."user_id" = u."id"
       WHERE pv."id" = $1 AND u."isActive" = true`,
      [id]
    )) as DbRow | null;

    if (!row) {
      return next(new ApiError(404, "Portfolio video not found"));
    }

    const updated = (await sqlOne(
      `UPDATE "PortfolioVideo" SET "views" = COALESCE("views", 0) + 1 WHERE "id" = $1
       RETURNING "views"`,
      [id]
    )) as DbRow | null;
    const newViews = updated ? Number(updated.views ?? 0) : Number(row.views ?? 0) + 1;
    const rowOut = { ...row, views: newViews } as DbRow;

    const video = mapRowToVideoWithFreelancer(rowOut);
    return res.status(200).json(new ApiResponse(200, video, "Portfolio video retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving portfolio video: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve portfolio video"));
  }
};

const addPortfolioVideo: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const videoUrl = body.videoUrl;
    const title = body.title;
    const description = body.description;
    const category = body.category;

    if (videoUrl == null || String(videoUrl).trim() === "") {
      return next(new ApiError(400, "Video URL is required"));
    }

    const freelancerProfile = (await sqlOne(
      `SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!freelancerProfile) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    const cat =
      category != null && String(category).trim() !== "" ? String(category).trim() : null;
    const portfolioVideo = (await sqlOne(
      `INSERT INTO "PortfolioVideo" ("freelancer_id", "videoUrl", "title", "description", "category")
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        freelancerProfile.id as number,
        String(videoUrl),
        title != null && String(title) !== "" ? String(title) : null,
        description != null && String(description) !== "" ? String(description) : null,
        cat,
      ]
    )) as DbRow | null;

    return res.status(201).json(new ApiResponse(201, portfolioVideo, "Portfolio video added successfully"));
  } catch (error) {
    logger.error("Error adding portfolio video: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to add portfolio video"));
  }
};

const updatePortfolioVideo: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { videoId } = req.params as Record<string, string>;
    const body = req.body as Record<string, unknown>;
    const { title, description, category } = body;

    const vid = parseInt(videoId, 10);
    if (Number.isNaN(vid) || vid < 1) {
      return next(new ApiError(400, "Invalid video id"));
    }

    const freelancerProfile = (await sqlOne(
      `SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!freelancerProfile) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    const portfolioVideo = (await sqlOne(
      `SELECT * FROM "PortfolioVideo" WHERE "id" = $1`,
      [vid]
    )) as DbRow | null;
    if (!portfolioVideo || Number(portfolioVideo.freelancer_id) !== Number(freelancerProfile.id)) {
      return next(new ApiError(404, "Portfolio video not found or you don't own it"));
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;

    if (Object.keys(updateData).length === 0) {
      return next(new ApiError(400, "No valid fields provided for update"));
    }

    const setClauses: string[] = [];
    const vals: unknown[] = [];
    let n = 1;
    for (const [k, v] of Object.entries(updateData)) {
      setClauses.push(`"${k}" = $${n++}`);
      vals.push(v);
    }
    vals.push(vid);

    const updatedVideo = (await sqlOne(
      `UPDATE "PortfolioVideo" SET ${setClauses.join(", ")} WHERE "id" = $${n} RETURNING *`,
      vals
    )) as DbRow | null;

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Portfolio video updated successfully"));
  } catch (error) {
    logger.error("Error updating portfolio video: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to update portfolio video"));
  }
};

const deletePortfolioVideo: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { videoId } = req.params as Record<string, string>;
    const vid = parseInt(videoId, 10);
    if (Number.isNaN(vid) || vid < 1) {
      return next(new ApiError(400, "Invalid video id"));
    }

    const freelancerProfile = (await sqlOne(
      `SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!freelancerProfile) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    const portfolioVideo = (await sqlOne(
      `SELECT * FROM "PortfolioVideo" WHERE "id" = $1`,
      [vid]
    )) as DbRow | null;
    if (!portfolioVideo || Number(portfolioVideo.freelancer_id) !== Number(freelancerProfile.id)) {
      return next(new ApiError(404, "Portfolio video not found or you don't own it"));
    }

    await sql(`DELETE FROM "PortfolioVideo" WHERE "id" = $1`, [vid]);

    return res.status(200).json(new ApiResponse(200, null, "Portfolio video deleted successfully"));
  } catch (error) {
    logger.error("Error deleting portfolio video: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete portfolio video"));
  }
};

export {
  getPortfolioStats,
  getFeaturedPortfolios,
  getPortfolioByFreelancerId,
  getPortfolioVideoById,
  addPortfolioVideo,
  updatePortfolioVideo,
  deletePortfolioVideo,
};
