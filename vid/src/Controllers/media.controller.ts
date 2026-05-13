import { sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import type { AuthUser, DbRow, ExpressHandler } from "../types/index.js";
import { getMediaAssetById, getMediaAssetByProjectFile, queueMediaScan, updateMediaAsset } from "../Services/mediaAsset.service.js";
import { buildMediaUrl, canDownloadOriginal, publicMediaDto } from "../Services/mediaAccess.service.js";

async function deliveryClosed(asset: DbRow): Promise<boolean> {
  if (asset.scopeType !== "ORDER" && asset.scopeType !== "JOB") return false;
  const key = asset.scopeType === "ORDER" ? "orderId" : "jobId";
  const scopeId = asset.scopeType === "ORDER" ? asset.orderId : asset.jobId;
  if (!scopeId) return false;
  const row = await sqlOne(
    `SELECT "id" FROM "FinalDelivery"
      WHERE "scopeType" = $1 AND "${key}" = $2 AND "status" IN ('FINAL_DELIVERED', 'AUTO_APPROVED')
      LIMIT 1`,
    [asset.scopeType, scopeId]
  );
  return Boolean(row);
}

async function assertAssetAccess(asset: DbRow, user: AuthUser): Promise<void> {
  if (user.role === "ADMIN") return;
  if (Number(asset.ownerId) === Number(user.id)) return;

  if (asset.projectFileId != null) {
    const file = (await sqlOne(`SELECT * FROM "ProjectFile" WHERE "id" = $1`, [asset.projectFileId])) as DbRow | null;
    if (!file) throw new ApiError(404, "Media file not found");
    if (file.orderId != null) {
      const order = await sqlOne(
        `SELECT o."client_id" AS "clientId", fp."user_id" AS "freelancerUserId"
           FROM "Order" o
           JOIN "FreelancerProfile" fp ON fp."id" = o."freelancer_id"
          WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
        [file.orderId]
      );
      if (Number(order?.clientId) === Number(user.id) || Number(order?.freelancerUserId) === Number(user.id)) return;
    }
    if (file.jobId != null) {
      const job = await sqlOne(
        `SELECT "posted_by_id" AS "clientId", "freelancer_id" AS "freelancerId"
           FROM "Job"
          WHERE "id" = $1 AND "deletedAt" IS NULL`,
        [file.jobId]
      );
      if (Number(job?.clientId) === Number(user.id) || Number(job?.freelancerId) === Number(user.id)) return;
    }
  }

  if (asset.fileUploadId != null) {
    const upload = await sqlOne(`SELECT "userId" FROM "FileUpload" WHERE "id" = $1`, [asset.fileUploadId]);
    if (Number(upload?.userId) === Number(user.id)) return;
  }

  throw new ApiError(403, "You do not have access to this media asset");
}

async function buildAllowedUrls(asset: DbRow, user: AuthUser): Promise<Record<string, unknown>> {
  if (["FAILED", "QUARANTINED"].includes(String(asset.status))) return {};
  const closed = await deliveryClosed(asset);
  const urls: Record<string, unknown> = {};
  for (const kind of ["poster", "preview", "watermarked"] as const) {
    try {
      urls[kind] = await buildMediaUrl(asset, kind, user, { deliveryClosed: closed });
    } catch {
      // URL not yet available.
    }
  }
  if (canDownloadOriginal(asset, user, closed)) {
    try {
      urls.original = await buildMediaUrl(asset, "original", user, { deliveryClosed: closed });
    } catch {
      // Original may not exist for placeholders.
    }
  }
  const variants = Array.isArray(asset.variants) ? asset.variants : [];
  urls.variants = await Promise.all(
    variants.map(async (variant) => {
      try {
        const built = await buildMediaUrl(asset, "variant", user, { variantId: String(variant.id), deliveryClosed: closed });
        return { ...built, id: variant.id, label: built.label || variant.label, ready: variant.ready };
      } catch {
        return { id: variant.id, label: variant.label, locked: true };
      }
    })
  );
  return urls;
}

export const getMediaAssetForProjectFile: ExpressHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const projectFileId = Number((req.params as { projectFileId?: string }).projectFileId);
    if (!Number.isInteger(projectFileId)) return next(new ApiError(400, "projectFileId is required"));
    const asset = await getMediaAssetByProjectFile(projectFileId);
    if (!asset) return next(new ApiError(404, "Media asset not found"));
    await assertAssetAccess(asset, req.user);
    return res.json(new ApiResponse(200, { asset: publicMediaDto(asset), urls: await buildAllowedUrls(asset, req.user) }, "Media asset"));
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(500, (error as Error).message));
  }
};

export const getMediaAssetUrls: ExpressHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const assetId = Number((req.params as { assetId?: string }).assetId);
    const kind = String((req.query as { kind?: string }).kind || "preview") as "preview" | "watermarked" | "original" | "poster" | "variant";
    const variantId = (req.query as { variantId?: string }).variantId;
    if (!Number.isInteger(assetId)) return next(new ApiError(400, "assetId is required"));
    const asset = await getMediaAssetById(assetId);
    if (!asset) return next(new ApiError(404, "Media asset not found"));
    await assertAssetAccess(asset, req.user);
    if (["FAILED", "QUARANTINED"].includes(String(asset.status))) {
      return next(new ApiError(423, "Media asset is not available"));
    }
    const url = await buildMediaUrl(asset, kind, req.user, { variantId, deliveryClosed: await deliveryClosed(asset) });
    return res.json(new ApiResponse(200, url, "Media URL"));
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(500, (error as Error).message));
  }
};

export const retryMediaAsset: ExpressHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const assetId = Number((req.params as { assetId?: string }).assetId);
    if (!Number.isInteger(assetId)) return next(new ApiError(400, "assetId is required"));
    const asset = await getMediaAssetById(assetId);
    if (!asset) return next(new ApiError(404, "Media asset not found"));
    await assertAssetAccess(asset, req.user);
    if (Number(asset.ownerId) !== Number(req.user.id) && req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Only the uploader or admin can retry media processing"));
    }
    const updated = await updateMediaAsset(assetId, {
      status: "PENDING",
      scanStatus: "PENDING",
      processingStatus: "PENDING",
      error: null,
    });
    await queueMediaScan(assetId);
    return res.json(new ApiResponse(200, { asset: publicMediaDto(updated) }, "Media retry queued"));
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(500, (error as Error).message));
  }
};
