#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import pg from "pg";
import bcrypt from "bcrypt";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query(text: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const { rows } = await pool.query(text, params);
  return rows;
}
async function queryOne(text: string, params: unknown[] = []): Promise<Record<string, unknown> | null> {
  const rows = await query(text, params);
  return rows[0] || null;
}

const args = process.argv.slice(2);
const seedAll = args.length === 0;

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL || "admin@vidlancing.com";
  const password = process.env.ADMIN_PASSWORD || "Admin@123456";

  const existing = await queryOne(`SELECT "id" FROM "User" WHERE "email" = $1`, [email]);
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await queryOne(
    `INSERT INTO "User" ("firstname", "lastname", "email", "password", "country", "role", "isActive", "isProfileComplete", "isVerified")
     VALUES ($1, $2, $3, $4, $5, 'ADMIN', true, true, true)
     RETURNING "id", "email"`,
    ["Admin", "User", email, hashed, "US"]
  );
  console.log(`Admin created: ${admin?.email} (id: ${admin?.id})`);
}

async function seedCategories(): Promise<void> {
  const categories = [
    { name: "Video Editing", description: "Professional video editing services" },
    { name: "Motion Graphics", description: "Animated graphics and visual effects" },
    { name: "Color Grading", description: "Professional color correction and grading" },
    { name: "Sound Design", description: "Audio editing, mixing, and sound effects" },
    { name: "Animation", description: "2D and 3D animation services" },
    { name: "VFX", description: "Visual effects and compositing" },
    { name: "Subtitling", description: "Subtitles, captions, and translations" },
    { name: "Thumbnail Design", description: "Custom video thumbnails" },
    { name: "Short Form Content", description: "Reels, TikToks, and Shorts editing" },
    { name: "Documentary", description: "Documentary editing and production" },
    { name: "Wedding & Events", description: "Wedding and event video editing" },
    { name: "Corporate", description: "Corporate and commercial video production" },
    { name: "YouTube", description: "YouTube content creation and editing" },
    { name: "Podcast", description: "Podcast editing and production" },
    { name: "Music Video", description: "Music video editing and post-production" },
  ];

  for (const cat of categories) {
    await queryOne(
      `INSERT INTO "Category" ("name", "description")
       VALUES ($1, $2)
       ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description"
       RETURNING "id"`,
      [cat.name, cat.description]
    );
  }
  console.log(`Seeded ${categories.length} categories`);
}

async function seedBadges(): Promise<void> {
  const badges = [
    { name: "Top Rated", icon: "star", color: "#FFD700", description: "Consistently high-rated freelancer" },
    { name: "Rising Talent", icon: "trending-up", color: "#4CAF50", description: "Promising new freelancer" },
    { name: "Fast Delivery", icon: "zap", color: "#FF5722", description: "Delivers ahead of schedule" },
    { name: "Verified Pro", icon: "check-circle", color: "#2196F3", description: "Identity and skills verified" },
    { name: "100+ Orders", icon: "award", color: "#9C27B0", description: "Completed 100+ orders" },
    { name: "5-Star Average", icon: "star", color: "#FF9800", description: "Maintains 5-star average rating" },
    { name: "Quick Responder", icon: "message-circle", color: "#00BCD4", description: "Responds within 1 hour" },
    { name: "Featured Editor", icon: "film", color: "#E91E63", description: "Featured by Vidlancing team" },
  ];

  for (const badge of badges) {
    const existing = await queryOne(`SELECT "id" FROM "Badge" WHERE "name" = $1`, [badge.name]);
    if (!existing) {
      await queryOne(
        `INSERT INTO "Badge" ("name", "icon", "color", "description") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [badge.name, badge.icon, badge.color, badge.description]
      );
    }
  }
  console.log(`Seeded ${badges.length} badges`);
}

async function seedSkills(): Promise<void> {
  const skills = [
    "Adobe Premiere Pro", "DaVinci Resolve", "Final Cut Pro", "After Effects",
    "Photoshop", "Blender", "Cinema 4D", "Nuke", "Avid Media Composer",
    "Color Grading", "Sound Design", "Motion Graphics", "3D Animation",
    "Video Compositing", "Audio Mixing", "Subtitle Creation", "Storyboarding",
    "Drone Footage Editing", "Live Streaming", "Screen Recording",
  ];

  for (const name of skills) {
    await queryOne(
      `INSERT INTO "Skill" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING RETURNING "id"`,
      [name]
    );
  }
  console.log(`Seeded ${skills.length} skills`);
}

async function seedTestData(): Promise<void> {
  const hashedPw = await bcrypt.hash("Test@12345", 12);

  const client = await queryOne(
    `INSERT INTO "User" ("firstname", "lastname", "email", "password", "country", "role", "isProfileComplete")
     VALUES ($1, $2, $3, $4, $5, 'CLIENT', true)
     ON CONFLICT ("email") DO UPDATE SET "firstname" = EXCLUDED."firstname"
     RETURNING "id", "email"`,
    ["Test", "Client", "testclient@example.com", hashedPw, "US"]
  );

  const freelancer = await queryOne(
    `INSERT INTO "User" ("firstname", "lastname", "email", "password", "country", "role", "isProfileComplete")
     VALUES ($1, $2, $3, $4, $5, 'FREELANCER', true)
     ON CONFLICT ("email") DO UPDATE SET "firstname" = EXCLUDED."firstname"
     RETURNING "id", "email"`,
    ["Test", "Freelancer", "testfreelancer@example.com", hashedPw, "US"]
  );

  if (freelancer) {
    await queryOne(
      `INSERT INTO "FreelancerProfile" ("user_id", "jobTitle", "overview", "skills", "languages", "tools", "availabilityStatus", "experienceLevel", "hourlyRate", "minimumRate", "maximumRate")
       VALUES ($1, $2, $3, $4::text[], $5::text[], $6::text[], $7, $8, $9, $10, $11)
       ON CONFLICT ("user_id") DO NOTHING
       RETURNING "id"`,
      [
        freelancer.id, "Professional Video Editor",
        "Experienced video editor with 5+ years of professional experience.",
        ["Adobe Premiere Pro", "After Effects", "DaVinci Resolve"],
        ["English", "Spanish"], ["Premiere Pro", "After Effects"],
        "FULL_TIME", "EXPERT", 50, 30, 100,
      ]
    );
  }

  console.log(`Seeded test users: client (id: ${client?.id}), freelancer (id: ${freelancer?.id})`);
}

async function main(): Promise<void> {
  try {
    if (seedAll || args.includes("--admin")) await seedAdmin();
    if (seedAll || args.includes("--categories")) await seedCategories();
    if (seedAll || args.includes("--badges")) await seedBadges();
    if (seedAll || args.includes("--skills")) await seedSkills();
    if (seedAll || args.includes("--test-data")) await seedTestData();
    console.log("Seeding complete.");
  } catch (error) {
    console.error("Seeding failed:", (error as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
