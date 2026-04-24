-- =============================================
-- REVENUE: Service Fee / Platform Commission
-- =============================================
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "platformFeePercent" DOUBLE PRECISION DEFAULT 12.5;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "platformFeeAmount" INTEGER DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "clientFeePercent" DOUBLE PRECISION DEFAULT 3.5;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "clientFeeAmount" INTEGER DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "freelancerPayout" INTEGER DEFAULT 0;

-- =============================================
-- REVENUE: Template Marketplace Commission
-- =============================================
ALTER TABLE "TemplatePurchase" ADD COLUMN IF NOT EXISTS "platformCommission" INTEGER DEFAULT 0;
ALTER TABLE "TemplatePurchase" ADD COLUMN IF NOT EXISTS "sellerPayout" INTEGER DEFAULT 0;

-- =============================================
-- REVENUE: Premium Subscriptions
-- =============================================
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id"                SERIAL PRIMARY KEY,
  "name"              VARCHAR(50) NOT NULL UNIQUE,
  "tier"              VARCHAR(20) NOT NULL,
  "priceMonthly"      INTEGER NOT NULL DEFAULT 0,
  "priceYearly"       INTEGER NOT NULL DEFAULT 0,
  "maxPortfolioItems" INTEGER DEFAULT 5,
  "maxGigs"           INTEGER DEFAULT 3,
  "prioritySearch"    BOOLEAN DEFAULT false,
  "analyticsAccess"   BOOLEAN DEFAULT false,
  "customBranding"    BOOLEAN DEFAULT false,
  "dedicatedSupport"  BOOLEAN DEFAULT false,
  "renderCredits"     INTEGER DEFAULT 0,
  "templateListings"  INTEGER DEFAULT 0,
  "features"          TEXT,
  "isActive"          BOOLEAN DEFAULT true,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "UserSubscription" (
  "id"                SERIAL PRIMARY KEY,
  "userId"            INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "planId"            INTEGER NOT NULL REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE,
  "status"            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "billingCycle"      VARCHAR(10) NOT NULL DEFAULT 'MONTHLY',
  "currentPeriodStart" TIMESTAMP NOT NULL DEFAULT NOW(),
  "currentPeriodEnd"  TIMESTAMP NOT NULL,
  "cancelledAt"       TIMESTAMP,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_user_sub" ON "UserSubscription" ("userId");

INSERT INTO "SubscriptionPlan" ("name", "tier", "priceMonthly", "priceYearly", "maxPortfolioItems", "maxGigs", "prioritySearch", "analyticsAccess", "customBranding", "dedicatedSupport", "renderCredits", "templateListings", "features") VALUES
  ('Free', 'FREE', 0, 0, 3, 2, false, false, false, false, 0, 0, '["Basic profile","Up to 3 portfolio items","2 active gigs","Standard search ranking"]'),
  ('Pro', 'PRO', 1499, 14990, 25, 10, true, true, false, false, 100, 5, '["25 portfolio items","10 active gigs","Priority search ranking","Analytics dashboard","100 render credits/mo","5 template listings"]'),
  ('Business', 'BUSINESS', 3999, 39990, -1, -1, true, true, true, true, 500, -1, '["Unlimited portfolio items","Unlimited gigs","Priority search + featured badge","Full analytics suite","Custom branding","500 render credits/mo","Unlimited template listings","Dedicated account manager"]')
ON CONFLICT ("name") DO NOTHING;

-- =============================================
-- REVENUE: Enterprise Tier
-- =============================================
CREATE TABLE IF NOT EXISTS "EnterpriseAccount" (
  "id"                SERIAL PRIMARY KEY,
  "companyName"       VARCHAR(200) NOT NULL,
  "ownerId"           INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "plan"              VARCHAR(30) NOT NULL DEFAULT 'STANDARD',
  "maxSeats"          INTEGER NOT NULL DEFAULT 5,
  "usedSeats"         INTEGER DEFAULT 1,
  "monthlyBudget"     INTEGER DEFAULT 0,
  "spentThisMonth"    INTEGER DEFAULT 0,
  "features"          TEXT,
  "status"            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "customWorkflows"   BOOLEAN DEFAULT false,
  "bulkHiring"        BOOLEAN DEFAULT false,
  "apiAccess"         BOOLEAN DEFAULT false,
  "ssoEnabled"        BOOLEAN DEFAULT false,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EnterpriseMember" (
  "id"                SERIAL PRIMARY KEY,
  "accountId"         INTEGER NOT NULL REFERENCES "EnterpriseAccount"("id") ON DELETE CASCADE,
  "userId"            INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role"              VARCHAR(30) NOT NULL DEFAULT 'MEMBER',
  "permissions"       TEXT,
  "joinedAt"          TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("accountId", "userId")
);

CREATE INDEX IF NOT EXISTS "idx_enterprise_owner" ON "EnterpriseAccount" ("ownerId");
CREATE INDEX IF NOT EXISTS "idx_enterprise_member" ON "EnterpriseMember" ("userId");

-- =============================================
-- REVENUE: Platform Revenue Tracking
-- =============================================
CREATE TABLE IF NOT EXISTS "PlatformRevenue" (
  "id"                SERIAL PRIMARY KEY,
  "type"              VARCHAR(30) NOT NULL,
  "amount"            INTEGER NOT NULL DEFAULT 0,
  "sourceId"          INTEGER,
  "sourceType"        VARCHAR(30),
  "description"       TEXT,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_revenue_type" ON "PlatformRevenue" ("type");
CREATE INDEX IF NOT EXISTS "idx_revenue_date" ON "PlatformRevenue" ("createdAt");
