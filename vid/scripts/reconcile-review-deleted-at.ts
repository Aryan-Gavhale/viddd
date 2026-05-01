/* eslint-disable no-console */
import "dotenv/config";
import { sql } from "../src/db.js";

(async () => {
  console.log("Adding missing deletedAt column to Review …");
  await sql(
    `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`
  );
  await sql(
    `CREATE INDEX IF NOT EXISTS idx_review_deleted_at ON "Review"("deletedAt") WHERE "deletedAt" IS NULL`
  );
  console.log("Done.");
  process.exit(0);
})();
