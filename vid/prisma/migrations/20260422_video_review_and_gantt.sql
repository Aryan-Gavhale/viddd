-- Video Review: Timecoded Comments on Video Deliverables
CREATE TABLE IF NOT EXISTS "VideoComment" (
  "id"          SERIAL PRIMARY KEY,
  "orderId"     INTEGER NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "userId"      INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "videoUrl"    TEXT NOT NULL,
  "timecode"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "content"     TEXT NOT NULL,
  "parentId"    INTEGER REFERENCES "VideoComment"("id") ON DELETE CASCADE,
  "resolvedAt"  TIMESTAMP,
  "resolvedBy"  INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_video_comment_order" ON "VideoComment" ("orderId");
CREATE INDEX IF NOT EXISTS "idx_video_comment_order_video" ON "VideoComment" ("orderId", "videoUrl");
CREATE INDEX IF NOT EXISTS "idx_video_comment_timecode" ON "VideoComment" ("orderId", "videoUrl", timecode);
CREATE INDEX IF NOT EXISTS "idx_video_comment_parent" ON "VideoComment" ("parentId");

-- Frame-accurate annotation: stores drawing strokes as JSON
ALTER TABLE "VideoComment" ADD COLUMN IF NOT EXISTS "annotationData" TEXT;
ALTER TABLE "VideoComment" ADD COLUMN IF NOT EXISTS "frameSnapshot" TEXT;

-- Timeline enhancements for Gantt: add progress, color, and dependency columns
ALTER TABLE "Timeline" ADD COLUMN IF NOT EXISTS "progress" INTEGER DEFAULT 0 CHECK ("progress" >= 0 AND "progress" <= 100);
ALTER TABLE "Timeline" ADD COLUMN IF NOT EXISTS "color" VARCHAR(20);
ALTER TABLE "Timeline" ADD COLUMN IF NOT EXISTS "dependsOnId" INTEGER REFERENCES "Timeline"("id") ON DELETE SET NULL;
ALTER TABLE "Timeline" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "idx_timeline_job" ON "Timeline" ("jobId");
CREATE INDEX IF NOT EXISTS "idx_timeline_dependency" ON "Timeline" ("dependsOnId");
