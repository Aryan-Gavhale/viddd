import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type Handler = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<void | ReturnType<ExpressResponse["json"]>>;

export const createBrief: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const body = req.body as Record<string, unknown>;

    if (body.jobId) {
      const job = await sqlOne(`SELECT 1 FROM "Job" WHERE id = $1 AND "posted_by_id" = $2`, [Number(body.jobId), req.user.id]);
      if (!job) return next(new ApiError(403, "You don't own this job"));
    }
    if (body.orderId) {
      const order = await sqlOne(`SELECT 1 FROM "Order" WHERE id = $1 AND "client_id" = $2`, [Number(body.orderId), req.user.id]);
      if (!order) return next(new ApiError(403, "You don't own this order"));
    }

    const brief = await sqlOne(
      `INSERT INTO "ProjectBrief" (
        "clientId", "title", "status", "projectType", "description", "targetAudience",
        "purpose", "duration", "deadline", "budget", "videoStyle", "tone", "pacing",
        "musicPreference", "colorGrading", "styleNotes", "referenceVideos",
        "brandName", "brandColors", "brandFonts", "logoUrl", "brandVoice", "dosAndDonts",
        "deliverables", "aspectRatios", "fileFormats", "additionalNotes", "moodBoardUrls",
        "jobId", "orderId", "createdAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,NOW(),NOW()
      ) RETURNING *`,
      [
        req.user.id,
        body.title || "Untitled Brief",
        body.status || "DRAFT",
        body.projectType || null,
        body.description || null,
        body.targetAudience || null,
        body.purpose || null,
        body.duration || null,
        body.deadline || null,
        body.budget || null,
        body.videoStyle || null,
        body.tone || null,
        body.pacing || null,
        body.musicPreference || null,
        body.colorGrading || null,
        body.styleNotes || null,
        body.referenceVideos ? JSON.stringify(body.referenceVideos) : null,
        body.brandName || null,
        body.brandColors ? JSON.stringify(body.brandColors) : null,
        body.brandFonts || null,
        body.logoUrl || null,
        body.brandVoice || null,
        body.dosAndDonts ? JSON.stringify(body.dosAndDonts) : null,
        body.deliverables ? JSON.stringify(body.deliverables) : null,
        body.aspectRatios ? JSON.stringify(body.aspectRatios) : null,
        body.fileFormats ? JSON.stringify(body.fileFormats) : null,
        body.additionalNotes || null,
        body.moodBoardUrls ? JSON.stringify(body.moodBoardUrls) : null,
        body.jobId ? Number(body.jobId) : null,
        body.orderId ? Number(body.orderId) : null,
      ]
    );

    return res.status(201).json(new ApiResponse(201, brief, "Brief created"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("createBrief: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to create brief"));
  }
};

export const updateBrief: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { briefId } = req.params as Record<string, string>;
    const body = req.body as Record<string, unknown>;

    const existing = await sqlOne(`SELECT * FROM "ProjectBrief" WHERE id = $1`, [parseInt(briefId, 10)]);
    if (!existing) return next(new ApiError(404, "Brief not found"));
    if (existing.clientId !== req.user.id) return next(new ApiError(403, "Not your brief"));

    if (body.jobId !== undefined && body.jobId) {
      const job = await sqlOne(`SELECT 1 FROM "Job" WHERE id = $1 AND "posted_by_id" = $2`, [Number(body.jobId), req.user.id]);
      if (!job) return next(new ApiError(403, "You don't own this job"));
    }
    if (body.orderId !== undefined && body.orderId) {
      const order = await sqlOne(`SELECT 1 FROM "Order" WHERE id = $1 AND "client_id" = $2`, [Number(body.orderId), req.user.id]);
      if (!order) return next(new ApiError(403, "You don't own this order"));
    }

    const fields: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    const stringFields = [
      "title", "status", "projectType", "description", "targetAudience",
      "purpose", "duration", "budget", "videoStyle", "tone", "pacing",
      "musicPreference", "colorGrading", "styleNotes", "brandName", "brandFonts",
      "logoUrl", "brandVoice", "additionalNotes",
    ];
    const jsonFields = [
      "referenceVideos", "brandColors", "dosAndDonts", "deliverables",
      "aspectRatios", "fileFormats", "moodBoardUrls",
    ];

    for (const f of stringFields) {
      if (body[f] !== undefined) {
        fields.push(`"${f}" = $${p}`);
        params.push(body[f]);
        p++;
      }
    }
    for (const f of jsonFields) {
      if (body[f] !== undefined) {
        fields.push(`"${f}" = $${p}`);
        params.push(body[f] != null ? JSON.stringify(body[f]) : null);
        p++;
      }
    }
    if (body.deadline !== undefined) {
      fields.push(`"deadline" = $${p}`);
      params.push(body.deadline || null);
      p++;
    }
    if (body.jobId !== undefined) {
      fields.push(`"jobId" = $${p}`);
      params.push(body.jobId ? Number(body.jobId) : null);
      p++;
    }
    if (body.orderId !== undefined) {
      fields.push(`"orderId" = $${p}`);
      params.push(body.orderId ? Number(body.orderId) : null);
      p++;
    }

    if (fields.length === 0) return next(new ApiError(400, "No fields to update"));

    fields.push(`"updatedAt" = NOW()`);
    params.push(parseInt(briefId, 10));

    const updated = await sqlOne(
      `UPDATE "ProjectBrief" SET ${fields.join(", ")} WHERE id = $${p} RETURNING *`,
      params
    );

    return res.status(200).json(new ApiResponse(200, parseJsonFields(updated), "Brief updated"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("updateBrief: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to update brief"));
  }
};

