-- Add milestone payment + approval columns
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "amount" NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

-- Safe enum add (re-run safe on older Postgres)
DO $$ BEGIN
  ALTER TYPE "MilestoneStatus" ADD VALUE 'CANCELLED';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
