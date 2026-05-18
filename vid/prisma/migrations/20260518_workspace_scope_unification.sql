-- Unified workspace scope: lets PinnedMessage and VideoReviewComment attach
-- to either a Job (custom-project) or an Order (gig). Without this the gig
-- side of the unified WorkspaceShell can't pin chat messages or use Frame.io
-- timecoded review comments because both tables previously required a jobId.
--
-- Idempotent: every operation guards against re-running, so this migration is
-- safe to apply on a database that has already been partially upgraded.

BEGIN;

-- ── PinnedMessage ──────────────────────────────────────────────────────────
ALTER TABLE "PinnedMessage" ADD COLUMN IF NOT EXISTS "orderId" INTEGER;

-- Drop the old NOT NULL on jobId so order-only pins are valid.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'PinnedMessage'
       AND column_name = 'jobId'
       AND is_nullable = 'NO'
  ) THEN
    EXECUTE 'ALTER TABLE "PinnedMessage" ALTER COLUMN "jobId" DROP NOT NULL';
  END IF;
END
$$;

-- The original UNIQUE("jobId","messageId") constraint excludes order-only pins
-- (because jobId is now nullable). Replace it with two partial unique indexes
-- so duplicate pins are still impossible within each scope.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'PinnedMessage_jobId_messageId_key'
  ) THEN
    EXECUTE 'ALTER TABLE "PinnedMessage" DROP CONSTRAINT "PinnedMessage_jobId_messageId_key"';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "PinnedMessage_jobId_messageId_uniq"
  ON "PinnedMessage" ("jobId", "messageId")
  WHERE "jobId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PinnedMessage_orderId_messageId_uniq"
  ON "PinnedMessage" ("orderId", "messageId")
  WHERE "orderId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "PinnedMessage_orderId_idx"
  ON "PinnedMessage" ("orderId")
  WHERE "orderId" IS NOT NULL;

-- A row should reference exactly one scope; reject ambiguous / empty rows so
-- bad data can't sneak in via direct INSERTs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PinnedMessage_scope_chk'
  ) THEN
    EXECUTE
      'ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_scope_chk" '
      'CHECK ( ("jobId" IS NOT NULL AND "orderId" IS NULL) '
      '     OR ("jobId" IS NULL AND "orderId" IS NOT NULL) )';
  END IF;
END
$$;

-- ── VideoReviewComment ─────────────────────────────────────────────────────
ALTER TABLE "VideoReviewComment" ADD COLUMN IF NOT EXISTS "orderId" INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'VideoReviewComment'
       AND column_name = 'jobId'
       AND is_nullable = 'NO'
  ) THEN
    EXECUTE 'ALTER TABLE "VideoReviewComment" ALTER COLUMN "jobId" DROP NOT NULL';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_vrc_order"
  ON "VideoReviewComment" ("orderId")
  WHERE "orderId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VideoReviewComment_scope_chk'
  ) THEN
    EXECUTE
      'ALTER TABLE "VideoReviewComment" ADD CONSTRAINT "VideoReviewComment_scope_chk" '
      'CHECK ( ("jobId" IS NOT NULL AND "orderId" IS NULL) '
      '     OR ("jobId" IS NULL AND "orderId" IS NOT NULL) )';
  END IF;
END
$$;

-- Track completion in the lightweight migrations log used by the bash
-- migration runner so this is visible alongside the SQL migrations.
CREATE TABLE IF NOT EXISTS "_migrations" (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO "_migrations" (name) VALUES ('20260518_workspace_scope_unification')
  ON CONFLICT (name) DO NOTHING;

COMMIT;
