import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

const PRICING = { LOW: 50, NORMAL: 100, HIGH: 200 };
const ESTIMATE_MULTIPLIERS: Record<string, number> = {
  "1080p": 1, "1440p": 1.5, "4K": 2.5, "8K": 5,
};

export const submitRenderJob: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;

    const resolution = String(b.resolution || "1080p");
    const priority = String(b.priority || "NORMAL");
    const multiplier = ESTIMATE_MULTIPLIERS[resolution] || 1;
    const baseCost = (PRICING as Record<string, number>)[priority] || 100;
    const estimatedMinutes = Math.ceil(Number(b.estimatedMinutes || 30) * multiplier);
    const cost = Math.round(baseCost * multiplier);

    const job = await sqlOne(
      `INSERT INTO "RenderJob" ("userId","orderId","projectName","priority","software","resolution","frameRange","outputFormat","estimatedMinutes","inputFileUrl","cost","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW()) RETURNING *`,
      [req.user.id, b.orderId || null, String(b.projectName || "Untitled"), priority,
       b.software || null, resolution, b.frameRange || null, b.outputFormat || "MP4",
       estimatedMinutes, b.inputFileUrl || null, cost]
    );

    await sql(
      `INSERT INTO "PlatformRevenue" ("type","amount","sourceId","sourceType","description","createdAt")
       VALUES ('CLOUD_RENDERING',$1,$2,'RenderJob',$3,NOW())`,
      [cost, (job as Record<string, unknown>).id,
       `Render job: ${resolution} ${priority} — ${estimatedMinutes}min`]
    );

    return res.status(201).json(new ApiResponse(201, job, "Render job queued"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("submitRenderJob: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to submit render job"));
  }
};

export const getMyRenderJobs: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const jobs = await sql(
      `SELECT * FROM "RenderJob" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 50`, [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, jobs, "Render jobs retrieved"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("getMyRenderJobs: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get render jobs"));
  }
};

export const getRenderJob: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { jobId } = req.params as Record<string, string>;
    const job = await sqlOne(`SELECT * FROM "RenderJob" WHERE id=$1`, [parseInt(jobId, 10)]);
    if (!job) return next(new ApiError(404, "Render job not found"));
    if (job.userId !== req.user.id && req.user.role !== "ADMIN") return next(new ApiError(403, "Forbidden"));
    return res.status(200).json(new ApiResponse(200, job, "Render job retrieved"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("getRenderJob: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get render job"));
  }
};

export const cancelRenderJob: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { jobId } = req.params as Record<string, string>;
    const job = await sqlOne(`SELECT * FROM "RenderJob" WHERE id=$1`, [parseInt(jobId, 10)]);
    if (!job) return next(new ApiError(404, "Not found"));
    if (job.userId !== req.user.id) return next(new ApiError(403, "Forbidden"));
    if (job.status === "COMPLETED" || job.status === "FAILED") return next(new ApiError(400, "Cannot cancel a finished job"));

    const updated = await sqlOne(
      `UPDATE "RenderJob" SET status='CANCELLED', "updatedAt"=NOW() WHERE id=$1 RETURNING *`, [parseInt(jobId, 10)]
    );
    return res.status(200).json(new ApiResponse(200, updated, "Render job cancelled"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("cancelRenderJob: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to cancel"));
  }
};

export const getEstimate: H = async (req, res, next) => {
  try {
    const b = req.body as Record<string, unknown>;
    const resolution = String(b.resolution || "1080p");
    const priority = String(b.priority || "NORMAL");
    const multiplier = ESTIMATE_MULTIPLIERS[resolution] || 1;
    const baseCost = (PRICING as Record<string, number>)[priority] || 100;
    return res.status(200).json(new ApiResponse(200, {
      estimatedMinutes: Math.ceil(Number(b.estimatedMinutes || 30) * multiplier),
      estimatedCost: Math.round(baseCost * multiplier),
      currency: "INR",
    }, "Estimate calculated"));
  } catch (e) {
    return next(new ApiError(500, "Failed to calculate estimate"));
  }
};
