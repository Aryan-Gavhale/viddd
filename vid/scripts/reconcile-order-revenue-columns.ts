/* eslint-disable no-console */
import "dotenv/config";
import { sql } from "../src/db.js";

(async () => {
  await sql(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "platformFeePercent" DOUBLE PRECISION DEFAULT 12.5`, []);
  await sql(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "platformFeeAmount" INTEGER DEFAULT 0`, []);
  await sql(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "clientFeePercent" DOUBLE PRECISION DEFAULT 3.5`, []);
  await sql(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "clientFeeAmount" INTEGER DEFAULT 0`, []);
  await sql(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "freelancerPayout" INTEGER DEFAULT 0`, []);

  await sql(`UPDATE "Order" SET "platformFeePercent" = COALESCE("platformFeePercent", 12.5)`, []);
  await sql(`UPDATE "Order" SET "platformFeeAmount" = COALESCE("platformFeeAmount", 0)`, []);
  await sql(`UPDATE "Order" SET "clientFeePercent" = COALESCE("clientFeePercent", 3.5)`, []);
  await sql(`UPDATE "Order" SET "clientFeeAmount" = COALESCE("clientFeeAmount", 0)`, []);
  await sql(`UPDATE "Order" SET "freelancerPayout" = COALESCE("freelancerPayout", "totalPrice"::integer)`, []);

  await sql(
    `CREATE TABLE IF NOT EXISTS "PlatformRevenue" (
      "id" SERIAL PRIMARY KEY,
      "type" VARCHAR(30) NOT NULL,
      "amount" INTEGER NOT NULL DEFAULT 0,
      "sourceId" INTEGER,
      "sourceType" VARCHAR(30),
      "description" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    []
  );
  await sql(`CREATE INDEX IF NOT EXISTS "idx_revenue_type" ON "PlatformRevenue" ("type")`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_revenue_date" ON "PlatformRevenue" ("createdAt")`, []);

  console.log("Order revenue columns and platform revenue table reconciled");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
