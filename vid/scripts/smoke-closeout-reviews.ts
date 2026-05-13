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

(async () => {
  const app = await buildApp();
  const reviewIds: number[] = [];
  let forcedOrder: Row | null = null;
  try {
    const order = await sqlOne(
      `SELECT o."id", o."status", o."escrowStatus", o."updatedAt",
              client."id" AS "clientId", client."email" AS "clientEmail", client."role" AS "clientRole",
              freelancer."id" AS "freelancerUserId", freelancer."email" AS "freelancerEmail", freelancer."role" AS "freelancerRole",
              EXISTS (
                SELECT 1 FROM "FinalDelivery" fd
                 WHERE fd."scopeType" = 'ORDER' AND fd."orderId" = o."id" AND fd."status" IN ('FINAL_DELIVERED', 'AUTO_APPROVED')
              ) AS "hasFinalDelivery"
         FROM "Order" o
         JOIN "User" client ON client."id" = o."client_id"
         JOIN "FreelancerProfile" fp ON fp."id" = o."freelancer_id"
         JOIN "User" freelancer ON freelancer."id" = fp."user_id"
        WHERE o."deletedAt" IS NULL
        ORDER BY o."updatedAt" DESC
        LIMIT 1`,
      []
    );

    if (!order) {
      console.log("Skipped closeout review smoke: no order fixture.");
      return;
    }

    if (String(order.status) !== "COMPLETED" && !order.hasFinalDelivery) {
      forcedOrder = order;
      await sql(
        `UPDATE "Order"
            SET "status" = 'COMPLETED'::"OrderStatus", "escrowStatus" = 'RELEASED', "updatedAt" = NOW()
          WHERE "id" = $1`,
        [order.id]
      );
    }

    await sql(`DELETE FROM "CounterpartyReview" WHERE "scopeType" = 'ORDER' AND "orderId" = $1`, [order.id]);

    const authClient = {
      authorization: `Bearer ${tokenFor({
        id: Number(order.clientId),
        email: String(order.clientEmail),
        role: String(order.clientRole),
      })}`,
    };
    const authFreelancer = {
      authorization: `Bearer ${tokenFor({
        id: Number(order.freelancerUserId),
        email: String(order.freelancerEmail),
        role: String(order.freelancerRole),
      })}`,
    };

    const initial = await assertOk(
      await app.inject({
        method: "GET",
        url: `/api/v1/reviews/closeout/ORDER/${String(order.id)}`,
        headers: authClient,
      }),
      "load closeout review state"
    );
    if (!initial.data?.eligible || !initial.data?.canReview) {
      throw new Error("Expected client to be eligible to review completed delivery");
    }

    const clientReview = await assertOk(
      await app.inject({
        method: "POST",
        url: `/api/v1/reviews/closeout/ORDER/${String(order.id)}`,
        headers: authClient,
        payload: {
          rating: 5,
          criteriaRatings: { Quality: 5, Communication: 5 },
          tags: ["Smoke closeout", "On time"],
          publicComment: "Smoke closeout client review",
          privateNote: "Smoke private client note",
          wouldWorkAgain: true,
        },
      }),
      "submit client closeout review"
    );
    if (clientReview.data?.myReview && typeof clientReview.data.myReview === "object") {
      reviewIds.push(Number((clientReview.data.myReview as Row).id));
    }

    const duplicate = await app.inject({
      method: "POST",
      url: `/api/v1/reviews/closeout/ORDER/${String(order.id)}`,
      headers: authClient,
      payload: { rating: 4 },
    });
    if (duplicate.statusCode !== 409) {
      throw new Error(`Expected duplicate review to be blocked with 409, got ${duplicate.statusCode}`);
    }

    const freelancerReview = await assertOk(
      await app.inject({
        method: "POST",
        url: `/api/v1/reviews/closeout/ORDER/${String(order.id)}`,
        headers: authFreelancer,
        payload: {
          rating: 5,
          criteriaRatings: { "Clear brief": 5, Responsiveness: 5 },
          tags: ["Smoke closeout", "Clear brief"],
          publicComment: "Smoke closeout freelancer review",
          privateNote: "Smoke private freelancer note",
          wouldWorkAgain: true,
        },
      }),
      "submit freelancer closeout review"
    );
    if (freelancerReview.data?.myReview && typeof freelancerReview.data.myReview === "object") {
      reviewIds.push(Number((freelancerReview.data.myReview as Row).id));
    }

    const loaded = await assertOk(
      await app.inject({
        method: "GET",
        url: `/api/v1/reviews/closeout/ORDER/${String(order.id)}`,
        headers: authClient,
      }),
      "reload mutual review state"
    );
    if (!loaded.data?.myReview || !loaded.data?.peerReview) {
      throw new Error("Expected both client and freelancer reviews to be visible in closeout state");
    }

    const ineligible = await sqlOne(
      `SELECT o."id", client."id" AS "clientId", client."email" AS "clientEmail", client."role" AS "clientRole"
         FROM "Order" o
         JOIN "User" client ON client."id" = o."client_id"
        WHERE o."deletedAt" IS NULL
          AND o."status" <> 'COMPLETED'::"OrderStatus"
          AND NOT EXISTS (
            SELECT 1 FROM "FinalDelivery" fd
             WHERE fd."scopeType" = 'ORDER' AND fd."orderId" = o."id" AND fd."status" IN ('FINAL_DELIVERED', 'AUTO_APPROVED')
          )
        LIMIT 1`,
      []
    );
    if (ineligible) {
      const denied = await app.inject({
        method: "POST",
        url: `/api/v1/reviews/closeout/ORDER/${String(ineligible.id)}`,
        headers: {
          authorization: `Bearer ${tokenFor({
            id: Number(ineligible.clientId),
            email: String(ineligible.clientEmail),
            role: String(ineligible.clientRole),
          })}`,
        },
        payload: { rating: 5 },
      });
      if (denied.statusCode !== 400) {
        throw new Error(`Expected pre-closeout review to be blocked with 400, got ${denied.statusCode}`);
      }
    }

    console.log(`Closeout review smoke passed on order ${String(order.id)}`);
  } finally {
    const ids = reviewIds.filter(Number.isFinite);
    if (ids.length > 0) {
      await sql(`DELETE FROM "CounterpartyReview" WHERE "id" = ANY($1::int[])`, [ids]);
    }
    if (forcedOrder) {
      await sql(
        `UPDATE "Order"
            SET "status" = $2::"OrderStatus", "escrowStatus" = $3, "updatedAt" = $4
          WHERE "id" = $1`,
        [forcedOrder.id, forcedOrder.status, forcedOrder.escrowStatus, forcedOrder.updatedAt]
      );
    }
    await app.close();
    await disconnectDB();
  }
})().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});
