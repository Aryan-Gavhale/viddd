/* eslint-disable no-console */
import "dotenv/config";
import { sql } from "../src/db.js";

(async () => {
  await sql(`ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "stripeConnectedAccountId" TEXT`, []);
  await sql(`ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false`, []);
  await sql(`ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false`, []);
  await sql(`CREATE INDEX IF NOT EXISTS "idx_freelancer_stripe_connected_account" ON "FreelancerProfile" ("stripeConnectedAccountId")`, []);
  console.log("Payment hardening columns reconciled");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
