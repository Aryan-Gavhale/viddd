/**
 * Lazy-upsert helpers for the per-user "preference" tables.
 *
 * The Settings backend relies on side-tables (NotificationPreference,
 * VideoPreference, PrivacyPreference, BillingProfile) that do not have rows
 * for users created before the foundation migration. Rather than running a
 * one-shot backfill we lazy-create the row with defaults the first time any
 * controller reads it. This keeps the migration small and idempotent for
 * deployments that haven't yet fully rolled out.
 */
import { sql, sqlOne } from "../db.js";
import type { DbRow } from "../types/index.js";

export async function ensureNotificationPreference(userId: number): Promise<DbRow> {
  await sql(
    `INSERT INTO "NotificationPreference" ("userId")
       VALUES ($1)
     ON CONFLICT ("userId") DO NOTHING`,
    [userId]
  );
  const row = await sqlOne(
    `SELECT * FROM "NotificationPreference" WHERE "userId" = $1`,
    [userId]
  );
  return row as DbRow;
}

export async function ensureVideoPreference(userId: number): Promise<DbRow> {
  await sql(
    `INSERT INTO "VideoPreference" ("userId")
       VALUES ($1)
     ON CONFLICT ("userId") DO NOTHING`,
    [userId]
  );
  const row = await sqlOne(
    `SELECT * FROM "VideoPreference" WHERE "userId" = $1`,
    [userId]
  );
  return row as DbRow;
}

export async function ensurePrivacyPreference(userId: number): Promise<DbRow> {
  await sql(
    `INSERT INTO "PrivacyPreference" ("userId")
       VALUES ($1)
     ON CONFLICT ("userId") DO NOTHING`,
    [userId]
  );
  const row = await sqlOne(
    `SELECT * FROM "PrivacyPreference" WHERE "userId" = $1`,
    [userId]
  );
  return row as DbRow;
}

export async function ensureBillingProfile(userId: number): Promise<DbRow> {
  await sql(
    `INSERT INTO "BillingProfile" ("userId")
       VALUES ($1)
     ON CONFLICT ("userId") DO NOTHING`,
    [userId]
  );
  const row = await sqlOne(
    `SELECT * FROM "BillingProfile" WHERE "userId" = $1`,
    [userId]
  );
  return row as DbRow;
}
