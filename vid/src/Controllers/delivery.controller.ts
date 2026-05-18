import { sql, sqlOne, txOne, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";
import type { PoolClient } from "pg";
import { areDevPlaceholdersAllowed, createEscrowReleaseTransfer } from "../Services/payment.service.js";
import { countOpenReviewComments } from "./videoReview.controller.js";

type ScopeType = "ORDER" | "JOB";
type ProjectRole = "client" | "freelancer" | "admin";
type Handler = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

const REVIEW_WINDOW_DAYS = 7;
const OPEN_DELIVERY_STATUSES = new Set(["SUBMITTED"]);
const TERMINAL_DELIVERY_STATUSES = new Set(["FINAL_DELIVERED", "AUTO_APPROVED", "DISPUTED"]);

function parseScopeType(value: unknown): ScopeType {
  const scopeType = String(value || "").toUpperCase();
  if (scopeType !== "ORDER" && scopeType !== "JOB") {
    throw new ApiError(400, "scopeType must be ORDER or JOB");
  }
  return scopeType;
}

function parsePositiveInt(value: unknown, label: string): number {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) throw new ApiError(400, `Invalid ${label}`);
  return n;
}

function normalizeIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((v) => Number.parseInt(String(v), 10))
    .filter((v) => Number.isFinite(v) && v > 0);
  return [...new Set(ids)];
}

function mapDelivery(row: DbRow | null): DbRow | null {
  if (!row) return null;
  return {
    ...row,
    version: Number(row.version) || 1,
    finalFileIds: Array.isArray(row.finalFileIds) ? row.finalFileIds : [],
    reviewFileIds: Array.isArray(row.reviewFileIds) ? row.reviewFileIds : [],
    masterFileIds: Array.isArray(row.masterFileIds) ? row.masterFileIds : [],
    revisionIds: Array.isArray(row.revisionIds) ? row.revisionIds : [],
  };
}

function roleFor(req: ExpressRequest, clientId?: unknown, freelancerUserId?: unknown): ProjectRole | null {
  if (req.user?.role === "ADMIN") return "admin";
  if (Number(clientId) === Number(req.user?.id)) return "client";
  if (Number(freelancerUserId) === Number(req.user?.id)) return "freelancer";
  return null;
}

