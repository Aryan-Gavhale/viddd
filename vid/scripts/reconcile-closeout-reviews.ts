/* eslint-disable no-console */
import "dotenv/config";
import { sql } from "../src/db.js";

(async () => {
  await sql(
    `CREATE TABLE IF NOT EXISTS "CounterpartyReview" (
      "id" SERIAL PRIMARY KEY,
      "scopeType" VARCHAR(10) NOT NULL,
      "orderId" INTEGER,
      "jobId" INTEGER,
      "reviewerId" INTEGER NOT NULL,
      "revieweeId" INTEGER NOT NULL,
      "reviewerRole" VARCHAR(20) NOT NULL,
      "revieweeRole" VARCHAR(20) NOT NULL,
      "rating" INTEGER NOT NULL,
      "criteriaRatings" JSONB NOT NULL DEFAULT '{}'::jsonb,
      "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "publicComment" TEXT,
      "privateNote" TEXT,
      "wouldWorkAgain" BOOLEAN NOT NULL DEFAULT true,
      "moderationStatus" VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "deletedAt" TIMESTAMP,
      CONSTRAINT "CounterpartyReview_scope_check" CHECK (
        ("scopeType" = 'ORDER' AND "orderId" IS NOT NULL AND "jobId" IS NULL)
        OR
        ("scopeType" = 'JOB' AND "jobId" IS NOT NULL AND "orderId" IS NULL)
      ),
      CONSTRAINT "CounterpartyReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
      CONSTRAINT "CounterpartyReview_no_self_check" CHECK ("reviewerId" <> "revieweeId")
    )`,
    []
  );

  await sql(`ALTER TABLE "CounterpartyReview" ADD COLUMN IF NOT EXISTS "privateNote" TEXT`, []);
  await sql(`ALTER TABLE "CounterpartyReview" ADD COLUMN IF NOT EXISTS "wouldWorkAgain" BOOLEAN NOT NULL DEFAULT true`, []);
  await sql(`ALTER TABLE "CounterpartyReview" ADD COLUMN IF NOT EXISTS "moderationStatus" VARCHAR(30) NOT NULL DEFAULT 'APPROVED'`, []);
  await sql(`ALTER TABLE "CounterpartyReview" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`, []);

  await sql(
    `CREATE UNIQUE INDEX IF NOT EXISTS "idx_counterparty_review_unique_active"
       ON "CounterpartyReview" ("scopeType", COALESCE("orderId", 0), COALESCE("jobId", 0), "reviewerId")
       WHERE "deletedAt" IS NULL`,
    []
  );
  await sql(`CREATE INDEX IF NOT EXISTS "idx_counterparty_review_reviewee" ON "CounterpartyReview" ("revieweeId", "createdAt" DESC)`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_counterparty_review_order" ON "CounterpartyReview" ("orderId", "createdAt" DESC)`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_counterparty_review_job" ON "CounterpartyReview" ("jobId", "createdAt" DESC)`, []);

  console.log("CounterpartyReview table reconciled");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
