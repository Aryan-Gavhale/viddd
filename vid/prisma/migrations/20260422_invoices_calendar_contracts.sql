-- Invoice system
CREATE TABLE IF NOT EXISTS "InvoiceRecord" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER REFERENCES "Order"("id"),
  "fromUserId" INTEGER NOT NULL REFERENCES "User"("id"),
  "toUserId" INTEGER NOT NULL REFERENCES "User"("id"),
  "invoiceNumber" VARCHAR(50) NOT NULL UNIQUE,
  "items" JSONB NOT NULL DEFAULT '[]',
  "subtotal" INTEGER NOT NULL DEFAULT 0,
  "platformFee" INTEGER NOT NULL DEFAULT 0,
  "tax" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "dueDate" TIMESTAMP,
  "paidAt" TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_invoice_from" ON "InvoiceRecord" ("fromUserId");
CREATE INDEX IF NOT EXISTS "idx_invoice_to" ON "InvoiceRecord" ("toUserId");

-- Freelancer availability calendar
CREATE TABLE IF NOT EXISTS "AvailabilitySlot" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "dayOfWeek" INTEGER,
  "specificDate" DATE,
  "startTime" TIME NOT NULL,
  "endTime" TIME NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "timezone" VARCHAR(50) DEFAULT 'UTC',
  "note" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_avail_user" ON "AvailabilitySlot" ("userId");

-- Contract/NDA templates
CREATE TABLE IF NOT EXISTS "ContractTemplate" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(200) NOT NULL,
  "type" VARCHAR(30) NOT NULL DEFAULT 'SERVICE',
  "content" TEXT NOT NULL,
  "variables" JSONB DEFAULT '[]',
  "isSystem" BOOLEAN DEFAULT false,
  "createdBy" INTEGER REFERENCES "User"("id"),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Contract" (
  "id" SERIAL PRIMARY KEY,
  "templateId" INTEGER REFERENCES "ContractTemplate"("id"),
  "orderId" INTEGER REFERENCES "Order"("id"),
  "clientId" INTEGER NOT NULL REFERENCES "User"("id"),
  "freelancerId" INTEGER NOT NULL REFERENCES "User"("id"),
  "title" VARCHAR(300) NOT NULL,
  "content" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "clientSignedAt" TIMESTAMP,
  "freelancerSignedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_contract_client" ON "Contract" ("clientId");
CREATE INDEX IF NOT EXISTS "idx_contract_freelancer" ON "Contract" ("freelancerId");

-- Seed system contract templates (idempotent without requiring UNIQUE on name)
INSERT INTO "ContractTemplate" ("name", "type", "content", "variables", "isSystem")
SELECT 'Standard Service Agreement', 'SERVICE', E'SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of {{date}} between:

Client: {{clientName}} ("Client")
Freelancer: {{freelancerName}} ("Freelancer")

1. SCOPE OF WORK
{{scopeOfWork}}

2. COMPENSATION
Total Amount: ${{amount}}
Payment Terms: {{paymentTerms}}

3. TIMELINE
Start Date: {{startDate}}
Delivery Date: {{deliveryDate}}

4. INTELLECTUAL PROPERTY
Upon full payment, all intellectual property rights in the deliverables shall transfer to the Client.

5. REVISIONS
This agreement includes {{revisionCount}} rounds of revisions.

6. CONFIDENTIALITY
Both parties agree to keep confidential any proprietary information shared during the course of this engagement.

7. TERMINATION
Either party may terminate this agreement with {{noticePeriod}} days written notice.

8. DISPUTE RESOLUTION
Any disputes shall be resolved through the Vidlancing platform dispute resolution process.

Agreed and accepted:', '["date","clientName","freelancerName","scopeOfWork","amount","paymentTerms","startDate","deliveryDate","revisionCount","noticePeriod"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM "ContractTemplate" WHERE "name" = 'Standard Service Agreement' LIMIT 1);

INSERT INTO "ContractTemplate" ("name", "type", "content", "variables", "isSystem")
SELECT 'Non-Disclosure Agreement', 'NDA', E'NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("NDA") is entered into as of {{date}} between:

Disclosing Party: {{disclosingParty}}
Receiving Party: {{receivingParty}}

1. DEFINITION OF CONFIDENTIAL INFORMATION
Confidential Information includes all non-public information disclosed by either party, including but not limited to: business plans, technical data, trade secrets, video content, client lists, and creative materials.

2. OBLIGATIONS
The Receiving Party agrees to:
- Hold and maintain Confidential Information in strict confidence
- Not disclose Confidential Information to third parties
- Use Confidential Information solely for the purpose of {{purpose}}

3. EXCLUSIONS
This NDA does not apply to information that:
- Is or becomes publicly available through no fault of the Receiving Party
- Was known to the Receiving Party prior to disclosure
- Is independently developed without use of Confidential Information

4. TERM
This NDA shall remain in effect for {{duration}} from the date of execution.

5. RETURN OF MATERIALS
Upon termination, the Receiving Party shall return or destroy all Confidential Information.

Agreed and accepted:', '["date","disclosingParty","receivingParty","purpose","duration"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM "ContractTemplate" WHERE "name" = 'Non-Disclosure Agreement' LIMIT 1);

-- Project file management
CREATE TABLE IF NOT EXISTS "ProjectFile" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER REFERENCES "Order"("id"),
  "uploadedBy" INTEGER NOT NULL REFERENCES "User"("id"),
  "fileName" VARCHAR(500) NOT NULL,
  "fileKey" VARCHAR(500) NOT NULL,
  "fileSize" BIGINT NOT NULL DEFAULT 0,
  "mimeType" VARCHAR(100),
  "folder" VARCHAR(200) DEFAULT '/',
  "version" INTEGER DEFAULT 1,
  "isLatest" BOOLEAN DEFAULT true,
  "tags" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_project_file_order" ON "ProjectFile" ("orderId");
CREATE INDEX IF NOT EXISTS "idx_project_file_folder" ON "ProjectFile" ("orderId", "folder");