async function loadScope(req: ExpressRequest, scopeType: ScopeType, scopeId: number): Promise<{ role: ProjectRole; row: DbRow }> {
  if (!req.user?.id) throw new ApiError(401, "Unauthorized");

  if (scopeType === "ORDER") {
    const row = (await sqlOne(
      `SELECT o.*, o."client_id" AS "clientId", o."freelancer_id" AS "freelancerProfileId",
              fp."user_id" AS "freelancerUserId"
         FROM "Order" o
         JOIN "FreelancerProfile" fp ON fp."id" = o."freelancer_id"
        WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [scopeId]
    )) as DbRow | null;
    if (!row) throw new ApiError(404, "Order not found");
    const role = roleFor(req, row.clientId, row.freelancerUserId);
    if (!role) throw new ApiError(403, "You are not part of this order");
    return { role, row };
  }

  const row = (await sqlOne(
    `SELECT j.*, j."posted_by_id" AS "clientId", j."freelancer_id" AS "freelancerUserId"
       FROM "Job" j
      WHERE j."id" = $1 AND j."deletedAt" IS NULL`,
    [scopeId]
  )) as DbRow | null;
  if (!row) throw new ApiError(404, "Project not found");
  const role = roleFor(req, row.clientId, row.freelancerUserId);
  if (!role) throw new ApiError(403, "You are not part of this project");
  return { role, row };
}

async function getLatestDelivery(scopeType: ScopeType, scopeId: number): Promise<DbRow | null> {
  const key = scopeType === "ORDER" ? "orderId" : "jobId";
  return (await sqlOne(
    `SELECT fd.*, submitter."firstname" AS "submitterFirstName", submitter."lastname" AS "submitterLastName",
            reviewer."firstname" AS "reviewerFirstName", reviewer."lastname" AS "reviewerLastName"
       FROM "FinalDelivery" fd
       LEFT JOIN "User" submitter ON submitter."id" = fd."submittedById"
       LEFT JOIN "User" reviewer ON reviewer."id" = fd."reviewedById"
      WHERE fd."scopeType" = $1 AND fd."${key}" = $2
      ORDER BY fd."version" DESC
      LIMIT 1`,
    [scopeType, scopeId]
  )) as DbRow | null;
}

async function assertDeliveryFiles(
  scopeType: ScopeType,
  scopeId: number,
  ids: number[],
  kind: "review" | "master"
): Promise<void> {
  if (ids.length === 0) {
    throw new ApiError(400, kind === "review" ? "At least one review cut file is required" : "At least one final master file is required");
  }

  if (scopeType === "JOB") {
    const rows = await sql(
      `SELECT "id", "category"
         FROM "ProjectFile"
        WHERE "jobId" = $1 AND "id" = ANY($2::int[])`,
      [scopeId, ids]
    );
    if (rows.length !== ids.length) {
      throw new ApiError(400, "One or more selected files do not belong to this project");
    }
    const invalid = rows.find((row) => {
      const category = String(row.category || "").toLowerCase();
      return kind === "review" ? category === "final" : category !== "final";
    });
    if (invalid) {
      throw new ApiError(
        400,
        kind === "review"
          ? "Review submission cannot use final-master files"
          : "Final delivery requires files categorized as final"
      );
    }
    await assertMediaReadyForDelivery(ids);
    return;
  }

  const rows = await sql(
    `SELECT "id", "folder", "tags"
       FROM "ProjectFile"
      WHERE "orderId" = $1 AND "id" = ANY($2::int[]) AND "isLatest" = true`,
    [scopeId, ids]
  );
  if (rows.length !== ids.length) {
    throw new ApiError(400, "One or more selected files do not belong to this order");
  }
  const expectedFolder = kind === "review" ? "/review-cuts" : "/final-master";
  const invalid = rows.find((row) => String(row.folder || "") !== expectedFolder);
  if (invalid) {
    throw new ApiError(
      400,
      kind === "review"
        ? "Review submission must use files from the review-cuts folder"
        : "Final delivery must use files from the final-master folder"
    );
  }
  await assertMediaReadyForDelivery(ids);
}

async function assertMediaReadyForDelivery(projectFileIds: number[]): Promise<void> {
  const mediaRows = await sql(
    `SELECT "projectFileId", "status", "scanStatus", "processingStatus", "error"
       FROM "MediaAsset"
      WHERE "projectFileId" = ANY($1::int[]) AND "deletedAt" IS NULL`,
    [projectFileIds]
  );
  const blocked = mediaRows.find((row) => ["FAILED", "QUARANTINED"].includes(String(row.status)));
  if (blocked) {
    throw new ApiError(400, "This media file is failed or quarantined and cannot be submitted");
  }
  const readyStatuses = areDevPlaceholdersAllowed() ? ["READY", "PLACEHOLDER"] : ["READY"];
  const pending = mediaRows.find((row) => !readyStatuses.includes(String(row.status)));
  if (pending) {
    throw new ApiError(409, String(pending.status) === "PLACEHOLDER" ? "Placeholder media cannot be submitted in this environment." : "Media is still scanning or processing. Please wait until it is ready.");
  }
}

async function listDeliveryHistory(scopeType: ScopeType, scopeId: number): Promise<DbRow[]> {
  const key = scopeType === "ORDER" ? "orderId" : "jobId";
  const rows = (await sql(
    `SELECT fd.*, submitter."firstname" AS "submitterFirstName", submitter."lastname" AS "submitterLastName",
            reviewer."firstname" AS "reviewerFirstName", reviewer."lastname" AS "reviewerLastName"
       FROM "FinalDelivery" fd
       LEFT JOIN "User" submitter ON submitter."id" = fd."submittedById"
       LEFT JOIN "User" reviewer ON reviewer."id" = fd."reviewedById"
      WHERE fd."scopeType" = $1 AND fd."${key}" = $2
      ORDER BY fd."version" DESC`,
    [scopeType, scopeId]
  )) as DbRow[];
  return rows.map((row) => mapDelivery(row) as DbRow);
}

async function createNotificationTx(
  client: PoolClient,
  userId: number,
  type: "ORDER_UPDATE" | "PAYMENT" | "REVIEW" | "DISPUTE",
  content: string,
  entityType: "Order" | "Job",
  entityId: number,
  priority: "NORMAL" | "HIGH" = "NORMAL",
  metadata: Record<string, unknown> = {}
) {
  await client.query(
    `INSERT INTO "Notification" ("user_id", "type", "content", "entityType", "entityId", "priority", "metadata", "createdAt", "updatedAt")
     VALUES ($1, $2::"NotificationType", $3, $4, $5, $6::"Priority", $7::jsonb, NOW(), NOW())`,
    [userId, type, content, entityType, entityId, priority, JSON.stringify(metadata)]
  );
}

export const getDelivery: Handler = async (req, res, next) => {
  try {
    const scopeType = parseScopeType((req.params as Record<string, string>).scopeType);
    const scopeId = parsePositiveInt((req.params as Record<string, string>).scopeId, "scope id");
    const { role, row } = await loadScope(req, scopeType, scopeId);
    const history = await listDeliveryHistory(scopeType, scopeId);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          scopeType,
          scopeId,
          role,
          scope: row,
          latest: history[0] || null,
          history,
          reviewWindowDays: REVIEW_WINDOW_DAYS,
        },
        "Final delivery retrieved"
      )
    );
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`getDelivery: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to load final delivery"));
  }
};

export const submitFinalDelivery: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const scopeType = parseScopeType((req.params as Record<string, string>).scopeType);
    const scopeId = parsePositiveInt((req.params as Record<string, string>).scopeId, "scope id");
    const { role, row } = await loadScope(req, scopeType, scopeId);

    if (role !== "freelancer" && role !== "admin") {
      return next(new ApiError(403, "Only the assigned editor can submit the final cut"));
    }

    const latest = await getLatestDelivery(scopeType, scopeId);
    if (latest && TERMINAL_DELIVERY_STATUSES.has(String(latest.status))) {
      return next(new ApiError(400, "This project has already been closed or disputed"));
    }
    if (latest && String(latest.status) === "SUBMITTED") {
      return next(new ApiError(409, "A final delivery is already waiting for client review"));
    }

    // Block sending the cut for approval while review feedback is still open.
    // The editor must resolve every comment first; the client uses the review
    // panel to leave them, so this gate is what makes the loop work.
    const openCount = await countOpenReviewComments({ kind: scopeType, id: scopeId });
    if (openCount > 0) {
      return next(
        new ApiError(
          409,
          `Resolve all ${openCount} open review comment${openCount === 1 ? "" : "s"} before sending this cut for approval.`
        )
      );
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const releaseNotes = String(body.releaseNotes || "").trim();
    const reviewFileIds = normalizeIds(body.reviewFileIds ?? body.finalFileIds);
    const revisionIds = normalizeIds(body.revisionIds);
    const sourceIncluded = Boolean(body.sourceIncluded);
    const nextVersion = (Number(latest?.version) || 0) + 1;
    const reviewDueAt = new Date(Date.now() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const clientId = Number(row.clientId);
    await assertDeliveryFiles(scopeType, scopeId, reviewFileIds, "review");

    const delivery = await withTransaction(async (client) => {
      const tOne = txOne(client);
      const created = (await tOne(
        `INSERT INTO "FinalDelivery" (
          "scopeType", "orderId", "jobId", "submittedById", "status", "version",
          "releaseNotes", "reviewFileIds", "finalFileIds", "revisionIds", "sourceIncluded", "reviewDueAt",
          "submittedAt", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, 'SUBMITTED', $5, $6, $7::jsonb, $7::jsonb, $8::jsonb, $9, $10, NOW(), NOW(), NOW())
        RETURNING *`,
        [
          scopeType,
          scopeType === "ORDER" ? scopeId : null,
          scopeType === "JOB" ? scopeId : null,
          req.user!.id,
          nextVersion,
          releaseNotes || null,
          JSON.stringify(reviewFileIds),
          JSON.stringify(revisionIds),
          sourceIncluded,
          reviewDueAt,
        ]
      )) as DbRow;

      await createNotificationTx(
        client,
        clientId,
        "ORDER_UPDATE",
        `Watermarked review cut v${nextVersion} is ready for approval.`,
        scopeType === "ORDER" ? "Order" : "Job",
        scopeId,
        "HIGH",
        { deliveryId: created.id, scopeType }
      );

      return created;
    });

    return res.status(201).json(new ApiResponse(201, mapDelivery(delivery as DbRow), "Review cut submitted"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`submitFinalDelivery: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to submit final delivery"));
  }
};

async function loadDeliveryById(req: ExpressRequest, deliveryId: number) {
  const delivery = (await sqlOne(`SELECT * FROM "FinalDelivery" WHERE "id" = $1`, [deliveryId])) as DbRow | null;
  if (!delivery) throw new ApiError(404, "Final delivery not found");
  const scopeType = parseScopeType(delivery.scopeType);
  const scopeId = Number(scopeType === "ORDER" ? delivery.orderId : delivery.jobId);
  const scope = await loadScope(req, scopeType, scopeId);
  return { delivery, scopeType, scopeId, ...scope };
}

export const requestDeliveryChanges: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const deliveryId = parsePositiveInt((req.params as Record<string, string>).deliveryId, "delivery id");
    const { delivery, scopeType, scopeId, role, row } = await loadDeliveryById(req, deliveryId);
    if (role !== "client" && role !== "admin") {
      return next(new ApiError(403, "Only the client can request changes"));
    }
    if (String(delivery.status) !== "SUBMITTED") {
      return next(new ApiError(400, "Only submitted deliveries can be sent back for changes"));
    }

    const reviewNote = String(((req.body || {}) as Record<string, unknown>).reviewNote || "").trim();
    const updated = await withTransaction(async (client) => {
      const tOne = txOne(client);
      const rowUpdated = await tOne(
        `UPDATE "FinalDelivery"
            SET "status" = 'CHANGES_REQUESTED',
                "reviewNote" = $2,
                "reviewedById" = $3,
                "reviewedAt" = NOW(),
                "updatedAt" = NOW()
          WHERE "id" = $1 AND "status" = 'SUBMITTED'
          RETURNING *`,
        [deliveryId, reviewNote || null, req.user!.id]
      );
      if (!rowUpdated) throw new ApiError(409, "Delivery status was already changed");

      if (scopeType === "ORDER") {
        await client.query(
          `UPDATE "Order"
              SET "escrowStatus" = CASE WHEN "escrowStatus" = 'RELEASE_REQUESTED' THEN 'HELD' ELSE "escrowStatus" END,
                  "updatedAt" = NOW()
            WHERE "id" = $1 AND "deletedAt" IS NULL`,
          [scopeId]
        );
      }

      await createNotificationTx(
        client,
        Number(row.freelancerUserId),
        "ORDER_UPDATE",
        "The client requested changes on the final delivery.",
        scopeType === "ORDER" ? "Order" : "Job",
        scopeId,
        "HIGH",
        { deliveryId, scopeType, reviewNote }
      );
      return rowUpdated;
    });

    return res.status(200).json(new ApiResponse(200, mapDelivery(updated as DbRow), "Changes requested"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`requestDeliveryChanges: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to request changes"));
  }
};

export const approveDelivery: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const deliveryId = parsePositiveInt((req.params as Record<string, string>).deliveryId, "delivery id");
    const { delivery, scopeType, scopeId, role, row } = await loadDeliveryById(req, deliveryId);
    if (role !== "client" && role !== "admin") {
      return next(new ApiError(403, "Only the client can approve final delivery"));
    }
    if (!OPEN_DELIVERY_STATUSES.has(String(delivery.status))) {
      return next(new ApiError(400, "Only submitted review cuts can be approved"));
    }

    const reviewNote = String(((req.body || {}) as Record<string, unknown>).reviewNote || "").trim();
    const reviewFileIds = normalizeIds(delivery.reviewFileIds ?? delivery.finalFileIds);
    const revisionIds = normalizeIds(delivery.revisionIds);

    const result = await withTransaction(async (client) => {
      const tOne = txOne(client);
      const updatedDelivery = await tOne(
        `UPDATE "FinalDelivery"
            SET "status" = 'APPROVED',
                "reviewNote" = COALESCE($2, "reviewNote"),
                "reviewedById" = $3,
                "reviewedAt" = NOW(),
                "approvedAt" = NOW(),
                "updatedAt" = NOW()
          WHERE "id" = $1 AND "status" = 'SUBMITTED'
          RETURNING *`,
        [deliveryId, reviewNote || null, req.user!.id]
      );
      if (!updatedDelivery) throw new ApiError(409, "Delivery status was already changed");

      if (revisionIds.length > 0) {
        await client.query(
          `UPDATE "Revision"
              SET "status" = 'APPROVED', "reviewNote" = COALESCE($2, "reviewNote"), "reviewedBy" = $3, "reviewedAt" = NOW()
            WHERE "id" = ANY($1::int[])`,
          [revisionIds, reviewNote || null, req.user!.id]
        );
      }

      if (scopeType === "JOB") {
        if (reviewFileIds.length > 0) {
          await client.query(
            `UPDATE "ProjectFile"
                SET "status" = 'APPROVED', "updatedAt" = NOW()
              WHERE "jobId" = $1 AND "id" = ANY($2::int[])`,
            [scopeId, reviewFileIds]
          );
        }
      }

      const entityType = scopeType === "ORDER" ? "Order" : "Job";
      await createNotificationTx(
        client,
        Number(row.freelancerUserId),
        "ORDER_UPDATE",
        "The client approved the review cut. Upload the full-resolution final master to complete delivery.",
        entityType,
        scopeId,
        "HIGH",
        { deliveryId, scopeType }
      );

      return updatedDelivery;
    });

    return res.status(200).json(new ApiResponse(200, mapDelivery(result as DbRow), "Review cut approved. Awaiting final master"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`approveDelivery: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to approve delivery"));
  }
};

export const deliverFinalMaster: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const deliveryId = parsePositiveInt((req.params as Record<string, string>).deliveryId, "delivery id");
    const { delivery, scopeType, scopeId, role, row } = await loadDeliveryById(req, deliveryId);
    if (role !== "freelancer" && role !== "admin") {
      return next(new ApiError(403, "Only the assigned editor can deliver the final master"));
    }
    if (String(delivery.status) !== "APPROVED") {
      return next(new ApiError(400, "Client must approve the review cut before final master delivery"));
    }

    // Final guard: even after the client has approved the review cut, refuse
    // to push the project to "delivered" while comments are open. This is the
    // last point at which we can block escrow release on unresolved feedback.
    const openCount = await countOpenReviewComments({ kind: scopeType, id: scopeId });
    if (openCount > 0) {
      return next(
        new ApiError(
          409,
          `Resolve all ${openCount} open review comment${openCount === 1 ? "" : "s"} before delivering the final master.`
        )
      );
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const masterFileIds = normalizeIds(body.masterFileIds ?? body.finalFileIds);
    await assertDeliveryFiles(scopeType, scopeId, masterFileIds, "master");
    const releaseNotes = String(body.releaseNotes || "").trim();
    const sourceIncluded = Boolean(body.sourceIncluded ?? delivery.sourceIncluded);
    const escrowTransfer =
      scopeType === "ORDER" && String(row.escrowStatus) !== "RELEASED"
        ? await createEscrowReleaseTransfer({ ...row, id: scopeId })
        : null;

    const result = await withTransaction(async (client) => {
      const tOne = txOne(client);
      const updatedDelivery = await tOne(
        `UPDATE "FinalDelivery"
            SET "status" = 'FINAL_DELIVERED',
                "masterFileIds" = $2::jsonb,
                "finalFileIds" = $2::jsonb,
                "releaseNotes" = COALESCE($3, "releaseNotes"),
                "sourceIncluded" = $4,
                "masterDeliveredAt" = NOW(),
                "updatedAt" = NOW()
          WHERE "id" = $1 AND "status" = 'APPROVED'
          RETURNING *`,
        [deliveryId, JSON.stringify(masterFileIds), releaseNotes || null, sourceIncluded]
      );
      if (!updatedDelivery) throw new ApiError(409, "Delivery status was already changed");

      if (scopeType === "JOB") {
        await client.query(
          `UPDATE "ProjectFile"
              SET "category" = 'final', "status" = 'APPROVED', "updatedAt" = NOW()
            WHERE "jobId" = $1 AND "id" = ANY($2::int[])`,
          [scopeId, masterFileIds]
        );
        await client.query(
          `UPDATE "Timeline"
              SET "status" = 'COMPLETED', "isCompleted" = true, "progress" = 100, "updatedAt" = NOW()
            WHERE "jobId" = $1 AND COALESCE("status", '') <> 'COMPLETED'`,
          [scopeId]
        );
        await client.query(
          `UPDATE "Job"
              SET "status" = 'COMPLETED'::"JobStatus", "progress" = 100, "updatedAt" = NOW()
            WHERE "id" = $1`,
          [scopeId]
        );
      } else {
        const wasReleased = String(row.escrowStatus) === "RELEASED";
        await client.query(
          `UPDATE "Order"
              SET "status" = 'COMPLETED'::"OrderStatus",
                  "escrowStatus" = 'RELEASED',
                  "progress" = 100,
                  "completedAt" = COALESCE("completedAt", NOW()),
                  "updatedAt" = NOW(),
                  "metadata" = COALESCE("metadata", '{}'::jsonb) || $2::jsonb
            WHERE "id" = $1 AND "deletedAt" IS NULL`,
          [
            scopeId,
            JSON.stringify({
              escrowRelease: escrowTransfer,
              finalDeliveryReleasedAt: new Date().toISOString(),
            }),
          ]
        );
        await client.query(
          `UPDATE "Transaction"
              SET "status" = 'COMPLETED'::"TransactionStatus"
            WHERE "order_id" = $1 AND "type" = 'PAYMENT'::"TransactionType"`,
          [scopeId]
        );
        await client.query(
          `INSERT INTO "OrderStatusHistory" ("order_id", "status", "changedAt", "changed_by")
           SELECT $1, 'COMPLETED'::"OrderStatus", NOW(), $2
           WHERE NOT EXISTS (
             SELECT 1 FROM "OrderStatusHistory" WHERE "order_id" = $1 AND "status" = 'COMPLETED'
           )`,
          [scopeId, req.user!.id]
        );
        if (!wasReleased) {
          await client.query(
            `UPDATE "FreelancerProfile"
                SET "totalEarnings" = "totalEarnings" + $1,
                    "activeOrders" = GREATEST(COALESCE("activeOrders", 0) - 1, 0),
                    "updatedAt" = NOW()
              WHERE "id" = $2`,
            [Number(row.freelancerPayout ?? row.totalPrice ?? 0), Number(row.freelancerProfileId)]
          );
        }
      }

      const entityType = scopeType === "ORDER" ? "Order" : "Job";
      await createNotificationTx(
        client,
        Number(row.clientId),
        "ORDER_UPDATE",
        "Full-resolution final master is ready to download.",
        entityType,
        scopeId,
        "HIGH",
        { deliveryId, scopeType }
      );
      await createNotificationTx(
        client,
        Number(row.freelancerUserId),
        "PAYMENT",
        scopeType === "ORDER"
          ? "Final master delivered. Escrow has been released."
          : "Final master delivered. The project is now closed.",
        entityType,
        scopeId,
        "HIGH",
        { deliveryId, scopeType }
      );
      await createNotificationTx(
        client,
        Number(row.clientId),
        "REVIEW",
        "Project closed. Please leave a review for your editor.",
        entityType,
        scopeId,
        "NORMAL",
        { deliveryId, scopeType }
      );

      return updatedDelivery;
    });

    return res.status(200).json(new ApiResponse(200, mapDelivery(result as DbRow), "Final master delivered and project closed"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`deliverFinalMaster: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to deliver final master"));
  }
};

export const disputeDelivery: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const deliveryId = parsePositiveInt((req.params as Record<string, string>).deliveryId, "delivery id");
    const { delivery, scopeType, scopeId, role, row } = await loadDeliveryById(req, deliveryId);
    if (role !== "client" && role !== "freelancer" && role !== "admin") {
      return next(new ApiError(403, "Only project participants can dispute delivery"));
    }
    if (TERMINAL_DELIVERY_STATUSES.has(String(delivery.status))) {
      return next(new ApiError(400, "This delivery is already closed"));
    }

    const reason = String(((req.body || {}) as Record<string, unknown>).reason || "").trim();
    const updated = await withTransaction(async (client) => {
      const tOne = txOne(client);
      const rowUpdated = await tOne(
        `UPDATE "FinalDelivery"
            SET "status" = 'DISPUTED',
                "reviewNote" = COALESCE($2, "reviewNote"),
                "reviewedById" = $3,
                "reviewedAt" = NOW(),
                "updatedAt" = NOW()
          WHERE "id" = $1 AND "status" IN ('SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED')
          RETURNING *`,
        [deliveryId, reason || null, req.user!.id]
      );
      if (!rowUpdated) throw new ApiError(409, "Delivery status was already changed");

      if (scopeType === "ORDER") {
        await client.query(
          `UPDATE "Order"
              SET "escrowStatus" = 'DISPUTED', "updatedAt" = NOW()
            WHERE "id" = $1 AND "escrowStatus" IN ('HELD', 'RELEASE_REQUESTED') AND "deletedAt" IS NULL`,
          [scopeId]
        );
        await client.query(
          `INSERT INTO "Dispute" ("order_id", "raised_by_id", "reason", "status")
           VALUES ($1, $2, $3, 'OPEN'::"DisputeStatus")`,
          [scopeId, req.user!.id, reason || "Final delivery dispute"]
        );
      }

      const notifyUserId = Number(row.clientId) === Number(req.user!.id) ? Number(row.freelancerUserId) : Number(row.clientId);
      await createNotificationTx(
        client,
        notifyUserId,
        "DISPUTE",
        "A final delivery dispute has been opened.",
        scopeType === "ORDER" ? "Order" : "Job",
        scopeId,
        "HIGH",
        { deliveryId, scopeType, reason }
      );

      return rowUpdated;
    });

    return res.status(200).json(new ApiResponse(200, mapDelivery(updated as DbRow), "Delivery disputed"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error(`disputeDelivery: ${(e as Error).message}\n${(e as Error).stack}`);
    return next(new ApiError(500, "Failed to dispute delivery"));
  }
};
