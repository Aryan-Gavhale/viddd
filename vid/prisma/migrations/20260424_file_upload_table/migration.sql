-- FileUpload table (moved from runtime DDL in files.routes.ts)

CREATE TABLE IF NOT EXISTS "FileUpload" (
  id SERIAL PRIMARY KEY,
  "userId" INT NOT NULL REFERENCES "User"(id),
  "uploadId" TEXT NOT NULL,
  "s3Key" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "fileSize" BIGINT NOT NULL,
  "orderId" INT REFERENCES "Order"(id),
  "jobId" INT REFERENCES "Job"(id),
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "totalParts" INT,
  "completedParts" INT DEFAULT 0,
  "finalUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "FileUpload_userId_idx" ON "FileUpload" ("userId");
CREATE INDEX IF NOT EXISTS "FileUpload_uploadId_idx" ON "FileUpload" ("uploadId");
