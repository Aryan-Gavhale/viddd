/* eslint-disable no-console */
/**
 * Reconcile the Neon "Message" table with what the production code expects.
 *
 * Idempotent — safe to run repeatedly. Adds the columns used by the
 * controller (isDeleted, deliveredAt, readAt) and relaxes legacy NOT NULL
 * constraints that the new room-based messaging model no longer needs
 * (receiverId, parentId).
 */
import "dotenv/config";
import { sql } from "../src/db.js";

async function exec(stmt: string, label: string) {
  try {
    await sql(stmt);
    console.log(`OK    ${label}`);
  } catch (e) {
    console.warn(`SKIP  ${label}: ${(e as Error).message}`);
  }
}

(async () => {
  console.log("Reconciling Message table…\n");

  await exec(
    `ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false`,
    "add isDeleted"
  );
  await exec(
    `ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3)`,
    "add deliveredAt"
  );
  await exec(
    `ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3)`,
    "add readAt"
  );
  await exec(
    `ALTER TABLE "Message" ALTER COLUMN "receiverId" DROP NOT NULL`,
    "make receiverId nullable (room-based chat)"
  );
  await exec(
    `ALTER TABLE "Message" ALTER COLUMN "parentId" DROP NOT NULL`,
    "ensure parentId nullable"
  );

  await exec(
    `CREATE INDEX IF NOT EXISTS "Message_jobId_timestamp_idx" ON "Message" ("jobId", "timestamp")`,
    "index Message(jobId,timestamp)"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "Message_orderId_timestamp_idx" ON "Message" ("orderId", "timestamp")`,
    "index Message(orderId,timestamp)"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "Message_senderId_timestamp_idx" ON "Message" ("senderId", "timestamp")`,
    "index Message(senderId,timestamp)"
  );

  // ── Workspace: Timeline (job-scoped milestones / Gantt) ──
  await exec(
    `CREATE TABLE IF NOT EXISTS "Timeline" (
       "id"          SERIAL PRIMARY KEY,
       "jobId"       INTEGER NOT NULL REFERENCES "Job"("id") ON DELETE CASCADE,
       "title"       TEXT NOT NULL,
       "description" TEXT,
       "startDate"   TIMESTAMP,
       "endDate"     TIMESTAMP,
       "isCompleted" BOOLEAN NOT NULL DEFAULT false,
       "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
       "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
     )`,
    "create Timeline"
  );
  await exec(
    `ALTER TABLE "Timeline" ADD COLUMN IF NOT EXISTS "progress" INTEGER DEFAULT 0`,
    "Timeline.progress"
  );
  await exec(
    `ALTER TABLE "Timeline" ADD COLUMN IF NOT EXISTS "color" VARCHAR(20)`,
    "Timeline.color"
  );
  await exec(
    `ALTER TABLE "Timeline" ADD COLUMN IF NOT EXISTS "dependsOnId" INTEGER REFERENCES "Timeline"("id") ON DELETE SET NULL`,
    "Timeline.dependsOnId"
  );
  await exec(
    `ALTER TABLE "Timeline" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'PENDING'`,
    "Timeline.status"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "idx_timeline_job" ON "Timeline" ("jobId")`,
    "index Timeline(jobId)"
  );

  // ── Workspace: FileUpload (job/order-scoped uploads) ──
  await exec(
    `CREATE TABLE IF NOT EXISTS "FileUpload" (
       id SERIAL PRIMARY KEY,
       "userId" INT NOT NULL REFERENCES "User"(id),
       "uploadId" TEXT NOT NULL,
       "s3Key" TEXT NOT NULL,
       "fileName" TEXT NOT NULL,
       "contentType" TEXT NOT NULL,
       "fileSize" BIGINT NOT NULL,
       "orderId" INT REFERENCES "Order"(id),
       "jobId" INT REFERENCES "Job"(id),
       "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
       "totalParts" INT,
       "completedParts" INT DEFAULT 0,
       "finalUrl" TEXT,
       "createdAt" TIMESTAMPTZ DEFAULT NOW(),
       "updatedAt" TIMESTAMPTZ DEFAULT NOW()
     )`,
    "create FileUpload"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "FileUpload_userId_idx" ON "FileUpload" ("userId")`,
    "index FileUpload(userId)"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "FileUpload_jobId_idx" ON "FileUpload" ("jobId")`,
    "index FileUpload(jobId)"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "FileUpload_orderId_idx" ON "FileUpload" ("orderId")`,
    "index FileUpload(orderId)"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "FileUpload_uploadId_idx" ON "FileUpload" ("uploadId")`,
    "index FileUpload(uploadId)"
  );

  // ── Workspace: ProjectFile (richer shared library w/ approval state) ──
  await exec(
    `CREATE TABLE IF NOT EXISTS "ProjectFile" (
       "id" SERIAL PRIMARY KEY,
       "jobId" INT NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
       "uploaderId" INT NOT NULL REFERENCES "User"(id),
       "fileName" TEXT NOT NULL,
       "url" TEXT NOT NULL,
       "mimeType" TEXT,
       "size" BIGINT NOT NULL DEFAULT 0,
       "category" TEXT NOT NULL DEFAULT 'deliverable',
       "version" INT NOT NULL DEFAULT 1,
       "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
       "note" TEXT,
       "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    "create ProjectFile"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "ProjectFile_jobId_idx" ON "ProjectFile" ("jobId")`,
    "index ProjectFile(jobId)"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "ProjectFile_status_idx" ON "ProjectFile" ("status")`,
    "index ProjectFile(status)"
  );

  // ── Workspace: PinnedMessage (lightweight, helps client/freelancer focus) ──
  await exec(
    `CREATE TABLE IF NOT EXISTS "PinnedMessage" (
       "id" SERIAL PRIMARY KEY,
       "jobId" INT NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
       "messageId" TEXT NOT NULL,
       "pinnedById" INT NOT NULL REFERENCES "User"(id),
       "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE ("jobId", "messageId")
     )`,
    "create PinnedMessage"
  );
  await exec(
    `CREATE INDEX IF NOT EXISTS "PinnedMessage_jobId_idx" ON "PinnedMessage" ("jobId")`,
    "index PinnedMessage(jobId)"
  );

  console.log("\nDone.");
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
