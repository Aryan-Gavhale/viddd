// Applies the settings foundation migration via the existing pg pool.
// Idempotent — safe to re-run.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(
  __dirname,
  "..",
  "prisma",
  "migrations",
  "20260520_settings_foundation.sql"
);

const sql = fs.readFileSync(migrationPath, "utf8");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

(async () => {
  const client = await pool.connect();
  try {
    console.log("Applying 20260520_settings_foundation.sql …");
    await client.query(sql);
    await client.query(
      `CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());
       INSERT INTO _migrations (name) VALUES ('20260520_settings_foundation.sql') ON CONFLICT DO NOTHING;`
    );
    console.log("OK ✔");
  } catch (err) {
    console.error("MIGRATION FAILED:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
