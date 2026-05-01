/* eslint-disable no-console */
import "dotenv/config";
import { sql } from "../src/db.js";

async function check(name: string) {
  try {
    const cols = await sql(
      `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position`,
      [name]
    );
    console.log(`\n=== ${name} ===`);
    for (const c of cols) {
      console.log(`  ${c.column_name.padEnd(28)} ${String(c.data_type).padEnd(28)} null=${c.is_nullable}`);
    }
    if (!cols.length) console.log("  (table missing)");
  } catch (e) {
    console.error(`  ${name}: ${(e as Error).message}`);
  }
}

(async () => {
  await check("Timeline");
  await check("FileUpload");
  await check("Message");
  process.exit(0);
})();
