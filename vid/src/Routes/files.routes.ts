import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  getPresignedUrl,
  initiateMultipartUpload,
  getUploadPartPresignedUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  listUploadParts,
} from "../Utils/s3.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { ApiError } from "../Utils/ApiError.js";
import { sql, sqlOne } from "../db.js";
import type { AuthUser, DbRow, ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import Joi from "joi";

const MAX_FILE_BYTES = 50 * 1024 * 1024 * 1024;
/** Same chunk size as the `VideoUploader` client (100 MiB) */
const MAX_PART_SIZE_BYTES = 100 * 1024 * 1024;

const signedUrlQuerySchema = Joi.object({
  key: Joi.string().required(),
});

const initiateUploadBodySchema = Joi.object({
  fileName: Joi.string().trim().min(1).max(500).required(),
  contentType: Joi.string()
    .pattern(/^video\//i)
    .required(),
  fileSize: Joi.number().integer().min(1).max(MAX_FILE_BYTES).required(),
  orderId: Joi.number().integer().positive().optional(),
  jobId: Joi.number().integer().positive().optional(),
});

const uploadPartUrlBodySchema = Joi.object({
  key: Joi.string().required(),
  uploadId: Joi.string().required(),
  partNumber: Joi.number().integer().min(1).max(10_000).required(),
});

const partItemSchema = Joi.object({
  PartNumber: Joi.number().integer().min(1).max(10_000).required(),
  ETag: Joi.string().min(1).max(2000).required(),
});

const completeUploadBodySchema = Joi.object({
  key: Joi.string().required(),
  uploadId: Joi.string().required(),
  parts: Joi.array().items(partItemSchema).min(1).required(),
});

const abortUploadBodySchema = Joi.object({
  key: Joi.string().required(),
  uploadId: Joi.string().required(),
});

// "FileUpload" is created by migration prisma/migrations/20260424_file_upload_table/migration.sql (not at runtime).

async function assertKeyOwnership(key: string, userId: number, userRole: string): Promise<void> {
  if (userRole === "ADMIN") return;

  const keyUserMatch = key.match(/^uploads\/(\d+)\//);
  if (keyUserMatch && parseInt(keyUserMatch[1] ?? "0", 10) === userId) return;

  const freelancerProfile = await sqlOne(
    `SELECT "id" FROM "FreelancerProfile" WHERE user_id = $1`,
    [userId]
  );

  if (freelancerProfile) {
    const ownedGig = await sqlOne(
      `SELECT g."id" FROM "Gig" g
       LEFT JOIN "GigSampleMedia" gsm ON gsm.gig_id = g."id"
       WHERE g.freelancer_id = $1
         AND (g."thumbnailUrl" LIKE '%' || $2 || '%' OR gsm."mediaUrl" LIKE '%' || $2 || '%')
       LIMIT 1`,
      [freelancerProfile["id"], key]
    );
    if (ownedGig) return;
  }

  const fpId = freelancerProfile ? freelancerProfile["id"] : null;
  const relatedOrder = await sqlOne(
    `SELECT "id" FROM "Order"
     WHERE (client_id = $1 ${fpId ? `OR freelancer_id = $3` : ""})
       AND "deletedAt" IS NULL
       AND ("uploadedFiles"::text ILIKE '%' || $2 || '%')
     LIMIT 1`,
    fpId ? [userId, key, fpId] : [userId, key]
  );
  if (relatedOrder) return;

  const relatedMessage = await sqlOne(
    `SELECT m."id" FROM "Message" m
     JOIN "Order" o ON o."id" = m."orderId" AND o."deletedAt" IS NULL
     WHERE (o.client_id = $1 ${fpId ? `OR o.freelancer_id = $3` : ""})
       AND m."attachments"::text ILIKE '%' || $2 || '%'
     LIMIT 1`,
    fpId ? [userId, key, fpId] : [userId, key]
  );
  if (relatedMessage) return;

  const userRecord: DbRow | null = await sqlOne(
    `SELECT "profilePicture" FROM "User" WHERE "id" = $1`,
    [userId]
  );
  const pic = userRecord?.["profilePicture"];
  if (typeof pic === "string" && pic.includes(key)) return;

  throw new ApiError(403, "You do not have access to this file");
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[\\/]/, "");
  return base
    .replace(/[^\w.\- ()\[\]]+/g, "_")
    .replace(/_+/g, "_")
    .trim()
    .slice(0, 200) || "video";
}

async function assertOrderOrJobForUpload(
  userId: number,
  role: string,
  orderId?: number,
  jobId?: number
): Promise<void> {
  if (role === "ADMIN") return;
  if (orderId != null) {
    const row = await sqlOne(
      `SELECT "id" FROM "Order" o
       WHERE o."id" = $1 AND o."deletedAt" IS NULL
         AND (o."client_id" = $2 OR o."freelancer_id" = $2)`,
      [orderId, userId]
    );
    if (!row) {
      throw new ApiError(403, "Not allowed to attach this upload to the given order");
    }
  }
  if (jobId != null) {
    const job = await sqlOne(
      `SELECT "id", "posted_by_id" AS "poster" FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [jobId]
    );
    if (!job) {
      throw new ApiError(404, "Job not found");
    }
    const poster = Number((job as DbRow)["poster"]);
    if (poster === userId) return;
    const applied = await sqlOne(
      `SELECT "id" FROM "Application" WHERE "jobId" = $1 AND "freelancerId" = $2`,
      [jobId, userId]
    );
    if (!applied) {
      throw new ApiError(403, "Not allowed to attach this upload to the given job");
    }
  }
}

type AuthedRequest = FastifyRequest & { user: AuthUser };
type Ctx = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<void>;

const err = (e: unknown, next: NextFunction) => {
  if (e instanceof ApiError) return next(e);
  return next(new ApiError(500, (e as Error).message));
};

const initiateUpload: Ctx = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const { fileName, contentType, fileSize, orderId, jobId } = req.body as {
      fileName: string;
      contentType: string;
      fileSize: number;
      orderId?: number;
      jobId?: number;
    };

    if (!/^video\//i.test(contentType)) {
      return next(new ApiError(400, "Content type must be a video/* MIME type"));
    }
    if (fileSize > MAX_FILE_BYTES) {
      return next(new ApiError(400, "File size must not exceed 50GB"));
    }

    await assertOrderOrJobForUpload(userId, req.user.role, orderId, jobId);

    const safe = sanitizeFileName(fileName);
    const key = `uploads/${userId}/${Date.now()}-${safe}`;
    const totalParts = Math.max(1, Math.ceil(fileSize / MAX_PART_SIZE_BYTES));

    const { uploadId } = await initiateMultipartUpload(key, contentType);

    await sql(
      `INSERT INTO "FileUpload" (
        "userId", "uploadId", "s3Key", "fileName", "contentType", "fileSize", "orderId", "jobId", "status", "totalParts", "completedParts", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'IN_PROGRESS', $9, 0, NOW())`,
      [
        userId,
        uploadId,
        key,
        fileName,
        contentType,
        fileSize,
        orderId ?? null,
        jobId ?? null,
        totalParts,
      ]
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        { uploadId, key, maxPartSize: MAX_PART_SIZE_BYTES },
        "Multipart upload initiated"
      )
    );
  } catch (e) {
    return err(e, next);
  }
};

const uploadPartUrl: Ctx = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const { key, uploadId, partNumber } = req.body as { key: string; uploadId: string; partNumber: number };

    const row = await sqlOne(
      `SELECT "id" FROM "FileUpload" WHERE "uploadId" = $1 AND "s3Key" = $2 AND "userId" = $3 AND "status" = 'IN_PROGRESS'`,
      [uploadId, key, userId]
    );
    if (!row) {
      return next(new ApiError(404, "Upload not found or not in progress"));
    }

    const url = await getUploadPartPresignedUrl(key, uploadId, partNumber);
    return res.json(new ApiResponse(200, { url }, "Presigned part URL created"));
  } catch (e) {
    return err(e, next);
  }
};

const completeUpload: Ctx = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const { key, uploadId, parts } = req.body as {
      key: string;
      uploadId: string;
      parts: Array<{ PartNumber: number; ETag: string }>;
    };

    const record = await sqlOne(
      `SELECT * FROM "FileUpload" WHERE "uploadId" = $1 AND "s3Key" = $2 AND "userId" = $3 AND "status" = 'IN_PROGRESS'`,
      [uploadId, key, userId]
    );
    if (!record) {
      return next(new ApiError(404, "Upload not found or not in progress"));
    }

    const location = await completeMultipartUpload(key, uploadId, parts);

    await sql(
      `UPDATE "FileUpload" SET "status" = 'COMPLETED', "finalUrl" = $1, "completedParts" = $2, "updatedAt" = NOW() WHERE "id" = $3`,
      [location, parts.length, record["id"]]
    );

    return res.json(new ApiResponse(200, { url: location }, "Upload completed"));
  } catch (e) {
    return err(e, next);
  }
};

const abortUpload: Ctx = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const { key, uploadId } = req.body as { key: string; uploadId: string };

    const record = await sqlOne(
      `SELECT * FROM "FileUpload" WHERE "uploadId" = $1 AND "s3Key" = $2 AND "userId" = $3 AND "status" = 'IN_PROGRESS'`,
      [uploadId, key, userId]
    );
    if (!record) {
      return next(new ApiError(404, "Upload not found or not in progress"));
    }

    try {
      await abortMultipartUpload(key, uploadId);
    } catch {
      // S3 may already have no parts; mark aborted anyway
    }

    await sql(
      `UPDATE "FileUpload" SET "status" = 'ABORTED', "updatedAt" = NOW() WHERE "id" = $1`,
      [record["id"]]
    );

    return res.json(new ApiResponse(200, {}, "Upload aborted"));
  } catch (e) {
    return err(e, next);
  }
};

const getUploadStatus: Ctx = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const uploadId = (req.params as { uploadId?: string }).uploadId;
    if (!uploadId) {
      return next(new ApiError(400, "uploadId is required"));
    }

    const record = await sqlOne(
      `SELECT * FROM "FileUpload" WHERE "uploadId" = $1 AND "userId" = $2 AND "status" = 'IN_PROGRESS'`,
      [uploadId, userId]
    );
    if (!record) {
      return next(new ApiError(404, "No in-progress upload with this id for your user"));
    }

    const key = String(record["s3Key"]);
    const s3Parts = await listUploadParts(key, uploadId);
    const totalParts = record["totalParts"] != null ? Number(record["totalParts"]) : 0;
    const completedCount = s3Parts.length;

    await sql(
      `UPDATE "FileUpload" SET "completedParts" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      [completedCount, record["id"]]
    );

    return res.json(
      new ApiResponse(
        200,
        {
          uploadId,
          key,
          completedParts: completedCount,
          totalParts: totalParts || null,
          parts: s3Parts.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
        },
        "Upload status"
      )
    );
  } catch (e) {
    return err(e, next);
  }
};

export default async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  const auth = [authenticateToken];

  fastify.get("/signed-url", {
    preHandler: [authenticateToken, validateQuery(signedUrlQuerySchema)],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const req = request as AuthedRequest;
      const { key } = request.query as { key: string };

      await assertKeyOwnership(key, req.user.id, req.user.role);

      const url = await getPresignedUrl(key);
      return reply.send(new ApiResponse(200, { url }, "Signed URL generated"));
    },
  });

  fastify.post("/initiate-upload", {
    preHandler: [...auth, validateBody(initiateUploadBodySchema)],
    handler: wrapHandler(initiateUpload),
  });
  fastify.post("/upload-part-url", {
    preHandler: [...auth, validateBody(uploadPartUrlBodySchema)],
    handler: wrapHandler(uploadPartUrl),
  });
  fastify.post("/complete-upload", {
    preHandler: [...auth, validateBody(completeUploadBodySchema)],
    handler: wrapHandler(completeUpload),
  });
  fastify.post("/abort-upload", {
    preHandler: [...auth, validateBody(abortUploadBodySchema)],
    handler: wrapHandler(abortUpload),
  });
  fastify.get("/upload-status/:uploadId", {
    preHandler: auth,
    handler: wrapHandler(getUploadStatus),
  });
}
