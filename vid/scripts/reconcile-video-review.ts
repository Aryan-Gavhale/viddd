/* eslint-disable no-console */
/**
 * Reconcile Video Review schema additions:
 *   - VideoReviewComment table (timecoded comments + drawings)
 *   - CoWatchSession + CoWatchParticipant tables (for live co-watch)
 *   - VoiceNote table (for in-chat voice messages metadata)
 * All idempotent.
 */
import "dotenv/config";
import { sql } from "../src/db.js";

async function exec(stmt: string, label: string) {
  try {
    await sql(stmt);
    console.log(`  ✓ ${label}`);
  } catch (e) {
    console.error(`  ✗ ${label} -> ${(e as Error).message}`);
    throw e;
  }
}

(async () => {
  console.log("Reconciling Video Review tables…\n");

  // ─── VideoReviewComment ───────────────────────────────────────────────
  await exec(
    `CREATE TABLE IF NOT EXISTS "VideoReviewComment" (
       id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       "jobId"       INTEGER NOT NULL,
       "fileId"      INTEGER NOT NULL,
       "authorId"    INTEGER NOT NULL,
       "timestampSec" NUMERIC(10,3) NOT NULL DEFAULT 0,
       "endTimestampSec" NUMERIC(10,3),
       content       TEXT NOT NULL,
       drawing       JSONB,
       "parentId"    UUID REFERENCES "VideoReviewComment"(id) ON DELETE CASCADE,
       status        TEXT NOT NULL DEFAULT 'OPEN',
       "resolvedById" INTEGER,
       "resolvedAt"   TIMESTAMP(3),
       "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
       "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW()
     )`,
    "create VideoReviewComment table"
  );

  await exec(
    `CREATE INDEX IF NOT EXISTS idx_vrc_file ON "VideoReviewComment"("fileId", status)`,
    "index vrc(fileId,status)"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS idx_vrc_job ON "VideoReviewComment"("jobId")`,
    "index vrc(jobId)"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS idx_vrc_parent ON "VideoReviewComment"("parentId")`,
    "index vrc(parentId)"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS idx_vrc_timestamp ON "VideoReviewComment"("fileId", "timestampSec")`,
    "index vrc(fileId,timestampSec)"
  );

  // ─── CoWatchSession (synced playback rooms scoped per file) ───────────
  await exec(
    `CREATE TABLE IF NOT EXISTS "CoWatchSession" (
       id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       "jobId"       INTEGER NOT NULL,
       "fileId"      INTEGER NOT NULL,
       "hostId"      INTEGER NOT NULL,
       "currentTimeSec" NUMERIC(10,3) NOT NULL DEFAULT 0,
       "isPlaying"   BOOLEAN NOT NULL DEFAULT false,
       "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
       "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
       "endedAt"     TIMESTAMP(3)
     )`,
    "create CoWatchSession table"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS idx_cws_active ON "CoWatchSession"("fileId") WHERE "endedAt" IS NULL`,
    "index cws active"
  );

  // ─── ProjectFile review summary cache columns ─────────────────────────
  await exec(
    `ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "openCommentCount" INTEGER NOT NULL DEFAULT 0`,
    "add openCommentCount"
  );
  await exec(
    `ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "totalCommentCount" INTEGER NOT NULL DEFAULT 0`,
    "add totalCommentCount"
  );
  await exec(
    `ALTER TABLE "ProjectFile" ADD COLUMN IF NOT EXISTS "durationSec" NUMERIC(10,3)`,
    "add durationSec"
  );

  console.log("\nDone.");
  process.exit(0);
})().catch(() => process.exit(1));
