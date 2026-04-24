-- Soft-delete columns
ALTER TABLE "Gig" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- Partial indexes for soft-delete (only index non-deleted rows)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_gig_active" ON "Gig" ("freelancer_id", "status") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_job_active" ON "Job" ("status", "posted_by_id") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_order_active" ON "Order" ("status", "client_id") WHERE "deletedAt" IS NULL;

-- Additional performance indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_order_freelancer" ON "Order" ("freelancer_id", "status") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_gig_status_active" ON "Gig" ("status") WHERE "deletedAt" IS NULL AND "status" = 'ACTIVE';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_job_status_open" ON "Job" ("status") WHERE "deletedAt" IS NULL AND "status" = 'OPEN';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_application_job" ON "Application" ("jobId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_message_order" ON "Message" ("orderId", "timestamp");

-- Full-text search: tsvector columns + GIN indexes
ALTER TABLE "Gig" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;
ALTER TABLE "FreelancerProfile" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- GIN indexes for fast full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_gig_fts" ON "Gig" USING GIN ("search_vector");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_job_fts" ON "Job" USING GIN ("search_vector");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_freelancer_fts" ON "FreelancerProfile" USING GIN ("search_vector");

-- Trigger functions to auto-update tsvector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION gig_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION job_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.scope, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW."requiredSkills", ' '), '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION freelancer_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW."jobTitle", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.overview, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.skills, ' '), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tools, ' '), '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS gig_search_trigger ON "Gig";
CREATE TRIGGER gig_search_trigger BEFORE INSERT OR UPDATE ON "Gig"
  FOR EACH ROW EXECUTE FUNCTION gig_search_update();

DROP TRIGGER IF EXISTS job_search_trigger ON "Job";
CREATE TRIGGER job_search_trigger BEFORE INSERT OR UPDATE ON "Job"
  FOR EACH ROW EXECUTE FUNCTION job_search_update();

DROP TRIGGER IF EXISTS freelancer_search_trigger ON "FreelancerProfile";
CREATE TRIGGER freelancer_search_trigger BEFORE INSERT OR UPDATE ON "FreelancerProfile"
  FOR EACH ROW EXECUTE FUNCTION freelancer_search_update();

-- Backfill existing rows
UPDATE "Gig" SET title = title WHERE "search_vector" IS NULL;
UPDATE "Job" SET title = title WHERE "search_vector" IS NULL;
UPDATE "FreelancerProfile" SET "jobTitle" = "jobTitle" WHERE "search_vector" IS NULL;
