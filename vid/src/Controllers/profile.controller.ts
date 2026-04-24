// src/controllers/profileController.js
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne } from "../db.js";
import logger from "../Utils/logger.js";
import type {
  ExpressRequest,
  ExpressResponse,
  NextFunction,
  DbRow,
  FreelancerProfileRow,
} from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

const createFreelancerProfile: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const city = body.city;
    const state = body.state;
    const pinCode = body.pinCode;
    const jobTitle = body.jobTitle;
    const overview = body.overview;
    const skills = body.skills;
    const tools = body.tools;
    const equipmentCameras = body.equipmentCameras;
    const equipmentLenses = body.equipmentLenses;
    const equipmentLighting = body.equipmentLighting;
    const equipmentOther = body.equipmentOther;
    const certifications = body.certifications;
    const minimumRate = body.minimumRate;
    const maximumRate = body.maximumRate;
    const availabilityStatus = body.availabilityStatus;
    const weeklyHours = body.weeklyHours;

    const skillsOk =
      skills != null &&
      (Array.isArray(skills) ? skills.length > 0 : String(skills).trim() !== "");
    if (!jobTitle || !overview || !skillsOk) {
      return next(new ApiError(400, "Missing required fields: jobTitle, overview, and skills are mandatory"));
    }

    if (
      minimumRate !== undefined &&
      maximumRate !== undefined &&
      (parseFloat(String(minimumRate)) < 0 || parseFloat(String(maximumRate)) < parseFloat(String(minimumRate)))
    ) {
      return next(new ApiError(400, "Invalid rate values. Ensure minimumRate is positive and less than maximumRate"));
    }

    const existingProfile = await sqlOne(
      `SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    );
    if (existingProfile) {
      return next(new ApiError(400, "A freelancer profile already exists for this user"));
    }

    const skillsArr: unknown[] = Array.isArray(skills) ? skills : [skills];
    const toolsArr: unknown[] = Array.isArray(tools) ? tools : tools ? [tools] : [];

    const created = (await sqlOne(
      `INSERT INTO "FreelancerProfile" (
        "user_id", "city", "state", "pinCode", "jobTitle", "overview", "skills", "tools",
        "equipmentCameras", "equipmentLenses", "equipmentLighting", "equipmentOther", "certifications",
        "minimumRate", "maximumRate", "availabilityStatus", "weeklyHours"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::text[], $8::text[], $9, $10, $11, $12, $13::text[],
        $14, $15, $16, $17
      )
      RETURNING *`,
      [
        userId,
        city ?? null,
        state ?? null,
        pinCode ?? null,
        jobTitle,
        overview,
        skillsArr,
        toolsArr,
        equipmentCameras ?? null,
        equipmentLenses ?? null,
        equipmentLighting ?? null,
        equipmentOther ?? null,
        certifications ?? [],
        minimumRate != null && minimumRate !== "" ? parseFloat(String(minimumRate)) : null,
        maximumRate != null && maximumRate !== "" ? parseFloat(String(maximumRate)) : null,
        (availabilityStatus as string) || "UNAVAILABLE",
        weeklyHours != null && weeklyHours !== "" ? parseInt(String(weeklyHours), 10) : null,
      ]
    )) as (FreelancerProfileRow & DbRow) | null;

    const userBits = (await sqlOne(
      `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
      [userId]
    )) as DbRow | null;
    const c = created as DbRow;
    const { user_id, ...rrest } = c;
    const freelancerProfile = { ...rrest, userId: user_id, user: userBits };

    return res.status(201).json(new ApiResponse(201, freelancerProfile, "Freelancer profile created successfully"));
  } catch (error) {
    logger.error("Error creating freelancer profile: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to create freelancer profile"));
  }
};

