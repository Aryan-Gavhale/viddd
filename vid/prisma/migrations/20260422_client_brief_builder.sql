-- Client Brief Builder: structured project briefs with reference media
CREATE TABLE IF NOT EXISTS "ProjectBrief" (
  "id"              SERIAL PRIMARY KEY,
  "clientId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "jobId"           INTEGER REFERENCES "Job"("id") ON DELETE SET NULL,
  "orderId"         INTEGER REFERENCES "Order"("id") ON DELETE SET NULL,
  "title"           VARCHAR(200) NOT NULL,
  "status"          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

  -- Step 1: Project Overview
  "projectType"     VARCHAR(50),
  "description"     TEXT,
  "targetAudience"  TEXT,
  "purpose"         TEXT,
  "duration"        VARCHAR(50),
  "deadline"        DATE,
  "budget"          VARCHAR(50),

  -- Step 2: Style & Tone
  "videoStyle"      VARCHAR(50),
  "tone"            VARCHAR(50),
  "pacing"          VARCHAR(50),
  "musicPreference" TEXT,
  "colorGrading"    VARCHAR(50),
  "styleNotes"      TEXT,

  -- Step 3: Reference Videos (stored as JSON array)
  "referenceVideos" TEXT,

  -- Step 4: Brand Guidelines
  "brandName"       VARCHAR(200),
  "brandColors"     TEXT,
  "brandFonts"      TEXT,
  "logoUrl"         TEXT,
  "brandVoice"      TEXT,
  "dosAndDonts"     TEXT,

  -- Step 5: Deliverables
  "deliverables"    TEXT,
  "aspectRatios"    TEXT,
  "fileFormats"     TEXT,
  "additionalNotes" TEXT,

  -- Step 6: Mood Board (JSON array of image URLs)
  "moodBoardUrls"   TEXT,

  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_brief_client" ON "ProjectBrief" ("clientId");
CREATE INDEX IF NOT EXISTS "idx_brief_job" ON "ProjectBrief" ("jobId");
CREATE INDEX IF NOT EXISTS "idx_brief_status" ON "ProjectBrief" ("status");
