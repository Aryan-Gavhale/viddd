/* eslint-disable no-console */
import "dotenv/config";
import { sql } from "../src/db.js";

(async () => {
  await sql(
    `CREATE TABLE IF NOT EXISTS "FinalDelivery" (
      "id" SERIAL PRIMARY KEY,
      "scopeType" VARCHAR(10) NOT NULL,
      "orderId" INTEGER,
      "jobId" INTEGER,
      "submittedById" INTEGER NOT NULL,
      "reviewedById" INTEGER,
      "status" VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
      "version" INTEGER NOT NULL DEFAULT 1,
      "releaseNotes" TEXT,
      "reviewNote" TEXT,
      "finalFileIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "revisionIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "sourceIncluded" BOOLEAN NOT NULL DEFAULT false,
      "reviewDueAt" TIMESTAMP,
      "submittedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "reviewedAt" TIMESTAMP,
      "approvedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "FinalDelivery_scope_check" CHECK (
        ("scopeType" = 'ORDER' AND "orderId" IS NOT NULL AND "jobId" IS NULL)
        OR
        ("scopeType" = 'JOB' AND "jobId" IS NOT NULL AND "orderId" IS NULL)
      )
    )`,
    []
  );

  await sql(`CREATE INDEX IF NOT EXISTS "idx_final_delivery_order" ON "FinalDelivery" ("orderId", "createdAt" DESC)`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_final_delivery_job" ON "FinalDelivery" ("jobId", "createdAt" DESC)`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_final_delivery_status" ON "FinalDelivery" ("status", "reviewDueAt")`, []);

  await sql(`ALTER TABLE "FinalDelivery" ADD COLUMN IF NOT EXISTS "reviewFileIds" JSONB NOT NULL DEFAULT '[]'::jsonb`, []);
  await sql(`ALTER TABLE "FinalDelivery" ADD COLUMN IF NOT EXISTS "masterFileIds" JSONB NOT NULL DEFAULT '[]'::jsonb`, []);
  await sql(`ALTER TABLE "FinalDelivery" ADD COLUMN IF NOT EXISTS "masterDeliveredAt" TIMESTAMP`, []);
  await sql(
    `UPDATE "FinalDelivery"
        SET "reviewFileIds" = COALESCE(NULLIF("reviewFileIds", '[]'::jsonb), "finalFileIds", '[]'::jsonb)
      WHERE "reviewFileIds" = '[]'::jsonb AND "finalFileIds" <> '[]'::jsonb`,
    []
  );

  await sql(`ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "orderId" INTEGER`, []);
  await sql(`ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "uploadedBy" INTEGER`, []);
  await sql(`ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "fileKey" TEXT`, []);
  await sql(`ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "fileSize" BIGINT`, []);
  await sql(`ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "folder" TEXT NOT NULL DEFAULT '/'`, []);
  await sql(`ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "isLatest" BOOLEAN NOT NULL DEFAULT true`, []);
  await sql(`ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]'::jsonb`, []);
  await sql(`ALTER TABLE "ProjectFile" ALTER COLUMN "jobId" DROP NOT NULL`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_project_file_order_folder" ON "ProjectFile" ("orderId", "folder", "isLatest")`, []);

  console.log("FinalDelivery table reconciled");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
