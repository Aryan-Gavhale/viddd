import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const tables = [
  "NotificationPreference",
  "PaymentMethodRecord",
  "BillingProfile",
  "UserSession",
  "ConnectedAccount",
  "TeamMember",
  "VideoPreference",
  "PrivacyPreference",
];

const userColumns = [
  "stripeCustomerId",
  "emailVerified",
  "pendingEmail",
  "twoFactorSecret",
  "twoFactorEnabled",
  "theme",
  "accentColor",
  "language",
  "fontSize",
  "deletionRequestedAt",
  "responseTimeHours",
  "passwordResetToken",
];

const fpColumns = ["stripeConnectedAccountId", "stripePayoutsEnabled", "stripeOnboardingComplete"];

(async () => {
  let allOk = true;

  for (const t of tables) {
    const res = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = $1)`,
      [t]
    );
    const ok = res.rows[0].exists;
    console.log(`table  ${t.padEnd(28)} ${ok ? "OK" : "MISSING"}`);
    if (!ok) allOk = false;
  }

  for (const c of userColumns) {
    const res = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name=$1)`,
      [c]
    );
    const ok = res.rows[0].exists;
    console.log(`User   ${c.padEnd(28)} ${ok ? "OK" : "MISSING"}`);
    if (!ok) allOk = false;
  }

  for (const c of fpColumns) {
    const res = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='FreelancerProfile' AND column_name=$1)`,
      [c]
    );
    const ok = res.rows[0].exists;
    console.log(`FP     ${c.padEnd(28)} ${ok ? "OK" : "MISSING"}`);
    if (!ok) allOk = false;
  }

  // Sentinel user
  const sent = await pool.query(
    `SELECT "id", "firstname" FROM "User" WHERE "email" = 'deleted-user@vidlancing.invalid'`
  );
  console.log(`sentinel __deleted_user__       ${sent.rows[0] ? "OK" : "MISSING"}`);
  if (!sent.rows[0]) allOk = false;

  await pool.end();
  process.exit(allOk ? 0 : 1);
})();
