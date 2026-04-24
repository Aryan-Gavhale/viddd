// src/controllers/adminController.js
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount, withTransaction, txSql, txOne } from "../db.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { DbRow } from "../types/index.js";

type ControllerHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

const getPlatformStats: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id || req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Forbidden: Admin access required"));
    }

    const [userCount, freelancerCount, gigCount, jobCount, orderCount, txRow, disputeCount] = await Promise.all([
      sqlCount(`SELECT COUNT(*)::int AS count FROM "User"`),
      sqlCount(`SELECT COUNT(*)::int AS count FROM "FreelancerProfile"`),
      sqlCount(
        `SELECT COUNT(*)::int AS count FROM "Gig" WHERE "status" = 'ACTIVE'::"GigStatus" AND "deletedAt" IS NULL`
      ),
      sqlCount(
        `SELECT COUNT(*)::int AS count FROM "Job" WHERE "isVerified" = true AND "deletedAt" IS NULL`
      ),
      sqlCount(`SELECT COUNT(*)::int AS count FROM "Order" WHERE "deletedAt" IS NULL`),
      sqlOne(
        `SELECT COALESCE(SUM("amount"), 0) AS s, COUNT(*)::int AS c
         FROM "Transaction" WHERE "status" = 'COMPLETED'::"TransactionStatus"`
      ) as Promise<DbRow | null>,
      sqlCount(
        `SELECT COUNT(*)::int AS count FROM "Dispute" WHERE "status" IN ('OPEN'::"DisputeStatus", 'IN_REVIEW'::"DisputeStatus")`
      ),
    ]);

    const tr = txRow as DbRow | null;
    const stats = {
      totalUsers: userCount,
      totalFreelancers: freelancerCount,
      activeGigs: gigCount,
      activeJobs: jobCount,
      totalOrders: orderCount,
      totalTransactions: tr?.c ?? 0,
      totalRevenue: tr?.s ?? 0,
      activeDisputes: disputeCount,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, stats, "Platform statistics retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving platform stats: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve platform stats"));
  }
};

const moderateContent: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id || req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Forbidden: Admin access required"));
    }
    const adminId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const { entityType, entityId, action, reason } = body;

    if (!entityType || !entityId || !action) {
      return next(new ApiError(400, "Entity type, entity ID, and action are required"));
    }

    const validActions = ["APPROVE", "REJECT", "DELETE"];
    if (!validActions.includes(String(action))) {
      return next(new ApiError(400, `Invalid action. Allowed: ${validActions.join(", ")}`));
    }

    const act = String(action);
    let entity: DbRow | null = null;
    switch (String(entityType).toLowerCase()) {
      case "review": {
        const reviewId = parseInt(String(entityId), 10);
        entity = (await sqlOne(
          `SELECT * FROM "Review" WHERE "id" = $1 AND "deletedAt" IS NULL`,
          [reviewId]
        )) as DbRow | null;
        if (!entity) return next(new ApiError(404, "Review not found"));
        if (act === "APPROVE") {
          entity = (await sqlOne(
            `UPDATE "Review" SET
               "moderationStatus" = 'APPROVED'::"ModerationStatus",
               "moderatedAt" = $2,
               "moderated_by" = $3
             WHERE "id" = $1 AND "deletedAt" IS NULL
             RETURNING *`,
            [reviewId, new Date(), adminId]
          )) as DbRow | null;
        } else if (act === "REJECT") {
          entity = (await sqlOne(
            `UPDATE "Review" SET
               "moderationStatus" = 'REJECTED'::"ModerationStatus",
               "moderatedAt" = $2,
               "moderated_by" = $3
             WHERE "id" = $1 AND "deletedAt" IS NULL
             RETURNING *`,
            [reviewId, new Date(), adminId]
          )) as DbRow | null;
        } else if (act === "DELETE") {
          entity = (await sqlOne(
            `UPDATE "Review" SET "deletedAt" = $2 WHERE "id" = $1 RETURNING *`,
            [reviewId, new Date()]
          )) as DbRow | null;
        }
        break;
      }
      case "message": {
        const msgId = String(entityId);
        entity = (await sqlOne(
          `SELECT * FROM "Message" WHERE "id" = $1::text AND "deletedAt" IS NULL`,
          [msgId]
        )) as DbRow | null;
        if (!entity) return next(new ApiError(404, "Message not found"));
        if (act === "APPROVE" || act === "REJECT") {
          entity = (await sqlOne(
            `UPDATE "Message" SET
               "isFlagged" = $2,
               "flaggedReason" = COALESCE($3, "flaggedReason")
             WHERE "id" = $1::text AND "deletedAt" IS NULL
             RETURNING *`,
            [msgId, act === "REJECT", reason ?? null]
          )) as DbRow | null;
        } else if (act === "DELETE") {
          entity = (await sqlOne(
            `UPDATE "Message" SET "deletedAt" = $2 WHERE "id" = $1::text RETURNING *`,
            [msgId, new Date()]
          )) as DbRow | null;
        }
        break;
      }
      default:
        return next(new ApiError(400, "Unsupported entity type. Allowed: review, message"));
    }

    if (String(entityType).toLowerCase() === "review" && entity) {
      const e = entity as DbRow;
      const cid = e.clientId ?? e.client_id;
      if (cid != null) {
        await sql(
          `INSERT INTO "Notification" ("user_id", type, content) VALUES ($1, 'SYSTEM'::"NotificationType", $2)`,
          [cid, `Your review #${String(entityId)} has been ${String(action).toLowerCase()}${reason ? `: ${String(reason)}` : ""}`]
        );
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, entity, `${String(entityType)} moderated successfully`));
  } catch (error) {
    logger.error("Error moderating content: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to moderate content"));
  }
};

