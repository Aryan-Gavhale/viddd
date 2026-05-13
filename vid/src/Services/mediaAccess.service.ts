import { ApiError } from "../Utils/ApiError.js";
import { getPresignedUrl } from "../Utils/s3.js";
import type { DbRow, AuthUser } from "../types/index.js";
import { areDevPlaceholdersAllowed } from "./payment.service.js";

export type MediaUrlKind = "preview" | "watermarked" | "original" | "poster" | "variant";

function isDevPlaceholder(value: unknown): boolean {
  const ref = String(value || "");
  return ref.startsWith("dev-placeholder") || ref.startsWith("dev-placeholder://");
}

function placeholderUrl(asset: DbRow, kind: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(
    `Development placeholder media (${kind}) for ${String(asset.originalKey || asset.originalUrl || "asset")}. No media bytes were stored.`
  )}`;
}

export function canDownloadOriginal(asset: DbRow, user: AuthUser, deliveryClosed = false): boolean {
  if (user.role === "ADMIN" || Number(asset.ownerId) === Number(user.id)) return true;
  return deliveryClosed;
}

export async function buildMediaUrl(
  asset: DbRow,
  kind: MediaUrlKind,
  user: AuthUser,
  opts: { variantId?: string; deliveryClosed?: boolean } = {}
): Promise<{ url: string; key: string | null; kind: string; label?: string }> {
  const variants = Array.isArray(asset.variants) ? asset.variants : [];
  let key: string | null = null;
  let label: string | undefined;

  if (kind === "poster") key = asset.posterKey ? String(asset.posterKey) : null;
  if (kind === "preview") key = asset.previewKey ? String(asset.previewKey) : String(asset.originalKey || asset.originalUrl || "");
  if (kind === "watermarked") key = asset.watermarkedKey ? String(asset.watermarkedKey) : asset.previewKey ? String(asset.previewKey) : String(asset.originalKey || asset.originalUrl || "");
  if (kind === "original") {
    if (!canDownloadOriginal(asset, user, Boolean(opts.deliveryClosed))) {
      throw new ApiError(403, "Original download is locked until final delivery is complete");
    }
    key = String(asset.originalKey || asset.originalUrl || "");
  }
  if (kind === "variant") {
    const variant = variants.find((item) => String(item.id) === String(opts.variantId || "original")) as Record<string, unknown> | undefined;
    if (!variant) throw new ApiError(404, "Media variant not found");
    label = String(variant.label || variant.id);
    key = String(variant.key || asset.originalKey || asset.originalUrl || "");
  }

  if (!key) throw new ApiError(404, "Media URL is not available yet");
  if (isDevPlaceholder(key)) {
    if (!areDevPlaceholdersAllowed()) throw new ApiError(403, "Development placeholder media is disabled");
    return { url: placeholderUrl(asset, kind), key, kind, label };
  }
  if (/^https?:\/\//i.test(key)) return { url: key, key, kind, label };
  return { url: await getPresignedUrl(key, 3600), key, kind, label };
}

export function publicMediaDto(asset: DbRow | null): DbRow | null {
  if (!asset) return null;
  return {
    id: asset.id,
    projectFileId: asset.projectFileId,
    fileUploadId: asset.fileUploadId,
    status: asset.status,
    scanStatus: asset.scanStatus,
    processingStatus: asset.processingStatus,
    mimeType: asset.mimeType,
    fileSize: Number(asset.fileSize || 0),
    posterReady: Boolean(asset.posterKey),
    previewReady: Boolean(asset.previewKey) || String(asset.status) === "PLACEHOLDER",
    watermarkedReady: Boolean(asset.watermarkedKey) || Boolean(asset.previewKey),
    variants: Array.isArray(asset.variants) ? asset.variants : [],
    metadata: asset.metadata || {},
    error: asset.error,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}
