/* eslint-disable no-console */
import "dotenv/config";
import jwt from "jsonwebtoken";
import { buildApp } from "../src/app.js";
import { sql, sqlOne, disconnectDB } from "../src/db.js";

type Row = Record<string, unknown>;

function tokenFor(user: { id: number; email: string; role: string }) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  return jwt.sign({ id: user.id, email: user.email, role: user.role, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
}

async function assertOk(response: Awaited<ReturnType<Awaited<ReturnType<typeof buildApp>>["inject"]>>, label: string) {
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`${label} failed (${response.statusCode}): ${response.body}`);
  }
  return response.json() as { data?: Row; message?: string };
}

const startedAt = new Date();
let order: Row | null = null;
let job: Row | null = null;
let deliveryIds: number[] = [];
let smokeFileIds: number[] = [];

(async () => {
  const app = await buildApp();
  try {
    await sql(
      `DELETE FROM "Notification"
        WHERE "metadata"->>'deliveryId' IN (
          SELECT "id"::text FROM "FinalDelivery" WHERE "releaseNotes" ILIKE 'Smoke%'
        )`,
      []
    );
    await sql(`DELETE FROM "FinalDelivery" WHERE "releaseNotes" ILIKE 'Smoke%'`, []);

    order = await sqlOne(
      `SELECT o."id", o."status", o."escrowStatus", o."progress", o."completedAt", o."updatedAt",
              o."totalPrice", o."freelancerPayout",
              fp."id" AS "freelancerProfileId", fp."totalEarnings", fp."activeOrders",
              client."id" AS "clientId", client."email" AS "clientEmail", client."role" AS "clientRole",
              freelancer."id" AS "freelancerUserId", freelancer."email" AS "freelancerEmail", freelancer."role" AS "freelancerRole"
         FROM "Order" o
         JOIN "User" client ON client."id" = o."client_id"
         JOIN "FreelancerProfile" fp ON fp."id" = o."freelancer_id"
         JOIN "User" freelancer ON freelancer."id" = fp."user_id"
        WHERE o."deletedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "FinalDelivery" fd
             WHERE fd."orderId" = o."id"
          )
        ORDER BY o."createdAt" DESC
        LIMIT 1`,
      []
    );

    if (!order) {
      job = await sqlOne(
        `SELECT j."id", j."status", j."progress", j."updatedAt",
                client."id" AS "clientId", client."email" AS "clientEmail", client."role" AS "clientRole",
                freelancer."id" AS "freelancerUserId", freelancer."email" AS "freelancerEmail", freelancer."role" AS "freelancerRole"
           FROM "Job" j
           JOIN "User" client ON client."id" = j."posted_by_id"
           JOIN "User" freelancer ON freelancer."id" = j."freelancer_id"
          WHERE j."deletedAt" IS NULL
            AND j."freelancer_id" IS NOT NULL
            AND j."status" IN ('ACCEPTED'::"JobStatus", 'IN_PROGRESS'::"JobStatus")
            AND NOT EXISTS (SELECT 1 FROM "Milestone" m WHERE m."jobId" = j."id")
            AND NOT EXISTS (
              SELECT 1 FROM "FinalDelivery" fd
               WHERE fd."jobId" = j."id"
                 AND fd."status" IN ('SUBMITTED', 'APPROVED', 'AUTO_APPROVED', 'DISPUTED')
            )
          ORDER BY j."updatedAt" DESC
          LIMIT 1`,
        []
      );
      if (!job) {
        console.log("Skipped final delivery endpoint smoke: no eligible CURRENT order or assigned job fixture.");
        return;
      }

      const clientToken = tokenFor({
        id: Number(job.clientId),
        email: String(job.clientEmail),
        role: String(job.clientRole),
      });
      const freelancerToken = tokenFor({
        id: Number(job.freelancerUserId),
        email: String(job.freelancerEmail),
        role: String(job.freelancerRole),
      });
      const authClient = { authorization: `Bearer ${clientToken}` };
      const authFreelancer = { authorization: `Bearer ${freelancerToken}` };

      const reviewJobFile1 = await sqlOne(
        `INSERT INTO "ProjectFile" ("jobId", "uploaderId", "fileName", "url", "mimeType", "size", "category", "version", "status", "note", "createdAt", "updatedAt")
         VALUES ($1, $2, 'smoke-job-review-v1.mp4', 'smoke/job-review-v1.mp4', 'video/mp4', 1000, 'deliverable', 1, 'PENDING_REVIEW', 'Smoke review', NOW(), NOW())
         RETURNING "id"`,
        [job.id, job.freelancerUserId]
      );
      const reviewJobFile2 = await sqlOne(
        `INSERT INTO "ProjectFile" ("jobId", "uploaderId", "fileName", "url", "mimeType", "size", "category", "version", "status", "note", "createdAt", "updatedAt")
         VALUES ($1, $2, 'smoke-job-review-v2.mp4', 'smoke/job-review-v2.mp4', 'video/mp4', 1000, 'deliverable', 1, 'PENDING_REVIEW', 'Smoke review', NOW(), NOW())
         RETURNING "id"`,
        [job.id, job.freelancerUserId]
      );
      const masterJobFile = await sqlOne(
        `INSERT INTO "ProjectFile" ("jobId", "uploaderId", "fileName", "url", "mimeType", "size", "category", "version", "status", "note", "createdAt", "updatedAt")
         VALUES ($1, $2, 'smoke-job-master.mp4', 'smoke/job-master.mp4', 'video/mp4', 1000, 'final', 1, 'PENDING_REVIEW', 'Smoke master', NOW(), NOW())
         RETURNING "id"`,
        [job.id, job.freelancerUserId]
      );
      smokeFileIds = [Number(reviewJobFile1?.id), Number(reviewJobFile2?.id), Number(masterJobFile?.id)].filter(Number.isFinite);

      const firstSubmit = await assertOk(
        await app.inject({
          method: "POST",
          url: `/api/v1/deliveries/JOB/${String(job.id)}/submit-final`,
          headers: authFreelancer,
          payload: { releaseNotes: "Smoke job final v1", reviewFileIds: [Number(reviewJobFile1?.id)], revisionIds: [], sourceIncluded: true },
        }),
        "submit job final v1"
      );
      const firstDeliveryId = Number(firstSubmit.data?.id);
      deliveryIds.push(firstDeliveryId);

      await assertOk(
        await app.inject({
          method: "POST",
          url: `/api/v1/deliveries/${firstDeliveryId}/request-changes`,
          headers: authClient,
          payload: { reviewNote: "Smoke job change request" },
        }),
        "request job changes"
      );

      const secondSubmit = await assertOk(
        await app.inject({
          method: "POST",
          url: `/api/v1/deliveries/JOB/${String(job.id)}/submit-final`,
          headers: authFreelancer,
          payload: { releaseNotes: "Smoke job final v2", reviewFileIds: [Number(reviewJobFile2?.id)], revisionIds: [], sourceIncluded: true },
        }),
        "submit job final v2"
      );
      const secondDeliveryId = Number(secondSubmit.data?.id);
      deliveryIds.push(secondDeliveryId);

      await assertOk(
        await app.inject({
          method: "POST",
          url: `/api/v1/deliveries/${secondDeliveryId}/approve`,
          headers: authClient,
          payload: { reviewNote: "Smoke job approval" },
        }),
        "approve job final"
      );

      await assertOk(
        await app.inject({
          method: "POST",
          url: `/api/v1/deliveries/${secondDeliveryId}/deliver-master`,
          headers: authFreelancer,
          payload: { masterFileIds: [Number(masterJobFile?.id)], releaseNotes: "Smoke job final master", sourceIncluded: true },
        }),
        "deliver job master"
      );

      const closedJob = await sqlOne(`SELECT "status", "progress" FROM "Job" WHERE "id" = $1`, [job.id]);
      if (String(closedJob?.status) !== "COMPLETED" || Number(closedJob?.progress) !== 100) {
        throw new Error("Expected job to be completed with 100 progress");
      }

      console.log(`Final delivery job smoke passed on job ${String(job.id)} with deliveries ${deliveryIds.join(", ")}`);
      return;
    }

    const clientToken = tokenFor({
      id: Number(order.clientId),
      email: String(order.clientEmail),
      role: String(order.clientRole),
    });
    const freelancerToken = tokenFor({
      id: Number(order.freelancerUserId),
      email: String(order.freelancerEmail),
      role: String(order.freelancerRole),
    });

    const authClient = { authorization: `Bearer ${clientToken}` };
    const authFreelancer = { authorization: `Bearer ${freelancerToken}` };

    await sql(
      `UPDATE "Order"
          SET "status" = 'CURRENT'::"OrderStatus",
              "escrowStatus" = 'HELD',
              "updatedAt" = NOW()
        WHERE "id" = $1`,
      [order.id]
    );

    const reviewFile1 = await sqlOne(
      `INSERT INTO "ProjectFile" ("orderId", "uploadedBy", "uploaderId", "fileName", "fileKey", "url", "fileSize", "size", "mimeType", "category", "folder", "version", "status", "note", "isLatest", "tags", "createdAt", "updatedAt")
       VALUES ($1, $2, $2, 'smoke-review-v1.mp4', $3, 'smoke/review-v1.mp4', 1000, 1000, 'video/mp4', 'deliverable', '/review-cuts', 1, 'PENDING_REVIEW', 'Smoke review', true, '["review"]'::jsonb, NOW(), NOW())
       RETURNING "id"`,
      [order.id, order.freelancerUserId, `project-files/${String(order.id)}/${String(order.freelancerUserId)}/smoke-review-v1.mp4`]
    );
    const reviewFile2 = await sqlOne(
      `INSERT INTO "ProjectFile" ("orderId", "uploadedBy", "uploaderId", "fileName", "fileKey", "url", "fileSize", "size", "mimeType", "category", "folder", "version", "status", "note", "isLatest", "tags", "createdAt", "updatedAt")
       VALUES ($1, $2, $2, 'smoke-review-v2.mp4', $3, 'smoke/review-v2.mp4', 1000, 1000, 'video/mp4', 'deliverable', '/review-cuts', 1, 'PENDING_REVIEW', 'Smoke review', true, '["review"]'::jsonb, NOW(), NOW())
       RETURNING "id"`,
      [order.id, order.freelancerUserId, `project-files/${String(order.id)}/${String(order.freelancerUserId)}/smoke-review-v2.mp4`]
    );
    const masterFile = await sqlOne(
      `INSERT INTO "ProjectFile" ("orderId", "uploadedBy", "uploaderId", "fileName", "fileKey", "url", "fileSize", "size", "mimeType", "category", "folder", "version", "status", "note", "isLatest", "tags", "createdAt", "updatedAt")
       VALUES ($1, $2, $2, 'smoke-final-master.mp4', $3, 'smoke/final-master.mp4', 1000, 1000, 'video/mp4', 'final', '/final-master', 1, 'PENDING_REVIEW', 'Smoke master', true, '["master"]'::jsonb, NOW(), NOW())
       RETURNING "id"`,
      [order.id, order.freelancerUserId, `project-files/${String(order.id)}/${String(order.freelancerUserId)}/smoke-final-master.mp4`]
    );
    smokeFileIds = [Number(reviewFile1?.id), Number(reviewFile2?.id), Number(masterFile?.id)].filter(Number.isFinite);

    const firstSubmit = await assertOk(
      await app.inject({
        method: "POST",
        url: `/api/v1/deliveries/ORDER/${String(order.id)}/submit-final`,
        headers: authFreelancer,
        payload: { releaseNotes: "Smoke final v1", reviewFileIds: [Number(reviewFile1?.id)], revisionIds: [], sourceIncluded: true },
      }),
      "submit final v1"
    );
    const firstDeliveryId = Number(firstSubmit.data?.id);
    deliveryIds.push(firstDeliveryId);

    await assertOk(
      await app.inject({
        method: "POST",
        url: `/api/v1/deliveries/${firstDeliveryId}/request-changes`,
        headers: authClient,
        payload: { reviewNote: "Smoke change request" },
      }),
      "request changes"
    );

    const secondSubmit = await assertOk(
      await app.inject({
        method: "POST",
        url: `/api/v1/deliveries/ORDER/${String(order.id)}/submit-final`,
        headers: authFreelancer,
        payload: { releaseNotes: "Smoke final v2", reviewFileIds: [Number(reviewFile2?.id)], revisionIds: [], sourceIncluded: true },
      }),
      "submit final v2"
    );
    const secondDeliveryId = Number(secondSubmit.data?.id);
    deliveryIds.push(secondDeliveryId);

    await assertOk(
      await app.inject({
        method: "POST",
        url: `/api/v1/deliveries/${secondDeliveryId}/approve`,
        headers: authClient,
        payload: { reviewNote: "Smoke approval" },
      }),
      "approve final"
    );

    await assertOk(
      await app.inject({
        method: "POST",
        url: `/api/v1/deliveries/${secondDeliveryId}/deliver-master`,
        headers: authFreelancer,
        payload: { masterFileIds: [Number(masterFile?.id)], releaseNotes: "Smoke final master", sourceIncluded: true },
      }),
      "deliver final master"
    );

    const loaded = await assertOk(
      await app.inject({
        method: "GET",
        url: `/api/v1/deliveries/ORDER/${String(order.id)}`,
        headers: authClient,
      }),
      "load delivery"
    );
    if (loaded.data?.latest && String((loaded.data.latest as Row).status) !== "FINAL_DELIVERED") {
      throw new Error("Expected latest delivery to be FINAL_DELIVERED after master smoke");
    }

    const closedOrder = await sqlOne(`SELECT "status", "escrowStatus" FROM "Order" WHERE "id" = $1`, [order.id]);
    if (String(closedOrder?.status) !== "COMPLETED" || String(closedOrder?.escrowStatus) !== "RELEASED") {
      throw new Error("Expected order to be completed and escrow released");
    }

    console.log(`Final delivery smoke passed on order ${String(order.id)} with deliveries ${deliveryIds.join(", ")}`);
  } finally {
    if (job) {
      const ids = deliveryIds.filter(Number.isFinite);
      if (ids.length > 0) {
        await sql(
          `DELETE FROM "Notification"
            WHERE "entityType" = 'Job'
              AND "entityId" = $1
              AND "createdAt" >= $2
              AND (
                "metadata"->>'deliveryId' = ANY($3::text[])
                OR "content" ILIKE '%Final delivery%'
                OR "content" ILIKE '%final delivery%'
                OR "content" ILIKE '%Project closed%'
              )`,
          [job.id, startedAt, ids.map(String)]
        );
        await sql(`DELETE FROM "FinalDelivery" WHERE "id" = ANY($1::int[])`, [ids]);
      }
      await sql(
        `UPDATE "Job"
            SET "status" = $2::"JobStatus",
                "progress" = $3,
                "updatedAt" = $4
          WHERE "id" = $1`,
        [job.id, job.status, job.progress, job.updatedAt]
      );
      if (smokeFileIds.length > 0) {
        await sql(`DELETE FROM "ProjectFile" WHERE "id" = ANY($1::int[])`, [smokeFileIds]);
      }
    }
    if (order) {
      const ids = deliveryIds.filter(Number.isFinite);
      if (ids.length > 0) {
        await sql(
          `DELETE FROM "Notification"
            WHERE "entityType" = 'Order'
              AND "entityId" = $1
              AND "createdAt" >= $2
              AND (
                "metadata"->>'deliveryId' = ANY($3::text[])
                OR "content" ILIKE '%Final delivery%'
                OR "content" ILIKE '%final delivery%'
                OR "content" ILIKE '%Project closed%'
              )`,
          [order.id, startedAt, ids.map(String)]
        );
        await sql(`DELETE FROM "FinalDelivery" WHERE "id" = ANY($1::int[])`, [ids]);
      }
      await sql(
        `DELETE FROM "OrderStatusHistory"
          WHERE "order_id" = $1
            AND "status" = 'COMPLETED'::"OrderStatus"
            AND "changed_by" = $2
            AND "changedAt" >= $3`,
        [order.id, order.clientId, startedAt]
      );
      await sql(
        `UPDATE "Order"
            SET "status" = $2::"OrderStatus",
                "escrowStatus" = $3,
                "progress" = $4,
                "completedAt" = $5,
                "updatedAt" = $6
          WHERE "id" = $1`,
        [order.id, order.status, order.escrowStatus, order.progress, order.completedAt, order.updatedAt]
      );
      await sql(
        `UPDATE "FreelancerProfile"
            SET "totalEarnings" = $2,
                "activeOrders" = $3,
                "updatedAt" = NOW()
          WHERE "id" = $1`,
        [order.freelancerProfileId, order.totalEarnings, order.activeOrders]
      );
      if (smokeFileIds.length > 0) {
        await sql(`DELETE FROM "ProjectFile" WHERE "id" = ANY($1::int[])`, [smokeFileIds]);
      }
    }
    await app.close();
    await disconnectDB();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
