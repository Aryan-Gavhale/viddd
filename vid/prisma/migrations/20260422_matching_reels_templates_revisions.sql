-- =============================================
-- FEATURE 1: AI-Powered Editor Matching
-- =============================================
ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "styleTags" TEXT[];
ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "softwareExpertise" TEXT[];
ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "specializations" TEXT[];

CREATE TABLE IF NOT EXISTS "MatchRequest" (
  "id"              SERIAL PRIMARY KEY,
  "clientId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "jobId"           INTEGER REFERENCES "Job"("id") ON DELETE SET NULL,
  "requiredSkills"  TEXT[],
  "requiredSoftware" TEXT[],
  "requiredStyle"   TEXT[],
  "budgetMin"       INTEGER,
  "budgetMax"       INTEGER,
  "experienceLevel" VARCHAR(20),
  "resultCount"     INTEGER DEFAULT 0,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "MatchResult" (
  "id"              SERIAL PRIMARY KEY,
  "requestId"       INTEGER NOT NULL REFERENCES "MatchRequest"("id") ON DELETE CASCADE,
  "freelancerId"    INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "overallScore"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "skillScore"      DOUBLE PRECISION DEFAULT 0,
  "softwareScore"   DOUBLE PRECISION DEFAULT 0,
  "styleScore"      DOUBLE PRECISION DEFAULT 0,
  "ratingScore"     DOUBLE PRECISION DEFAULT 0,
  "experienceScore" DOUBLE PRECISION DEFAULT 0,
  "priceScore"      DOUBLE PRECISION DEFAULT 0,
  "matchReasons"    TEXT,
  "rank"            INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "idx_match_req_client" ON "MatchRequest" ("clientId");
CREATE INDEX IF NOT EXISTS "idx_match_res_req" ON "MatchResult" ("requestId");
CREATE INDEX IF NOT EXISTS "idx_match_res_score" ON "MatchResult" ("overallScore" DESC);

-- =============================================
-- FEATURE 2: Portfolio Reels Auto-Generated
-- =============================================
CREATE TABLE IF NOT EXISTS "DemoReel" (
  "id"              SERIAL PRIMARY KEY,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"           VARCHAR(200) NOT NULL DEFAULT 'My Demo Reel',
  "description"     TEXT,
  "status"          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "clips"           TEXT NOT NULL DEFAULT '[]',
  "reelUrl"         TEXT,
  "thumbnailUrl"    TEXT,
  "totalDuration"   INTEGER DEFAULT 0,
  "isPublic"        BOOLEAN NOT NULL DEFAULT false,
  "viewCount"       INTEGER DEFAULT 0,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_reel_user" ON "DemoReel" ("userId");
CREATE INDEX IF NOT EXISTS "idx_reel_public" ON "DemoReel" ("isPublic") WHERE "isPublic" = true;

-- =============================================
-- FEATURE 3: Template Marketplace
-- =============================================
CREATE TABLE IF NOT EXISTS "Template" (
  "id"              SERIAL PRIMARY KEY,
  "sellerId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"           VARCHAR(200) NOT NULL,
  "description"     TEXT,
  "category"        VARCHAR(50) NOT NULL,
  "software"        VARCHAR(50) NOT NULL,
  "tags"            TEXT[],
  "price"           INTEGER NOT NULL DEFAULT 0,
  "previewVideoUrl" TEXT,
  "previewImageUrl" TEXT,
  "fileUrl"         TEXT,
  "fileSize"        VARCHAR(20),
  "version"         VARCHAR(20) DEFAULT '1.0',
  "compatibility"   TEXT,
  "status"          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "salesCount"      INTEGER DEFAULT 0,
  "rating"          DOUBLE PRECISION DEFAULT 0,
  "reviewCount"     INTEGER DEFAULT 0,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TemplatePurchase" (
  "id"              SERIAL PRIMARY KEY,
  "templateId"      INTEGER NOT NULL REFERENCES "Template"("id") ON DELETE CASCADE,
  "buyerId"         INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "price"           INTEGER NOT NULL,
  "downloadUrl"     TEXT,
  "purchasedAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("templateId", "buyerId")
);

CREATE TABLE IF NOT EXISTS "TemplateReview" (
  "id"              SERIAL PRIMARY KEY,
  "templateId"      INTEGER NOT NULL REFERENCES "Template"("id") ON DELETE CASCADE,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "rating"          INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "comment"         TEXT,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("templateId", "userId")
);

CREATE INDEX IF NOT EXISTS "idx_template_seller" ON "Template" ("sellerId");
CREATE INDEX IF NOT EXISTS "idx_template_cat" ON "Template" ("category");
CREATE INDEX IF NOT EXISTS "idx_template_software" ON "Template" ("software");
CREATE INDEX IF NOT EXISTS "idx_template_status" ON "Template" ("status");
CREATE INDEX IF NOT EXISTS "idx_tpurchase_buyer" ON "TemplatePurchase" ("buyerId");
CREATE INDEX IF NOT EXISTS "idx_treview_template" ON "TemplateReview" ("templateId");

-- =============================================
-- FEATURE 4: Revision Tracking
-- =============================================
CREATE TABLE IF NOT EXISTS "Revision" (
  "id"              SERIAL PRIMARY KEY,
  "orderId"         INTEGER NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "version"         INTEGER NOT NULL DEFAULT 1,
  "videoUrl"        TEXT NOT NULL,
  "thumbnailUrl"    TEXT,
  "changeNotes"     TEXT,
  "duration"        INTEGER,
  "fileSize"        VARCHAR(20),
  "status"          VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
  "reviewedBy"      INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "reviewNote"      TEXT,
  "reviewedAt"      TIMESTAMP,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("orderId", "version")
);

CREATE INDEX IF NOT EXISTS "idx_revision_order" ON "Revision" ("orderId");
CREATE INDEX IF NOT EXISTS "idx_revision_user" ON "Revision" ("userId");
