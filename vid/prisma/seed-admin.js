import pg from "pg";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function queryOne(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.\n" +
      "Usage: ADMIN_EMAIL=admin@vidlancing.com ADMIN_PASSWORD=securepass node prisma/seed-admin.js"
    );
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters.");
    process.exit(1);
  }

  const existing = await queryOne(`SELECT "id", "role" FROM "User" WHERE "email" = $1`, [email]);
  if (existing) {
    console.log(`User with email ${email} already exists (id: ${existing.id}, role: ${existing.role}).`);
    if (existing.role !== "ADMIN") {
      await queryOne(`UPDATE "User" SET "role" = 'ADMIN' WHERE "id" = $1 RETURNING "id"`, [existing.id]);
      console.log(`Promoted user ${existing.id} to ADMIN.`);
    }
    await pool.end();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const admin = await queryOne(
    `INSERT INTO "User" ("firstname", "lastname", "email", "password", "country", "role", "isVerified", "isProfileComplete", "username")
     VALUES ($1, $2, $3, $4, $5, 'ADMIN', true, true, $6)
     RETURNING "id", "email"`,
    ["Platform", "Admin", email, hashedPassword, "Global", `admin_${randomBytes(4).toString("hex")}`]
  );

  console.log(`Admin user created: id=${admin.id}, email=${admin.email}`);
  await pool.end();
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
