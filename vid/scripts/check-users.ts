import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const users = await pool.query(`
    SELECT u."id", u."email", u."role", u."isProfileComplete",
           fp."city", fp."state", fp."pinCode", fp."jobTitle", fp."overview",
           fp."skills", fp."minimumRate", fp."maximumRate", fp."weeklyHours",
           fp."availabilityStatus", fp."experienceLevel"
    FROM "User" u
    LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id"
    WHERE u."role" = 'FREELANCER'
    ORDER BY u."id" DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(users.rows, null, 2));
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