const manageUsers: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id || req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Forbidden: Admin access required"));
    }
    const adminId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const { userId, action, reason } = body;

    if (!userId || !action) {
      return next(new ApiError(400, "User ID and action are required"));
    }

    const validActions = ["BAN", "SUSPEND", "ACTIVATE", "UPDATE_ROLE"];
    if (!validActions.includes(String(action))) {
      return next(new ApiError(400, `Invalid action. Allowed: ${validActions.join(", ")}`));
    }

    const targetUser = (await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [
      parseInt(String(userId), 10),
    ])) as DbRow | null;
    if (!targetUser) {
      return next(new ApiError(404, "User not found"));
    }
    if (targetUser.role === "ADMIN" && targetUser.id !== adminId) {
      return next(new ApiError(403, "Cannot modify another admin's account"));
    }

    let updateData: { isActive?: boolean; role?: string } = {};
    switch (String(action)) {
      case "BAN":
        updateData = { isActive: false };
        break;
      case "SUSPEND":
        updateData = { isActive: false };
        break;
      case "ACTIVATE":
        updateData = { isActive: true };
        break;
      case "UPDATE_ROLE": {
        const { role } = body;
        if (!["FREELANCER", "CLIENT", "ADMIN"].includes(String(role))) {
          return next(new ApiError(400, "Invalid role. Allowed: FREELANCER, CLIENT, ADMIN"));
        }
        updateData = { role: String(role) };
        break;
      }
    }

    const updatedUser = (await sqlOne(
      `UPDATE "User" SET
         "isActive" = COALESCE($2::boolean, "isActive"),
         "role" = COALESCE($3::"Role", "role"),
         "updatedAt" = NOW()
       WHERE "id" = $1
       RETURNING "id", "firstname", "lastname", "email", "role", "isActive"`,
      [parseInt(String(userId), 10), updateData.isActive, updateData.role]
    )) as DbRow | null;

    if (String(action) === "UPDATE_ROLE" && updateData.role) {
      const u2 = (await sqlOne(
        `UPDATE "User" SET "role" = $2::"Role", "updatedAt" = NOW() WHERE "id" = $1
         RETURNING "id", "firstname", "lastname", "email", "role", "isActive"`,
        [parseInt(String(userId), 10), updateData.role]
      )) as DbRow | null;
      if (u2) {
        await sql(
          `INSERT INTO "Notification" ("user_id", type, content) VALUES ($1, 'SYSTEM'::"NotificationType", $2)`,
          [parseInt(String(userId), 10), `Your account has been ${String(action).toLowerCase()}${reason ? `: ${String(reason)}` : ""}`]
        );
        return res
          .status(200)
          .json(
            new ApiResponse(200, u2, `User ${String(action).toLowerCase()} successfully`)
          );
      }
    }

    const finalUser =
      updatedUser ||
      ((await sqlOne(
        `SELECT "id", "firstname", "lastname", "email", "role", "isActive" FROM "User" WHERE "id" = $1`,
        [parseInt(String(userId), 10)]
      )) as DbRow | null);

    await sql(
      `INSERT INTO "Notification" ("user_id", type, content) VALUES ($1, 'SYSTEM'::"NotificationType", $2)`,
      [parseInt(String(userId), 10), `Your account has been ${String(action).toLowerCase()}${reason ? `: ${String(reason)}` : ""}`]
    );

    return res
      .status(200)
      .json(new ApiResponse(200, finalUser, `User ${String(action).toLowerCase()} successfully`));
  } catch (error) {
    logger.error("Error managing user: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to manage user"));
  }
};

