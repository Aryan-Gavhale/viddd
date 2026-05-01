/* eslint-disable no-console */
import "dotenv/config";
import { sql } from "../src/db.js";

(async () => {
  console.log("=== Smoke: workspace endpoints query targets ===\n");
  try {
    const projects = await sql(
      `SELECT j.id, j.title, j.status,
              (SELECT MAX(timestamp) FROM "Message" m WHERE m."jobId" = j.id) AS last_message_at,
              (SELECT COUNT(*)::int FROM "Timeline" t WHERE t."jobId" = j.id) AS milestone_count
         FROM "Job" j
         WHERE j."deletedAt" IS NULL
         ORDER BY j.id DESC LIMIT 10`
    );
    console.log("Jobs (should not throw):");
    for (const j of projects) console.log(`  #${j.id}  ${j.status}  msgs@${j.last_message_at}  milestones=${j.milestone_count}`);

    console.log("\nMessage query (was 500 before):");
    const msgs = await sql(
      `SELECT m.id, m.content, m.timestamp FROM "Message" m
        WHERE m."jobId" = $1 AND m."deletedAt" IS NULL AND (NOT COALESCE(m."isDeleted", false))
        ORDER BY m.timestamp DESC LIMIT 5`,
      [projects[0]?.id || 1]
    );
    console.log(`  Loaded ${msgs.length} messages OK`);

    console.log("\nProjectFile / PinnedMessage tables exist:");
    const pf = await sql(`SELECT COUNT(*)::int AS c FROM "ProjectFile"`);
    const pm = await sql(`SELECT COUNT(*)::int AS c FROM "PinnedMessage"`);
    console.log(`  ProjectFile rows=${pf[0].c}, PinnedMessage rows=${pm[0].c}`);

    console.log("\nALL OK");
  } catch (e) {
    console.error("SMOKE FAILED:", (e as Error).message);
    process.exitCode = 1;
  }
  process.exit();
})();
