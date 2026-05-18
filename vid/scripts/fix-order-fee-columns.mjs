/* eslint-disable */
// Migrates money-typed columns from INTEGER -> NUMERIC(12,2) so the pricing
// service's cent-precise values (e.g. 11.13) can actually be stored.
//
// Idempotent: skips columns that are already NUMERIC. Re-run safely at any
// time. Tracks completion in `_migrations` so the bash migration runner sees
// it as applied.
import "dotenv/config";
import pg from "pg";
const { Client } = pg;

const TARGETS = [
  { table: "Order",            column: "platformFeeAmount" },
  { table: "Order",            column: "clientFeeAmount" },
  { table: "Order",            column: "freelancerPayout" },
  { table: "PlatformRevenue",  column: "amount" },
  // These tables may not exist yet in this DB; we'll skip silently if so.
  { table: "TemplatePurchase", column: "platformCommission" },
  { table: "TemplatePurchase", column: "sellerPayout" },
];

const dbUrl = process.env.DATABASE_URL;
const ssl =
  /sslmode=require/.test(dbUrl || "") || (dbUrl || "").includes(".neon.tech")
    ? { rejectUnauthorized: false }
    : false;

const c = new Client({ connectionString: dbUrl, ssl });
await c.connect();

await c.query(`
  CREATE TABLE IF NOT EXISTS "_migrations" (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

let altered = 0, skipped = 0, missing = 0;
for (const { table, column } of TARGETS) {
  const col = await c.query(
    `SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  if (col.rowCount === 0) {
    console.log(`SKIP ${table}.${column}: column/table not present`);
    missing++;
    continue;
  }
  if (col.rows[0].data_type === "numeric") {
    console.log(`OK   ${table}.${column}: already numeric`);
    skipped++;
    continue;
  }
  console.log(`ALTER ${table}.${column}: ${col.rows[0].data_type} -> numeric(12,2)`);
  await c.query(
    `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE NUMERIC(12,2) USING ("${column}")::NUMERIC(12,2)`
  );
  await c.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT 0`);
  altered++;
}

await c.query(
  `INSERT INTO "_migrations" (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
  ["20260518_fix_money_column_types"]
);

console.log(`Done. altered=${altered} skipped=${skipped} missing=${missing}`);
await c.end();
