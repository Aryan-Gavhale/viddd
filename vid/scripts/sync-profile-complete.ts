import "dotenv/config";
import pg from "pg";
import { isFreelancerProfileComplete } from "../src/Utils/profileUtils.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const fps = await pool.query(`
    SELECT fp.*, u."id" AS "uid", u."isProfileComplete" AS "currentFlag"
    FROM "FreelancerProfile" fp
    JOIN "User" u ON u."id" = fp."user_id"
    WHERE u."role" = 'FREELANCER'
  `);
  for (const row of fps.rows) {
    const { uid, currentFlag, user_id, ...rest } = row;
    const isComplete = isFreelancerProfileComplete({ ...rest, userId: user_id });
    if (isComplete !== currentFlag) {
      await pool.query(
        `UPDATE "User" SET "isProfileComplete" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        [isComplete, uid]
      );
      console.log(`Updated user ${uid}: isProfileComplete ${currentFlag} -> ${isComplete}`);
    } else {
      console.log(`User ${uid}: already in sync (${currentFlag})`);
    }
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
