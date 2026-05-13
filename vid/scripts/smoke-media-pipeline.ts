/* eslint-disable no-console */
import "dotenv/config";
process.env.ALLOW_DEV_PLACEHOLDER_UPLOADS ||= "true";
import { sql, sqlOne } from "../src/db.js";
import { createOrUpdateMediaAsset, getMediaAssetById, queueMediaCleanup, updateMediaAsset } from "../src/Services/mediaAsset.service.js";
import { buildMediaUrl, publicMediaDto } from "../src/Services/mediaAccess.service.js";
import type { AuthUser } from "../src/types/index.js";

(async () => {
  const user = await sqlOne(`SELECT "id", "email", "role" FROM "User" ORDER BY "id" ASC LIMIT 1`, []);
  if (!user) {
    console.log("SKIP: no users found for media smoke test");
    process.exit(0);
  }

  const authUser: AuthUser = {
    id: Number(user.id),
    email: String(user.email || "smoke@example.com"),
    role: String(user.role || "CLIENT") as AuthUser["role"],
  };

  const asset = await createOrUpdateMediaAsset({
    sourceType: "FILE_UPLOAD",
    ownerId: authUser.id,
    originalKey: `dev-placeholder/media-smoke/${Date.now()}.mp4`,
    originalUrl: `dev-placeholder/media-smoke/${Date.now()}.mp4`,
    mimeType: "video/mp4",
    fileSize: 12345,
    metadata: { smoke: true },
  });

  if (!asset?.id) throw new Error("MediaAsset was not created");
  if (asset.status !== "PLACEHOLDER") throw new Error(`Expected PLACEHOLDER status, got ${asset.status}`);

  const dto = publicMediaDto(await getMediaAssetById(Number(asset.id)));
  if (!dto?.id) throw new Error("MediaAsset DTO mapping failed");

  const url = await buildMediaUrl(asset, "preview", authUser, { deliveryClosed: true });
  if (!url.url.startsWith("data:text/plain")) throw new Error("Placeholder preview URL was not generated");

  await updateMediaAsset(Number(asset.id), {
    status: "READY",
    scanStatus: "SKIPPED_DEV",
    processingStatus: "READY",
    variants: [{ id: "original", label: "Original", key: asset.originalKey, ready: true, kind: "original" }],
  });
  const ready = await getMediaAssetById(Number(asset.id));
  if (ready?.status !== "READY") throw new Error("MediaAsset status transition failed");

  try {
    await queueMediaCleanup(Number(asset.id));
  } catch (error) {
    console.warn("Cleanup queue unavailable during smoke test:", (error as Error).message);
  }
  await sql(`UPDATE "MediaAsset" SET "deletedAt" = NOW() WHERE "id" = $1`, [asset.id]);

  console.log("Media pipeline smoke passed", { assetId: asset.id });
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