const resolveDisputes: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id || req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Forbidden: Admin access required"));
    }
    const adminId = req.user.id;
    const { disputeId } = req.params as Record<string, string>;
    const body = req.body as Record<string, unknown>;
    const { status, resolution } = body;
    const dId = parseInt(String(disputeId), 10);

    const dispute = (await sqlOne(
      `SELECT d.*, o."orderNumber" AS "order_orderNumber", o."client_id" AS "order_client_id",
              o."freelancer_id" AS "order_freelancer_id", o."id" AS "order_id"
       FROM "Dispute" d
       JOIN "Order" o ON o."id" = d."order_id" AND o."deletedAt" IS NULL
       WHERE d."id" = $1`,
      [dId]
    )) as DbRow | null;
    if (!dispute) {
      return next(new ApiError(404, "Dispute not found"));
    }

    const validStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];
    if (!status || !validStatuses.includes(String(status))) {
      return next(new ApiError(400, `Invalid status. Allowed: ${validStatuses.join(", ")}`));
    }
    if ((String(status) === "RESOLVED" || String(status) === "CLOSED") && !resolution) {
      return next(new ApiError(400, "Resolution is required for RESOLVED or CLOSED status"));
    }

    const st = String(status);
    const now = new Date();
    const resolvedBy =
      st === "RESOLVED" || st === "CLOSED" ? adminId : (dispute.resolvedBy as number | undefined) ?? (dispute.resolved_by as number | undefined);

    await withTransaction(async (client) => {
      const run = txSql(client);
      const one = txOne(client);

      await run(
        `UPDATE "Dispute" SET
           "status" = $1::"DisputeStatus",
           "resolution" = COALESCE($2, "resolution"),
           "resolvedAt" = CASE WHEN $1::"DisputeStatus" IN ('RESOLVED'::"DisputeStatus", 'CLOSED'::"DisputeStatus")
             THEN $3::timestamp ELSE "resolvedAt" END,
           "resolved_by" = CASE WHEN $1::"DisputeStatus" IN ('RESOLVED'::"DisputeStatus", 'CLOSED'::"DisputeStatus")
             THEN $4 ELSE "resolved_by" END,
           "updatedAt" = NOW()
         WHERE "id" = $5`,
        [st, resolution ?? null, now, resolvedBy, dId]
      );

      const ocid = dispute.order_client_id;
      const ofid = dispute.order_freelancer_id;
      const rBid = (dispute.raisedById as number | undefined) ?? (dispute.raised_by_id as number | undefined);
      const fp = (await one(`SELECT "user_id" FROM "FreelancerProfile" WHERE "id" = $1`, [ofid])) as DbRow | null;
      const freelancerUserId = fp?.user_id ?? (fp as DbRow | undefined)?.userId;
      const otherUserId = ocid === rBid ? freelancerUserId : ocid;

      await run(
        `INSERT INTO "Notification" ("user_id", type, content) VALUES
         ($1, 'DISPUTE'::"NotificationType", $3),
         ($2, 'DISPUTE'::"NotificationType", $3)`,
        [rBid, otherUserId, `Dispute #${disputeId} updated to ${st}${resolution ? `: ${String(resolution)}` : ""}`]
      );

      if (st === "RESOLVED" || st === "CLOSED") {
        await run(
          `UPDATE "Order" SET "status" = 'COMPLETED'::"OrderStatus", "updatedAt" = NOW() WHERE "id" = $1 AND "deletedAt" IS NULL`,
          [dispute.order_id]
        );
        await run(
          `INSERT INTO "OrderStatusHistory" ("order_id", "status", "changed_by")
           VALUES ($1, 'COMPLETED'::"OrderStatus", $2)`,
          [dispute.order_id, adminId]
        );
      }
    });

    const updatedDispute = (await sqlOne(
      `SELECT d.* FROM "Dispute" d WHERE d."id" = $1`,
      [dId]
    )) as DbRow | null;
    const orderNum = (await sqlOne(
      `SELECT o."orderNumber" FROM "Order" o WHERE o."id" = $1`,
      [dispute.order_id]
    )) as DbRow | null;
    const raised = (await sqlOne(
      `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
      [dispute.raisedById ?? dispute.raised_by_id]
    )) as DbRow | null;

    const payload = {
      ...updatedDispute,
      order: { orderNumber: orderNum?.orderNumber },
      raisedBy: raised ? { firstname: raised.firstname, lastname: raised.lastname } : null,
    };

    return res.status(200).json(new ApiResponse(200, payload, "Dispute resolved successfully"));
  } catch (error) {
    logger.error("Error resolving dispute: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to resolve dispute"));
  }
};

export { getPlatformStats, moderateContent, manageUsers, resolveDisputes };
