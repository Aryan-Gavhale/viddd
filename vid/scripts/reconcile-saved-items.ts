/* eslint-disable no-console */
import "dotenv/config";
import { sql } from "../src/db.js";

(async () => {
  console.log("Reconciling SavedItem table...");
  await sql(`
    CREATE TABLE IF NOT EXISTS "SavedItem" (
      id            SERIAL PRIMARY KEY,
      "user_id"     INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "entityType"  TEXT NOT NULL CHECK ("entityType" IN ('GIG','FREELANCER','JOB')),
      "entityId"    INTEGER NOT NULL,
      note          TEXT,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      UNIQUE ("user_id", "entityType", "entityId")
    )
  `);
  await sql(`
    CREATE INDEX IF NOT EXISTS idx_saved_item_user_created
      ON "SavedItem" ("user_id", "createdAt" DESC)
  `);
  await sql(`
    CREATE INDEX IF NOT EXISTS idx_saved_item_user_type
      ON "SavedItem" ("user_id", "entityType")
  `);
  console.log("SavedItem table ready.");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