const updateFreelancerProfile: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const {
      city, state, pinCode, jobTitle, overview, skills, tools,
      equipmentCameras, equipmentLenses, equipmentLighting, equipmentOther, certifications,
      minimumRate, maximumRate, availabilityStatus, weeklyHours,
    } = body;

    const existingProfile = (await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as (FreelancerProfileRow & DbRow) | null;
    if (!existingProfile) {
      return next(new ApiError(404, "Freelancer profile not found for this user"));
    }

    if (
      minimumRate !== undefined &&
      maximumRate !== undefined &&
      (parseFloat(String(minimumRate)) < 0 || parseFloat(String(maximumRate)) < parseFloat(String(minimumRate)))
    ) {
      return next(new ApiError(400, "Invalid rate values. Ensure minimumRate is positive and less than maximumRate"));
    }

    const updateData: Record<string, unknown> = {};
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (pinCode !== undefined) updateData.pinCode = pinCode;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (overview !== undefined) updateData.overview = overview;
    if (skills !== undefined) updateData.skills = Array.isArray(skills) ? skills : [skills];
    if (tools !== undefined) updateData.tools = Array.isArray(tools) ? tools : tools ? [tools] : [];
    if (equipmentCameras !== undefined) updateData.equipmentCameras = equipmentCameras;
    if (equipmentLenses !== undefined) updateData.equipmentLenses = equipmentLenses;
    if (equipmentLighting !== undefined) updateData.equipmentLighting = equipmentLighting;
    if (equipmentOther !== undefined) updateData.equipmentOther = equipmentOther;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (minimumRate !== undefined) updateData.minimumRate = parseFloat(String(minimumRate));
    if (maximumRate !== undefined) updateData.maximumRate = parseFloat(String(maximumRate));
    if (availabilityStatus) updateData.availabilityStatus = availabilityStatus;
    if (weeklyHours !== undefined) updateData.weeklyHours = parseInt(String(weeklyHours), 10);

    if (Object.keys(updateData).length === 0) {
      return next(new ApiError(400, "No valid fields provided for update"));
    }

    const setClauses: string[] = [];
    const vals: unknown[] = [];
    let n = 1;
    for (const [k, v] of Object.entries(updateData)) {
      if (k === "skills" || k === "tools" || k === "certifications") {
        setClauses.push(`"${k}" = $${n}::text[]`);
        vals.push(v);
      } else {
        setClauses.push(`"${k}" = $${n}`);
        vals.push(v);
      }
      n += 1;
    }
    const userParam = n;
    vals.push(userId);

    const updated = (await sqlOne(
      `UPDATE "FreelancerProfile" SET ${setClauses.join(", ")} WHERE "user_id" = $${userParam} RETURNING *`,
      vals
    )) as (FreelancerProfileRow & DbRow) | null;

    const userBits = (await sqlOne(
      `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!updated) {
      return next(new ApiError(500, "Update failed"));
    }
    const u = updated as DbRow;
    const { user_id: u_id, ...rrest } = u;
    const updatedProfile = { ...rrest, userId: u_id, user: userBits };

    return res.status(200).json(new ApiResponse(200, updatedProfile, "Freelancer profile updated successfully"));
  } catch (error) {
    logger.error("Error updating freelancer profile: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to update freelancer profile"));
  }
};

const getFreelancerProfile: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;

    const fp = (await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as (FreelancerProfileRow & DbRow) | null;

    if (!fp) {
      return next(new ApiError(404, "Freelancer profile not found for this user"));
    }

    const [user, portfolioVideos, gigRows, reviewRows] = await Promise.all([
      sqlOne(
        `SELECT "firstname", "lastname", "email", "country" FROM "User" WHERE "id" = $1`,
        [userId]
      ) as Promise<DbRow | null>,
      sql(
        `SELECT * FROM "PortfolioVideo" WHERE "freelancer_id" = $1 ORDER BY "uploadedAt" DESC`,
        [fp.id]
      ),
      sql(
        `SELECT "id", "title", "status" FROM "Gig" WHERE "freelancer_id" = $1 AND "deletedAt" IS NULL`,
        [fp.id]
      ),
      sql(
        `SELECT * FROM "Review" WHERE "freelancer_id" = $1 ORDER BY "createdAt" DESC LIMIT 5`,
        [fp.id]
      ),
    ]);

    const { user_id, ...fpRest } = fp as DbRow;
    const freelancerProfile = { ...fpRest, userId: user_id, user, portfolioVideos, gigs: gigRows, reviewsReceived: reviewRows };

    return res.status(200).json(new ApiResponse(200, freelancerProfile, "Freelancer profile retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving freelancer profile: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve freelancer profile"));
  }
};

const deleteFreelancerProfile: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;

    const freelancerProfile = await sqlOne(
      `SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    );

    if (!freelancerProfile) {
      return next(new ApiError(404, "Freelancer profile not found for this user"));
    }

    await sql(`DELETE FROM "FreelancerProfile" WHERE "user_id" = $1`, [userId]);

    return res.status(200).json(new ApiResponse(200, null, "Freelancer profile deleted successfully"));
  } catch (error) {
    logger.error("Error deleting freelancer profile: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete freelancer profile"));
  }
};

const addPortfolioVideo: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const videoUrl = body.videoUrl;
    const title = body.title;
    const description = body.description;

    if (videoUrl == null || String(videoUrl).trim() === "") {
      return next(new ApiError(400, "Video URL is required"));
    }

    const freelancerProfile = (await sqlOne(
      `SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!freelancerProfile) {
      return next(new ApiError(404, "Freelancer profile not found for this user"));
    }

    const fileUrl = req.fileUrl ?? (typeof body.profilePicture === "string" ? body.profilePicture : undefined);
    const portfolioVideo = await sqlOne(
      `INSERT INTO "PortfolioVideo" ("freelancer_id", "videoUrl", "title", "description")
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [freelancerProfile.id as number, fileUrl || String(videoUrl), title ?? null, description ?? null]
    );

    return res.status(201).json(new ApiResponse(201, portfolioVideo, "Portfolio video added successfully"));
  } catch (error) {
    logger.error("Error adding portfolio video: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to add portfolio video"));
  }
};

