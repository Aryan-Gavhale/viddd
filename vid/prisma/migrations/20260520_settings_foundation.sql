-- Settings foundation migration.
-- Adds the columns and tables needed by the new Settings backend
-- (profile/password/email-change, notification preferences, saved payment
-- methods, billing/tax, sessions, 2FA, OAuth-connected accounts, team
-- management, video/appearance/privacy preferences, hard-delete + GDPR).
--
-- Idempotent: every operation guards against re-running, so this migration is
-- safe to apply on a database that has already been partially upgraded.

BEGIN;

-- ── User: settings columns ────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingEmail" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingEmailToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingEmailExpiry" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorRecoveryCodes" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT 'violet';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fontSize" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "responseTimeHours" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "availabilityStatus" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockUntil" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationTokenExpiry" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_uniq"
  ON "User" ("stripeCustomerId")
  WHERE "stripeCustomerId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_pendingEmailToken_uniq"
  ON "User" ("pendingEmailToken")
  WHERE "pendingEmailToken" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "User_deletionRequestedAt_idx"
  ON "User" ("deletionRequestedAt")
  WHERE "deletionRequestedAt" IS NOT NULL;

-- ── FreelancerProfile: Stripe Connect columns ─────────────────────────────
ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "stripeConnectedAccountId" TEXT;
ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "stripeRequirementsDue" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "FreelancerProfile_stripeConnectedAccountId_uniq"
  ON "FreelancerProfile" ("stripeConnectedAccountId")
  WHERE "stripeConnectedAccountId" IS NOT NULL;

-- ── NotificationPreference ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "userId" INTEGER PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "notifyJobInvitations" BOOLEAN NOT NULL DEFAULT TRUE,
  "notifyMessages" BOOLEAN NOT NULL DEFAULT TRUE,
  "notifyPaymentUpdates" BOOLEAN NOT NULL DEFAULT TRUE,
  "notifyPlatformNews" BOOLEAN NOT NULL DEFAULT TRUE,
  "notifyMarketing" BOOLEAN NOT NULL DEFAULT FALSE,
  "emailFrequency" TEXT NOT NULL DEFAULT 'instant',
  "pushEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PaymentMethodRecord (saved Stripe payment methods) ────────────────────
CREATE TABLE IF NOT EXISTS "PaymentMethodRecord" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "stripePaymentMethodId" TEXT NOT NULL UNIQUE,
  "brand" TEXT,
  "last4" TEXT,
  "expMonth" INTEGER,
  "expYear" INTEGER,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "PaymentMethodRecord_userId_idx"
  ON "PaymentMethodRecord" ("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentMethodRecord_userId_default_uniq"
  ON "PaymentMethodRecord" ("userId")
  WHERE "isDefault" = TRUE;

-- ── BillingProfile (tax/billing address) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "BillingProfile" (
  "userId" INTEGER PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "taxId" TEXT,
  "gstNumber" TEXT,
  "companyPan" TEXT,
  "billingName" TEXT,
  "billingAddress" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── UserSession (refresh jti tracking) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserSession" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "refreshJti" TEXT NOT NULL UNIQUE,
  "userAgent" TEXT,
  "ip" TEXT,
  "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "UserSession_userId_idx"
  ON "UserSession" ("userId");

CREATE INDEX IF NOT EXISTS "UserSession_lastSeenAt_idx"
  ON "UserSession" ("lastSeenAt");

-- ── ConnectedAccount (OAuth: YouTube, LinkedIn) ───────────────────────────
CREATE TABLE IF NOT EXISTS "ConnectedAccount" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMPTZ,
  "scope" TEXT,
  "displayName" TEXT,
  "connectedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConnectedAccount_userId_provider_uniq"
  ON "ConnectedAccount" ("userId", "provider");

CREATE INDEX IF NOT EXISTS "ConnectedAccount_userId_idx"
  ON "ConnectedAccount" ("userId");

-- ── TeamMember ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TeamMember" (
  "id" SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "memberUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "inviteEmail" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'VIEWER',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "inviteToken" TEXT UNIQUE,
  "inviteExpiry" TIMESTAMPTZ,
  "invitedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "acceptedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_owner_email_uniq"
  ON "TeamMember" ("ownerUserId", "inviteEmail");

CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_owner_member_uniq"
  ON "TeamMember" ("ownerUserId", "memberUserId")
  WHERE "memberUserId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "TeamMember_ownerUserId_idx"
  ON "TeamMember" ("ownerUserId");

-- ── VideoPreference ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "VideoPreference" (
  "userId" INTEGER PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "defaultVideoFormat" TEXT NOT NULL DEFAULT 'mp4',
  "defaultResolution" TEXT NOT NULL DEFAULT '1080p',
  "watermarkEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "watermarkImageUrl" TEXT,
  "watermarkPosition" TEXT NOT NULL DEFAULT 'bottom-right',
  "watermarkOpacity" INTEGER NOT NULL DEFAULT 50,
  "publicVideosScope" TEXT NOT NULL DEFAULT 'public',
  "privateVideoPassword" TEXT,
  "autoplayPortfolioVideos" BOOLEAN NOT NULL DEFAULT FALSE,
  "loopVideos" BOOLEAN NOT NULL DEFAULT FALSE,
  "showVideoControls" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PrivacyPreference ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PrivacyPreference" (
  "userId" INTEGER PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "profileVisibleInSearch" BOOLEAN NOT NULL DEFAULT TRUE,
  "showEarningsOnProfile" BOOLEAN NOT NULL DEFAULT FALSE,
  "allowDataSharing" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Sentinel __deleted_user__ for hard-delete anonymisation ───────────────
-- We keep a single sentinel user whose foreign keys orphaned rows can be
-- re-pointed to during purge, so workspace summaries don't crash on null
-- peers. The sentinel is inactive and has a non-routable email/role.
INSERT INTO "User" ("firstname", "lastname", "email", "country", "role", "isActive", "isProfileComplete", "password")
SELECT '__deleted_user__', '', 'deleted-user@vidlancing.invalid', 'XX', 'CLIENT', FALSE, TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "email" = 'deleted-user@vidlancing.invalid');

COMMIT;
