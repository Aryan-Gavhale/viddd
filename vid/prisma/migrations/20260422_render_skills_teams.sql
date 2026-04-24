-- =============================================
-- FEATURE 1: Render Farm Integration
-- =============================================
CREATE TABLE IF NOT EXISTS "RenderJob" (
  "id"              SERIAL PRIMARY KEY,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "orderId"         INTEGER REFERENCES "Order"("id") ON DELETE SET NULL,
  "projectName"     VARCHAR(200) NOT NULL,
  "status"          VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  "priority"        VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
  "software"        VARCHAR(50),
  "resolution"      VARCHAR(20),
  "frameRange"      VARCHAR(50),
  "outputFormat"    VARCHAR(20),
  "estimatedMinutes" INTEGER,
  "actualMinutes"   INTEGER,
  "inputFileUrl"    TEXT,
  "outputFileUrl"   TEXT,
  "errorLog"        TEXT,
  "cost"            INTEGER DEFAULT 0,
  "startedAt"       TIMESTAMP,
  "completedAt"     TIMESTAMP,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_render_user" ON "RenderJob" ("userId");
CREATE INDEX IF NOT EXISTS "idx_render_status" ON "RenderJob" ("status");

-- =============================================
-- FEATURE 2: Skills Verification
-- =============================================
CREATE TABLE IF NOT EXISTS "SkillTest" (
  "id"              SERIAL PRIMARY KEY,
  "title"           VARCHAR(200) NOT NULL,
  "description"     TEXT,
  "category"        VARCHAR(50) NOT NULL,
  "difficulty"      VARCHAR(20) NOT NULL DEFAULT 'INTERMEDIATE',
  "timeLimitSeconds" INTEGER NOT NULL DEFAULT 3600,
  "passingScore"    INTEGER NOT NULL DEFAULT 70,
  "instructions"    TEXT NOT NULL,
  "sourceFileUrl"   TEXT,
  "referenceFileUrl" TEXT,
  "rubric"          TEXT,
  "badgeTitle"      VARCHAR(100),
  "badgeIcon"       VARCHAR(50),
  "badgeColor"      VARCHAR(20),
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "attemptCount"    INTEGER DEFAULT 0,
  "passRate"        DOUBLE PRECISION DEFAULT 0,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_skill_test_cat" ON "SkillTest" ("category");
CREATE INDEX IF NOT EXISTS "idx_skill_test_active" ON "SkillTest" ("isActive");

CREATE TABLE IF NOT EXISTS "SkillTestAttempt" (
  "id"              SERIAL PRIMARY KEY,
  "testId"          INTEGER NOT NULL REFERENCES "SkillTest"("id") ON DELETE CASCADE,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "status"          VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  "score"           INTEGER,
  "passed"          BOOLEAN,
  "submissionUrl"   TEXT,
  "feedback"        TEXT,
  "timeSpentSeconds" INTEGER,
  "startedAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "submittedAt"     TIMESTAMP,
  "gradedAt"        TIMESTAMP,
  "gradedBy"        INTEGER REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_attempt_test" ON "SkillTestAttempt" ("testId");
CREATE INDEX IF NOT EXISTS "idx_attempt_user" ON "SkillTestAttempt" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_attempt_active" ON "SkillTestAttempt" ("testId", "userId") WHERE "status" = 'IN_PROGRESS';

CREATE TABLE IF NOT EXISTS "SkillBadge" (
  "id"              SERIAL PRIMARY KEY,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "testId"          INTEGER NOT NULL REFERENCES "SkillTest"("id") ON DELETE CASCADE,
  "attemptId"       INTEGER NOT NULL REFERENCES "SkillTestAttempt"("id") ON DELETE CASCADE,
  "title"           VARCHAR(100) NOT NULL,
  "icon"            VARCHAR(50),
  "color"           VARCHAR(20),
  "score"           INTEGER NOT NULL,
  "earnedAt"        TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "testId")
);

CREATE INDEX IF NOT EXISTS "idx_badge_user" ON "SkillBadge" ("userId");

-- =============================================
-- FEATURE 3: Team Collaboration
-- =============================================
CREATE TABLE IF NOT EXISTS "TeamProposal" (
  "id"              SERIAL PRIMARY KEY,
  "jobId"           INTEGER NOT NULL REFERENCES "Job"("id") ON DELETE CASCADE,
  "leaderId"        INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "teamName"        VARCHAR(100) NOT NULL,
  "coverLetter"     TEXT,
  "totalPrice"      INTEGER NOT NULL DEFAULT 0,
  "estimatedDays"   INTEGER,
  "status"          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "clientNote"      TEXT,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_team_job" ON "TeamProposal" ("jobId");
CREATE INDEX IF NOT EXISTS "idx_team_leader" ON "TeamProposal" ("leaderId");

CREATE TABLE IF NOT EXISTS "TeamMember" (
  "id"              SERIAL PRIMARY KEY,
  "proposalId"      INTEGER NOT NULL REFERENCES "TeamProposal"("id") ON DELETE CASCADE,
  "userId"          INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role"            VARCHAR(50) NOT NULL,
  "responsibility"  TEXT,
  "rate"            INTEGER DEFAULT 0,
  "status"          VARCHAR(20) NOT NULL DEFAULT 'INVITED',
  "joinedAt"        TIMESTAMP,
  UNIQUE("proposalId", "userId")
);

CREATE INDEX IF NOT EXISTS "idx_team_member_proposal" ON "TeamMember" ("proposalId");
CREATE INDEX IF NOT EXISTS "idx_team_member_user" ON "TeamMember" ("userId");
