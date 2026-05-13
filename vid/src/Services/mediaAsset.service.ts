import { sql, sqlOne } from "../db.js";
import { mediaQueue } from "../Queues/index.js";
import type { DbRow } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";
import { areDevPlaceholdersAllowed } from "./payment.service.js";

export type MediaScopeType = "ORDER" | "JOB";
export type MediaAssetStatus = "PENDING" | "SCANNING" | "PROCESSING" | "READY" | "FAILED" | "QUARANTINED" | "PLACEHOLDER";

export type CreateMediaAssetInput = {
  sourceType: "PROJECT_FILE" | "FILE_UPLOAD";
  projectFileId?: number | null;
  fileUploadId?: number | null;
  ownerId: number;
  scopeType?: MediaScopeType | null;
  orderId?: number | null;
  jobId?: number | null;
  originalKey?: string | null;
  originalUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  metadata?: Record<string, unknown>;
};

function isPlaceholderRef(value: unknown): boolean {
  const ref = String(value || "");
  return ref.startsWith("dev-placeholder") || ref.startsWith("dev-placeholder://");
}

export function mapMediaAsset(row: DbRow | null): DbRow | null {
  if (!row) return null;
  return {
    id: row.id,
    sourceType: row.sourceType,
    projectFileId: row.projectFileId,
    fileUploadId: row.fileUploadId,
    ownerId: row.ownerId,
    scopeType: row.scopeType,
    orderId: row.orderId,
    jobId: row.jobId,
    originalKey: row.originalKey,
    originalUrl: row.originalUrl,
    mimeType: row.mimeType,
    fileSize: Number(row.fileSize || 0),
    status: row.status,
    scanStatus: row.scanStatus,
    processingStatus: row.processingStatus,
    posterKey: row.posterKey,
    previewKey: row.previewKey,
    watermarkedKey: row.watermarkedKey,
    variants: Array.isArray(row.variants) ? row.variants : [],
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    error: row.error,
    cleanupAfter: row.cleanupAfter,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createOrUpdateMediaAsset(input: CreateMediaAssetInput): Promise<DbRow> {
  const originalRef = input.originalKey || input.originalUrl || "";
  const placeholder = isPlaceholderRef(originalRef);
  if (placeholder && !areDevPlaceholdersAllowed()) {
    throw new ApiError(400, "Development placeholder media is disabled");
  }
  const status: MediaAssetStatus = placeholder ? "PLACEHOLDER" : "PENDING";
  const scanStatus = placeholder ? "SKIPPED_DEV" : "PENDING";
  const processingStatus = placeholder ? "SKIPPED_DEV" : "PENDING";
  const metadata = {
    ...(input.metadata || {}),
    isPlaceholder: placeholder,
  };

  const existing = await sqlOne(
    `SELECT * FROM "MediaAsset"
      WHERE "deletedAt" IS NULL
        AND (
          ($1::int IS NOT NULL AND "projectFileId" = $1)
          OR ($2::int IS NOT NULL AND "fileUploadId" = $2)
        )
      LIMIT 1`,
    [input.projectFileId || null, input.fileUploadId || null]
  );

  const row = existing
    ? await sqlOne(
        `UPDATE "MediaAsset"
            SET "originalKey" = COALESCE($2, "originalKey"),
                "originalUrl" = COALESCE($3, "originalUrl"),
                "mimeType" = COALESCE($4, "mimeType"),
                "fileSize" = COALESCE($5, "fileSize"),
                "metadata" = COALESCE("metadata", '{}'::jsonb) || $6::jsonb,
                "updatedAt" = NOW()
          WHERE "id" = $1
          RETURNING *`,
        [
          existing.id,
          input.originalKey || null,
          input.originalUrl || null,
          input.mimeType || null,
          input.fileSize || null,
          JSON.stringify(metadata),
        ]
      )
    : await sqlOne(
        `INSERT INTO "MediaAsset" (
          "sourceType", "projectFileId", "fileUploadId", "ownerId", "scopeType", "orderId", "jobId",
          "originalKey", "originalUrl", "mimeType", "fileSize", "status", "scanStatus", "processingStatus", "metadata"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15::jsonb
        )
        RETURNING *`,
        [
          input.sourceType,
          input.projectFileId || null,
          input.fileUploadId || null,
          input.ownerId,
          input.scopeType || null,
          input.orderId || null,
          input.jobId || null,
          input.originalKey || null,
          input.originalUrl || null,
          input.mimeType || null,
          input.fileSize || 0,
          status,
          scanStatus,
          processingStatus,
          JSON.stringify(metadata),
        ]
      );

  const asset = row as DbRow;
  if (!placeholder) {
    await queueMediaScan(Number(asset.id));
  }
  return mapMediaAsset(asset) as DbRow;
}

export async function queueMediaScan(assetId: number): Promise<void> {
  await mediaQueue.add("scan_media", { assetId });
}

export async function queueMediaProcessing(assetId: number): Promise<void> {
  await mediaQueue.add("process_media", { assetId });
}

export async function queueMediaCleanup(assetId: number): Promise<void> {
  await mediaQueue.add("cleanup_media", { assetId });
}

export async function getMediaAssetById(assetId: number): Promise<DbRow | null> {
  return mapMediaAsset((await sqlOne(`SELECT * FROM "MediaAsset" WHERE "id" = $1 AND "deletedAt" IS NULL`, [assetId])) as DbRow | null);
}

export async function getMediaAssetByProjectFile(projectFileId: number): Promise<DbRow | null> {
  return mapMediaAsset(
    (await sqlOne(`SELECT * FROM "MediaAsset" WHERE "projectFileId" = $1 AND "deletedAt" IS NULL`, [projectFileId])) as DbRow | null
  );
}

export async function updateMediaAsset(assetId: number, patch: Record<string, unknown>): Promise<DbRow | null> {
  const allowed = [
    "status",
    "scanStatus",
    "processingStatus",
    "posterKey",
    "previewKey",
    "watermarkedKey",
    "variants",
    "metadata",
    "error",
    "cleanupAfter",
  ];
  const fields = Object.entries(patch).filter(([key]) => allowed.includes(key));
  if (!fields.length) return getMediaAssetById(assetId);
  const assignments = fields.map(([key], index) => {
    const jsonCast = key === "variants" || key === "metadata" ? "::jsonb" : "";
    return `"${key}" = $${index + 2}${jsonCast}`;
  });
  const values = fields.map(([key, value]) => (key === "variants" || key === "metadata" ? JSON.stringify(value || (key === "variants" ? [] : {})) : value));
  const row = (await sqlOne(
    `UPDATE "MediaAsset"
        SET ${assignments.join(", ")}, "updatedAt" = NOW()
      WHERE "id" = $1 AND "deletedAt" IS NULL
      RETURNING *`,
    [assetId, ...values]
  )) as DbRow | null;
  return mapMediaAsset(row);
}

export async function listMediaAssetsForProjectFiles(projectFileIds: number[]): Promise<DbRow[]> {
  if (!projectFileIds.length) return [];
  const rows = (await sql(
    `SELECT * FROM "MediaAsset"
      WHERE "projectFileId" = ANY($1::int[]) AND "deletedAt" IS NULL`,
    [projectFileIds]
  )) as DbRow[];
  return rows.map((row) => mapMediaAsset(row) as DbRow);
}
