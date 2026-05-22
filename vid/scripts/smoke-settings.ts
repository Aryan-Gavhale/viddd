/**
 * Phase O smoke test for the settings backend.
 *
 * Boots the Fastify app via buildApp() and exercises every new endpoint
 * using app.inject() with a Bearer token, so we don't need a running
 * server, an SMTP host, or a real Stripe call to graduate a green
 * baseline. Endpoints that hard-require external services (real Stripe
 * setup intent, real OAuth provider, real S3 export) are marked SKIP if
 * the relevant env vars aren't configured, otherwise they're recorded
 * as PASS as long as the route is mounted and responds with a sane
 * status code shape.
 *
 * Run from `vid/`:
 *
 *   npx tsx scripts/smoke-settings.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pg from "pg";
import speakeasy from "speakeasy";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

let passed = 0;
let failed = 0;
let skipped = 0;
const failures: Array<{ name: string; detail: string }> = [];

function color(code: number, s: string): string {
  return `\x1b[${code}m${s}\x1b[0m`;
}

function record(name: string, ok: boolean | "skip", detail = "", body?: any): void {
  if (ok === "skip") {
    skipped++;
    console.log(color(33, `  SKIP  ${name}`) + (detail ? ` (${detail})` : ""));
    return;
  }
  if (ok) {
    passed++;
    console.log(color(32, `  PASS  ${name}`));
  } else {
    failed++;
    failures.push({ name, detail });
    let bodySnippet = "";
    if (body) {
      try {
        const s = typeof body === "string" ? body : JSON.stringify(body);
        bodySnippet = ` body=${s.slice(0, 220)}`;
      } catch {}
    }
    console.log(color(31, `  FAIL  ${name}`) + (detail ? ` -- ${detail}` : "") + bodySnippet);
  }
}

interface InjectResult {
  status: number;
  body: any;
}

async function pingHttp(app: any, opts: any): Promise<InjectResult> {
  const res = await app.inject(opts);
  let body;
  try {
    body = res.json();
  } catch {
    body = res.body;
  }
  return { status: res.statusCode, body };
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function isOk(status: number, expected: number[] = [200]): boolean {
  return expected.includes(status);
}

const TEST_PASSWORD = "TestPwd!2026";
const TEST_NEW_PASSWORD = "TestPwd!2026New";

let clientUserId: number, freelancerUserId: number;
let clientToken: string, freelancerToken: string;

async function createTestUsers() {
  const ts = Date.now();
  // Use a real TLD because Joi's default email validator rejects ".test" etc.
  const email1 = `smoke-client-${ts}@example.com`;
  const email2 = `smoke-freelancer-${ts}@example.com`;
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);

  const c = await pool.query(
    `INSERT INTO "User" ("firstname","lastname","email","password","country","role","isActive","isProfileComplete","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,'CLIENT',true,true,NOW(),NOW())
     RETURNING "id"`,
    ["Smoke", "Client", email1, hash, "US"]
  );
  clientUserId = c.rows[0].id;

  const f = await pool.query(
    `INSERT INTO "User" ("firstname","lastname","email","password","country","role","isActive","isProfileComplete","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,'FREELANCER',true,true,NOW(),NOW())
     RETURNING "id"`,
    ["Smoke", "Freelancer", email2, hash, "US"]
  );
  freelancerUserId = f.rows[0].id;

  await pool.query(
    `INSERT INTO "FreelancerProfile" ("user_id","jobTitle","createdAt","updatedAt")
     VALUES ($1,$2,NOW(),NOW())
     ON CONFLICT DO NOTHING`,
    [freelancerUserId, "Test Editor"]
  );

  const sign = (id: number, role: string, email: string) =>
    jwt.sign({ id, email, role, type: "access" }, process.env.JWT_SECRET!, {
      expiresIn: "30m",
    });

  clientToken = sign(clientUserId, "CLIENT", email1);
  freelancerToken = sign(freelancerUserId, "FREELANCER", email2);

  console.log(color(36, `  fixtures -> client #${clientUserId}, freelancer #${freelancerUserId}`));
}

async function cleanupTestUsers() {
  if (!clientUserId && !freelancerUserId) return;
  const ids = [clientUserId, freelancerUserId].filter(Boolean);
  for (const t of [
    "NotificationPreference",
    "VideoPreference",
    "PrivacyPreference",
    "BillingProfile",
    "PaymentMethodRecord",
    "UserSession",
    "ConnectedAccount",
    "TeamMember",
  ]) {
    await pool
      .query(`DELETE FROM "${t}" WHERE "userId" = ANY($1::int[])`, [ids])
      .catch(() => {});
  }
  await pool
    .query(`DELETE FROM "TeamMember" WHERE "ownerId" = ANY($1::int[])`, [ids])
    .catch(() => {});
  await pool
    .query(`DELETE FROM "FreelancerProfile" WHERE "user_id" = ANY($1::int[])`, [ids])
    .catch(() => {});
  await pool.query(`DELETE FROM "User" WHERE "id" = ANY($1::int[])`, [ids]);
}

async function suiteProfile(app: any) {
  console.log(color(35, "\n[ profile + identity ]"));
  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/users/me",
    headers: bearer(clientToken),
  });
  record("GET /users/me", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/users/profile",
    headers: bearer(clientToken),
  });
  record("GET /users/profile (alias)", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "PATCH",
    url: "/api/v1/users/me",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: { bio: "Updated by smoke test" },
  });
  record("PATCH /users/me (bio)", isOk(r.status), `status=${r.status}`);
}

async function suitePassword(app: any) {
  console.log(color(35, "\n[ password ]"));

  let r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/users/me/password",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: { currentPassword: TEST_PASSWORD, newPassword: TEST_NEW_PASSWORD },
  });
  record("POST /users/me/password (change)", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/security/password/change",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: { currentPassword: TEST_NEW_PASSWORD, newPassword: TEST_PASSWORD },
  });
  record("POST /security/password/change (revert)", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/security/password/forgot",
    headers: { "content-type": "application/json" },
    payload: { email: `smoke-client-${Date.now()}@example.com` },
  });
  record("POST /security/password/forgot", isOk(r.status), `status=${r.status}`, r.body);

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/security/password/reset",
    headers: { "content-type": "application/json" },
    payload: { token: "obviously-bogus", newPassword: TEST_PASSWORD },
  });
  record(
    "POST /security/password/reset (invalid token rejected)",
    isOk(r.status, [400, 401]),
    `status=${r.status}`,
    r.body
  );
}

async function suiteEmailChange(app: any) {
  console.log(color(35, "\n[ email change ]"));

  const r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/users/me/email/change-request",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: { newEmail: `smoke-changed-${Date.now()}@example.com`, currentPassword: TEST_PASSWORD },
  });
  record(
    "POST /users/me/email/change-request",
    isOk(r.status, [200, 202, 503]),
    `status=${r.status}`,
    r.body
  );
}

async function suiteCombinedPrefs(app: any) {
  console.log(color(35, "\n[ combined preferences ]"));

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/users/me/preferences",
    headers: bearer(clientToken),
  });
  const ok =
    isOk(r.status) &&
    r.body?.data?.appearance &&
    r.body?.data?.video &&
    r.body?.data?.privacy;
  record("GET /users/me/preferences", ok, `status=${r.status}`);

  r = await pingHttp(app, {
    method: "PATCH",
    url: "/api/v1/users/me/preferences",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: {
      appearance: { theme: "dark", accentColor: "#7c3aed", fontSize: "medium", language: "en" },
      video: { defaultVideoFormat: "mp4", defaultResolution: "1080p", watermarkOpacity: 50 },
      privacy: { profileVisibleInSearch: true, showEarningsOnProfile: false, allowDataSharing: false },
    },
  });
  record("PATCH /users/me/preferences", isOk(r.status), `status=${r.status}`, r.body);
}

async function suiteNotifications(app: any) {
  console.log(color(35, "\n[ notification preferences ]"));

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/notifications/preferences",
    headers: bearer(clientToken),
  });
  record("GET /notifications/preferences", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "PATCH",
    url: "/api/v1/notifications/preferences",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: {
      notifyMessages: false,
      notifyJobInvitations: true,
      notifyPaymentUpdates: true,
      emailFrequency: "daily",
      pushEnabled: true,
      inAppEnabled: true,
    },
  });
  record("PATCH /notifications/preferences", isOk(r.status), `status=${r.status}`, r.body);
}

async function suiteSessions(app: any) {
  console.log(color(35, "\n[ sessions ]"));

  await pool.query(
    `INSERT INTO "UserSession" ("userId","refreshJti","userAgent","ip","lastSeenAt")
     VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING`,
    [clientUserId, `smoke-${Date.now()}`, "smoke-test-agent", "127.0.0.1"]
  );

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/security/sessions",
    headers: bearer(clientToken),
  });
  const ok =
    isOk(r.status) &&
    Array.isArray(r.body?.data?.sessions || r.body?.data);
  record("GET /security/sessions", ok, `status=${r.status}`);

  r = await pingHttp(app, {
    method: "DELETE",
    url: "/api/v1/security/sessions/non-existent-jti",
    headers: bearer(clientToken),
  });
  record(
    "DELETE /security/sessions/:jti (idempotent)",
    isOk(r.status, [200, 204, 404]),
    `status=${r.status}`
  );

  r = await pingHttp(app, {
    method: "DELETE",
    url: "/api/v1/security/sessions",
    headers: bearer(clientToken),
  });
  record(
    "DELETE /security/sessions (revoke all others)",
    isOk(r.status, [200, 204]),
    `status=${r.status}`
  );
}

async function suite2fa(app: any) {
  console.log(color(35, "\n[ 2FA ]"));

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/security/2fa/status",
    headers: bearer(freelancerToken),
  });
  record(
    "GET /security/2fa/status (initial)",
    isOk(r.status) && r.body?.data?.enabled === false,
    `status=${r.status}`
  );

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/security/2fa/setup",
    headers: bearer(freelancerToken),
  });
  const secret: string | undefined = r.body?.data?.secret;
  record(
    "POST /security/2fa/setup",
    isOk(r.status) &&
      typeof secret === "string" &&
      typeof r.body?.data?.qrDataUrl === "string" &&
      r.body.data.qrDataUrl.startsWith("data:image"),
    `status=${r.status}`
  );

  if (!secret) {
    record("POST /security/2fa/verify-setup", false, "no secret to verify with");
    record("POST /security/2fa/disable", "skip");
    return;
  }

  const code = speakeasy.totp({ secret, encoding: "base32" });
  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/security/2fa/verify-setup",
    headers: { ...bearer(freelancerToken), "content-type": "application/json" },
    payload: { code },
  });
  record(
    "POST /security/2fa/verify-setup",
    isOk(r.status) && Array.isArray(r.body?.data?.recoveryCodes),
    `status=${r.status}`
  );

  r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/security/2fa/status",
    headers: bearer(freelancerToken),
  });
  record("GET /security/2fa/status (after enable)", r.body?.data?.enabled === true);

  const code2 = speakeasy.totp({ secret, encoding: "base32" });
  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/security/2fa/disable",
    headers: { ...bearer(freelancerToken), "content-type": "application/json" },
    payload: { currentPassword: TEST_PASSWORD, code: code2 },
  });
  record("POST /security/2fa/disable", isOk(r.status), `status=${r.status}`);
}

async function suiteBilling(app: any) {
  console.log(color(35, "\n[ billing profile + invoices ]"));

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/billing/profile",
    headers: bearer(clientToken),
  });
  record("GET /billing/profile", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "PUT",
    url: "/api/v1/billing/profile",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: {
      taxId: "TAX-1234",
      gstNumber: "29ABCDE1234F2Z5",
      billingName: "Smoke Co.",
      billingAddress: { line1: "1 Smoke Way", city: "Test", state: "CA", postalCode: "94000", country: "US" },
    },
  });
  record("PUT /billing/profile", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/billing/invoices/export",
    headers: bearer(clientToken),
  });
  record(
    "GET /billing/invoices/export",
    isOk(r.status) && Array.isArray(r.body?.data?.invoices),
    `status=${r.status}`
  );
}

async function suitePaymentMethods(app: any) {
  console.log(color(35, "\n[ payment methods ]"));
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/billing/payment-methods",
    headers: bearer(clientToken),
  });
  record(
    "GET /billing/payment-methods",
    isOk(r.status, stripeConfigured ? [200] : [200, 503]),
    `status=${r.status}`
  );

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/billing/payment-methods/setup-intent",
    headers: bearer(clientToken),
  });
  if (stripeConfigured) {
    record(
      "POST /billing/payment-methods/setup-intent",
      isOk(r.status, [200, 502, 503]),
      `status=${r.status}`
    );
  } else {
    record("POST /billing/payment-methods/setup-intent", "skip", "STRIPE_SECRET_KEY not set");
  }
}

async function suiteConnect(app: any) {
  console.log(color(35, "\n[ Stripe Connect ]"));
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  if (!stripeConfigured) {
    record("GET /billing/connect/status", "skip", "STRIPE_SECRET_KEY not set");
    record("POST /billing/connect/onboard", "skip", "STRIPE_SECRET_KEY not set");
    return;
  }

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/billing/connect/status",
    headers: bearer(freelancerToken),
  });
  record("GET /billing/connect/status", isOk(r.status, [200, 502, 503]), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/billing/connect/onboard",
    headers: bearer(freelancerToken),
  });
  record("POST /billing/connect/onboard", isOk(r.status, [200, 502, 503]), `status=${r.status}`);
}

async function suiteConnectedAccounts(app: any) {
  console.log(color(35, "\n[ OAuth connected accounts ]"));

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/connected-accounts/",
    headers: bearer(clientToken),
  });
  record("GET /connected-accounts", isOk(r.status), `status=${r.status}`, r.body);

  r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/connected-accounts/start/youtube",
    headers: bearer(clientToken),
  });
  record(
    "GET /connected-accounts/start/youtube",
    isOk(r.status, [200, 400, 503]),
    `status=${r.status}`,
    r.body
  );

  r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/connected-accounts/start/linkedin",
    headers: bearer(clientToken),
  });
  record(
    "GET /connected-accounts/start/linkedin",
    isOk(r.status, [200, 400, 503]),
    `status=${r.status}`,
    r.body
  );
}

async function suiteTeam(app: any) {
  console.log(color(35, "\n[ team management ]"));

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/team/members",
    headers: bearer(clientToken),
  });
  record(
    "GET /team/members",
    isOk(r.status) && Array.isArray(r.body?.data?.members || r.body?.data),
    `status=${r.status}`,
    r.body
  );

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/team/members/invite",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: { email: `smoke-team-${Date.now()}@example.com`, role: "VIEWER" },
  });
  record(
    "POST /team/members/invite",
    isOk(r.status, [200, 201, 202]),
    `status=${r.status}`,
    r.body
  );
}

async function suiteDataExportAndDeletion(app: any) {
  console.log(color(35, "\n[ data export + account deletion ]"));

  let r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/users/me/delete-request",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: { currentPassword: TEST_PASSWORD, confirm: "DELETE" },
  });
  record("POST /users/me/delete-request", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/users/me/delete-request/cancel",
    headers: bearer(clientToken),
  });
  record("POST /users/me/delete-request/cancel", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/users/me/export",
    headers: bearer(clientToken),
  });
  if (process.env.AWS_S3_BUCKET) {
    record(
      "POST /users/me/export",
      isOk(r.status, [200, 202, 502, 503]),
      `status=${r.status}`
    );
  } else {
    record("POST /users/me/export", "skip", "AWS_S3_BUCKET not set");
  }
}

async function suiteAliases(app: any) {
  console.log(color(35, "\n[ broken-path aliases ]"));

  let r = await pingHttp(app, {
    method: "GET",
    url: "/api/v1/users/profile",
    headers: bearer(clientToken),
  });
  record("GET /users/profile (alias)", isOk(r.status), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "PUT",
    url: "/api/v1/users/update",
    headers: { ...bearer(clientToken), "content-type": "application/json" },
    payload: { bio: "alias bio" },
  });
  record("PUT /users/update (alias)", isOk(r.status, [200, 400]), `status=${r.status}`);

  r = await pingHttp(app, {
    method: "POST",
    url: "/api/v1/users/me/portfolio",
    headers: { ...bearer(freelancerToken), "content-type": "application/json" },
    payload: {
      title: "Smoke video",
      videoUrl: "https://example.com/v.mp4",
      thumbnailUrl: "https://example.com/t.jpg",
      category: "demo",
    },
  });
  record(
    "POST /users/me/portfolio (alias)",
    isOk(r.status, [200, 201, 400]),
    `status=${r.status}`
  );
}

(async () => {
  console.log(color(36, "\n=== settings backend smoke test ===\n"));

  let app: any;
  try {
    const mod = await import("../src/app.js");
    app = await mod.buildApp();
    await app.ready();
  } catch (err) {
    console.error("Failed to boot app:", err);
    process.exit(1);
  }

  try {
    await createTestUsers();

    await suiteProfile(app);
    await suiteCombinedPrefs(app);
    await suiteNotifications(app);
    await suitePassword(app);
    await suiteEmailChange(app);
    await suiteSessions(app);
    await suite2fa(app);
    await suiteBilling(app);
    await suitePaymentMethods(app);
    await suiteConnect(app);
    await suiteConnectedAccounts(app);
    await suiteTeam(app);
    await suiteDataExportAndDeletion(app);
    await suiteAliases(app);
  } catch (err: any) {
    console.error(color(31, "\nUnhandled error during suite:"), err);
    failed++;
    failures.push({ name: "runner", detail: err?.message || String(err) });
  } finally {
    try {
      await cleanupTestUsers();
    } catch (e: any) {
      console.warn("Cleanup partial:", e?.message);
    }
    try {
      await app?.close();
    } catch {}
    try {
      await pool.end();
    } catch {}
  }

  console.log("\n--------------------------------------------");
  console.log(
    `Total: ${passed + failed + skipped}  ` +
      color(32, `passed=${passed}`) +
      "  " +
      color(31, `failed=${failed}`) +
      "  " +
      color(33, `skipped=${skipped}`)
  );
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log("  -", f.name, "--", f.detail || "");
    }
  }
  process.exit(failed === 0 ? 0 : 1);
})();