export const getBrief: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { briefId } = req.params as Record<string, string>;

    const brief = await sqlOne(`SELECT * FROM "ProjectBrief" WHERE id = $1`, [parseInt(briefId, 10)]);
    if (!brief) return next(new ApiError(404, "Brief not found"));

    const userId = req.user.id;
    const isOwner = brief.clientId === userId;

    if (!isOwner) {
      let isParty = false;
      if (brief.orderId) {
        const order = await sqlOne(
          `SELECT 1 FROM "Order" o
           JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
           WHERE o.id = $1 AND (o."client_id" = $2 OR fp."user_id" = $2)`,
          [brief.orderId, userId]
        );
        isParty = !!order;
      }
      if (!isParty && brief.jobId) {
        const job = await sqlOne(
          `SELECT 1 FROM "Job" WHERE id = $1 AND ("posted_by_id" = $2 OR "freelancer_id" = $2)`,
          [brief.jobId, userId]
        );
        isParty = !!job;
      }
      if (!isParty) return next(new ApiError(403, "Access denied"));
    }

    return res.status(200).json(new ApiResponse(200, parseJsonFields(brief), "Brief retrieved"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("getBrief: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to get brief"));
  }
};

export const getMyBriefs: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));

    const briefs = await sql(
      `SELECT id, title, status, "projectType", "createdAt", "updatedAt", "jobId", "orderId"
       FROM "ProjectBrief"
       WHERE "clientId" = $1
       ORDER BY "updatedAt" DESC
       LIMIT 100`,
      [req.user.id]
    );

    return res.status(200).json(new ApiResponse(200, briefs, "Briefs retrieved"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("getMyBriefs: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to get briefs"));
  }
};

export const deleteBrief: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { briefId } = req.params as Record<string, string>;

    const brief = await sqlOne(`SELECT * FROM "ProjectBrief" WHERE id = $1`, [parseInt(briefId, 10)]);
    if (!brief) return next(new ApiError(404, "Brief not found"));
    if (brief.clientId !== req.user.id) return next(new ApiError(403, "Not your brief"));

    await sql(`DELETE FROM "ProjectBrief" WHERE id = $1`, [parseInt(briefId, 10)]);
    return res.status(200).json(new ApiResponse(200, null, "Brief deleted"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("deleteBrief: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete brief"));
  }
};

function parseJsonFields(row: Record<string, unknown> | null) {
  if (!row) return row;
  const jsonCols = ["referenceVideos", "brandColors", "dosAndDonts", "deliverables", "aspectRatios", "fileFormats", "moodBoardUrls"];
  const result = { ...row };
  for (const col of jsonCols) {
    if (typeof result[col] === "string") {
      try { result[col] = JSON.parse(result[col] as string); } catch { /* keep string */ }
    }
  }
  return result;
}
