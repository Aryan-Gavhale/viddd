/* eslint-disable no-console */
import "dotenv/config";
import { sql } from "../src/db.js";

(async () => {
  await sql(
    `CREATE TABLE IF NOT EXISTS "MediaAsset" (
      "id" SERIAL PRIMARY KEY,
      "sourceType" VARCHAR(30) NOT NULL,
      "projectFileId" INTEGER,
      "fileUploadId" INTEGER,
      "ownerId" INTEGER NOT NULL,
      "scopeType" VARCHAR(10),
      "orderId" INTEGER,
      "jobId" INTEGER,
      "originalKey" TEXT,
      "originalUrl" TEXT,
      "mimeType" VARCHAR(200),
      "fileSize" BIGINT NOT NULL DEFAULT 0,
      "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      "scanStatus" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      "processingStatus" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      "posterKey" TEXT,
      "previewKey" TEXT,
      "watermarkedKey" TEXT,
      "variants" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "error" TEXT,
      "cleanupAfter" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "deletedAt" TIMESTAMP,
      CONSTRAINT "MediaAsset_scope_check" CHECK (
        ("scopeType" IS NULL AND "orderId" IS NULL AND "jobId" IS NULL)
        OR ("scopeType" = 'ORDER' AND "orderId" IS NOT NULL AND "jobId" IS NULL)
        OR ("scopeType" = 'JOB' AND "jobId" IS NOT NULL AND "orderId" IS NULL)
      )
    )`,
    []
  );

  await sql(`ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "cleanupAfter" TIMESTAMP`, []);
  await sql(`ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`, []);
  await sql(`ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "error" TEXT`, []);
  await sql(`ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "variants" JSONB NOT NULL DEFAULT '[]'::jsonb`, []);
  await sql(`ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb`, []);

  await sql(
    `CREATE UNIQUE INDEX IF NOT EXISTS "idx_media_asset_project_file_active"
       ON "MediaAsset" ("projectFileId")
       WHERE "projectFileId" IS NOT NULL AND "deletedAt" IS NULL`,
    []
  );
  await sql(
    `CREATE UNIQUE INDEX IF NOT EXISTS "idx_media_asset_file_upload_active"
       ON "MediaAsset" ("fileUploadId")
       WHERE "fileUploadId" IS NOT NULL AND "deletedAt" IS NULL`,
    []
  );
  await sql(`CREATE INDEX IF NOT EXISTS "idx_media_asset_order" ON "MediaAsset" ("orderId", "createdAt" DESC)`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_media_asset_job" ON "MediaAsset" ("jobId", "createdAt" DESC)`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_media_asset_status" ON "MediaAsset" ("status", "scanStatus", "processingStatus")`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_media_asset_cleanup" ON "MediaAsset" ("cleanupAfter") WHERE "deletedAt" IS NULL`, []);

  console.log("MediaAsset table reconciled");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