const updatePortfolioVideo: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { videoId } = req.params as Record<string, string>;
    const body = req.body as Record<string, unknown>;
    const { videoUrl, title, description, category } = body;

    const freelancerProfile = (await sqlOne(
      `SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!freelancerProfile) {
      return next(new ApiError(404, "Freelancer profile not found for this user"));
    }

    const portfolioVideo = (await sqlOne(
      `SELECT * FROM "PortfolioVideo" WHERE "id" = $1`,
      [parseInt(videoId, 10)]
    )) as DbRow | null;
    if (!portfolioVideo || portfolioVideo.freelancer_id !== freelancerProfile.id) {
      return next(new ApiError(404, "Portfolio video not found or you don't own it"));
    }

    const updateData: Record<string, unknown> = {};
    if (videoUrl !== undefined) updateData.videoUrl = req.fileUrl || videoUrl;
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
    vals.push(parseInt(videoId, 10));

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

const deletePortfolioVideo: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { videoId } = req.params as Record<string, string>;

    const freelancerProfile = (await sqlOne(
      `SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!freelancerProfile) {
      return next(new ApiError(404, "Freelancer profile not found for this user"));
    }

    const portfolioVideo = (await sqlOne(
      `SELECT * FROM "PortfolioVideo" WHERE "id" = $1`,
      [parseInt(videoId, 10)]
    )) as DbRow | null;
    if (!portfolioVideo || portfolioVideo.freelancer_id !== freelancerProfile.id) {
      return next(new ApiError(404, "Portfolio video not found or you don't own it"));
    }

    await sql(`DELETE FROM "PortfolioVideo" WHERE "id" = $1`, [parseInt(videoId, 10)]);

    return res.status(200).json(new ApiResponse(200, null, "Portfolio video deleted successfully"));
  } catch (error) {
    logger.error("Error deleting portfolio video: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete portfolio video"));
  }
};

const getPublicFreelancerProfile: Handler = async (req, res, next) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const parsedUserId = parseInt(userId, 10);

    const user = (await sqlOne(
      `SELECT "isActive", "role" FROM "User" WHERE "id" = $1`,
      [parsedUserId]
    )) as DbRow | null;

    if (!user) {
      return next(new ApiError(404, "User not found"));
    }

    if (!user.isActive) {
      return next(new ApiError(404, "User account is deactivated"));
    }

    if (user.role !== "FREELANCER") {
      return next(new ApiError(404, "User is not a freelancer"));
    }

    const fp = (await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [parsedUserId]
    )) as (FreelancerProfileRow & DbRow) | null;

    if (!fp) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    const [uRow, portfolioVideos, gigs, reviewRows] = await Promise.all([
      sqlOne(
        `SELECT "firstname", "lastname", "country", "profilePicture", "createdAt", "bio", "isVerified" FROM "User" WHERE "id" = $1`,
        [parsedUserId]
      ) as Promise<DbRow | null>,
      sql(
        `SELECT * FROM "PortfolioVideo" WHERE "freelancer_id" = $1 ORDER BY "uploadedAt" DESC`,
        [fp.id]
      ),
      sql(
        `SELECT "id", "title", "pricing", "deliveryTime", "description", "category", "thumbnailUrl" FROM "Gig"
         WHERE "freelancer_id" = $1 AND "status" = 'ACTIVE' AND "deletedAt" IS NULL`,
        [fp.id]
      ),
      sql(
        `SELECT * FROM "Review" WHERE "freelancer_id" = $1 ORDER BY "createdAt" DESC LIMIT 5`,
        [fp.id]
      ),
    ]);

    const clientIds = [
      ...new Set(
        (reviewRows as DbRow[]).map((r) => r.client_id as number | undefined).filter((x): x is number => Boolean(x))
      ),
    ];
    let clientsById: Record<number, DbRow> = {};
    if (clientIds.length) {
      const place = clientIds.map((_, idx) => `$${idx + 1}`).join(", ");
      const cRows = await sql(
        `SELECT "id", "firstname", "lastname" FROM "User" WHERE "id" IN (${place})`,
        clientIds
      ) as DbRow[];
      clientsById = Object.fromEntries(cRows.map((c) => [c.id as number, c]));
    }

    const reviewsReceived = (reviewRows as DbRow[]).map((r) => {
      const cid = r.client_id as number;
      const c = clientsById[cid];
      return {
        ...r,
        client: c ? { firstname: c.firstname, lastname: c.lastname } : null,
      };
    });

    const { user_id, ...prest } = fp as DbRow;
    const response = {
      ...prest,
      userId: user_id,
      user: uRow,
      portfolioVideos,
      gigs,
      reviewsReceived,
    };

    return res.status(200).json(new ApiResponse(200, response, "Public freelancer profile retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving public freelancer profile: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve public freelancer profile"));
  }
};

export {
  createFreelancerProfile,
  updateFreelancerProfile,
  getFreelancerProfile,
  deleteFreelancerProfile,
  addPortfolioVideo,
  updatePortfolioVideo,
  deletePortfolioVideo,
  getPublicFreelancerProfile,
};
