/* eslint-disable no-console */
import "dotenv/config";
import { sql, sqlOne } from "../src/db.js";

(async () => {
  try {
    const jobs = await sql<{ id: number; postedById: number; freelancerId: number | null; title: string }>(
      `SELECT id, posted_by_id AS "postedById", freelancer_id AS "freelancerId", title
       FROM "Job"
       WHERE "deletedAt" IS NULL
       ORDER BY id DESC LIMIT 20`
    );
    console.log("Recent jobs:");
    for (const j of jobs) {
      console.log(
        `  job#${j.id}  postedBy=${j.postedById}  freelancer=${j.freelancerId ?? "—"}  title=${j.title?.slice(0, 50)}`
      );
    }

    if (jobs.length === 0) return;

    const jobId = jobs[0].id;
    console.log(`\n[Test] Fetching messages for job ${jobId}…`);

    try {
      const msgs = await sql(
        `SELECT m.* FROM "Message" m
         WHERE m."jobId" = $1 AND m."deletedAt" IS NULL AND (NOT COALESCE(m."isDeleted", false))
         ORDER BY m.timestamp ASC
         LIMIT 50`,
        [jobId]
      );
      console.log(`  Loaded ${msgs.length} messages OK`);
      if (msgs[0]) console.log("  First msg sample:", JSON.stringify(msgs[0], null, 2).slice(0, 400));
    } catch (e) {
      console.error("  MESSAGE QUERY FAILED:", (e as Error).message);
    }

    try {
      const reactions = await sql(
        `SELECT mr.id, mr."messageId", mr."userId", mr.emoji
         FROM "MessageReaction" mr LIMIT 5`
      );
      console.log(`\n[Test] MessageReaction table OK (${reactions.length} sample rows)`);
    } catch (e) {
      console.error("\n[Test] MessageReaction table FAILED:", (e as Error).message);
    }

    try {
      const cols = await sql(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'Message' ORDER BY ordinal_position`
      );
      console.log("\nMessage columns:");
      for (const c of cols) console.log(`  ${c.column_name}  ${c.data_type}  null=${c.is_nullable}`);
    } catch (e) {
      console.error("Schema query failed:", (e as Error).message);
    }
  } catch (err) {
    console.error("Top-level failure:", err);
  } finally {
    process.exit(0);
  }
})();
