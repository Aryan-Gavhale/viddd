// src/controllers/disputeController.js
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

/**
 * FIX C1: When a dispute is opened the order stays CURRENT (not a non-existent
 * "DISPUTED" enum). The Dispute table already tracks dispute status separately.
 */
const ORDER_STATUS_DISPUTED = "CURRENT";

const createDispute: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const raisedById = req.user.id;
    const { orderId, reason, description } = req.body as Record<string, unknown>;

    if (!orderId || !reason) {
      return next(new ApiError(400, "Order ID and reason are required"));
    }

    const oId = parseInt(String(orderId), 10);
    const order = await sqlOne(
      `SELECT o.*, fp."user_id" AS "freelancerUserId", o."orderNumber"
       FROM "Order" o
       JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
       WHERE o.id = $1 AND o."deletedAt" IS NULL`,
      [oId]
    );
    if (!order) {
      return next(new ApiError(404, "Order not found"));
    }
    if (order.client_id !== raisedById && order.freelancerUserId !== raisedById) {
      return next(new ApiError(404, "Order not found or you don’t have access"));
    }
    if (order.status === "PENDING") {
      return next(
        new ApiError(400, "Disputes can only be raised for active or completed orders")
      );
    }

    const existing = await sqlOne(
      `SELECT id FROM "Dispute" WHERE order_id = $1`,
      [oId]
    );
    if (existing) {
      return next(
        new ApiError(400, "A dispute already exists for this order")
      );
    }

    const otherPartyId =
      order.client_id === raisedById
        ? order.freelancerUserId
        : order.client_id;

    const dispute = await withTransaction(async (client) => {
      const t = txSql(client);
      const one = txOne(client);

      const d = (await one(
        `INSERT INTO "Dispute" (order_id, raised_by_id, reason, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [oId, raisedById, reason, description ?? null]
      )) as DbRow | null;
      if (!d) {
        throw new Error("Failed to create dispute");
      }

      await t(
        `INSERT INTO "Notification" ("user_id", type, content) VALUES ($1, 'DISPUTE'::"NotificationType", $2)`,
        [otherPartyId, `A dispute has been raised for order ${order.orderNumber}`]
      );
      const adminRow = (await one(
        `SELECT "id" FROM "User" WHERE "role" = 'ADMIN' LIMIT 1`,
        []
      )) as DbRow | null;
      if (adminRow != null && adminRow.id != null) {
        await t(
          `INSERT INTO "Notification" ("user_id", type, content) VALUES ($1, 'DISPUTE'::"NotificationType", $2)`,
          [adminRow.id, `New dispute #${d.id} raised for order ${order.orderNumber}`]
        );
      }

      await t(
        `UPDATE "Order" SET status = $1::"OrderStatus" WHERE id = $2`,
        [ORDER_STATUS_DISPUTED, oId]
      );

      await t(
        `INSERT INTO "OrderStatusHistory" (order_id, status, changed_by)
         VALUES ($1, $2::"OrderStatus", $3)`,
        [oId, ORDER_STATUS_DISPUTED, raisedById]
      );

      return d;
    });

    const orderMeta = await sqlOne(
      `SELECT "orderNumber" FROM "Order" WHERE id = $1`,
      [oId]
    );
    const raisedBy = await sqlOne(
      `SELECT firstname, lastname FROM "User" WHERE id = $1`,
      [raisedById]
    );
    const out = {
      ...dispute,
      orderId: dispute.order_id,
      raisedById: dispute.raised_by_id,
      order: orderMeta,
      raisedBy,
    };

    return res
      .status(201)
      .json(new ApiResponse(201, out, "Dispute created successfully"));
  } catch (error) {
    logger.error("Error creating dispute: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to create dispute"));
  }
};

const updateDisputeStatus: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { disputeId } = req.params as Record<string, string>;
    const { status, resolution } = req.body as Record<string, unknown>;
    const dId = parseInt(disputeId, 10);

    const dispute = await sqlOne(
      `SELECT d.*, o.client_id, o.freelancer_id, o."orderNumber", fp."user_id" AS "freelancerUserId"
       FROM "Dispute" d
       JOIN "Order" o ON o.id = d.order_id
       JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
       WHERE d.id = $1`,
      [dId]
    );
    if (!dispute) {
      return next(new ApiError(404, "Dispute not found"));
    }
    if (req.user.role !== "ADMIN") {
      return next(
        new ApiError(403, "Forbidden: Only admins can update dispute status")
      );
    }

    const validStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];
    const st = String(status);
    if (!status || !validStatuses.includes(st)) {
      return next(
        new ApiError(400, `Invalid status. Allowed: ${validStatuses.join(", ")}`)
      );
    }
    if ((st === "RESOLVED" || st === "CLOSED") && !resolution) {
      return next(
        new ApiError(400, "Resolution is required for RESOLVED or CLOSED status")
      );
    }

    const isFinal = st === "RESOLVED" || st === "CLOSED";
    const newResolution =
      resolution != null && resolution !== "" ? resolution : dispute.resolution;
    const newResolvedAt = isFinal ? new Date() : dispute.resolvedAt ?? dispute.resolved_at;
    const newResolvedBy = isFinal ? userId : dispute.resolved_by ?? dispute.resolvedBy;

    const updatedDispute = await withTransaction(async (client) => {
      const t = txSql(client);
      const one = txOne(client);

      const u = await one(
        `UPDATE "Dispute" SET
           status = $2::"DisputeStatus",
           resolution = $3,
           "resolvedAt" = $4,
           "resolved_by" = $5
         WHERE id = $1
         RETURNING *`,
        [dId, st, newResolution, newResolvedAt, newResolvedBy]
      );

      const partyA = dispute.raised_by_id;
      const partyB =
        dispute.client_id === dispute.raised_by_id
          ? dispute.freelancerUserId
          : dispute.client_id;

      await t(
        `INSERT INTO "Notification" ("user_id", type, content) VALUES
         ($1, 'DISPUTE'::"NotificationType", $2),
         ($3, 'DISPUTE'::"NotificationType", $4)`,
        [
          partyA,
          `Dispute #${disputeId} updated to ${st}`,
          partyB,
          `Dispute #${disputeId} updated to ${st}`,
        ]
      );

      if (st === "RESOLVED" || st === "CLOSED") {
        const orderForEscrow = await one(
          `SELECT "escrowStatus" FROM "Order" WHERE id = $1`,
          [dispute.order_id]
        );
        const escrow = orderForEscrow ? String(orderForEscrow.escrowStatus) : null;

        const resText = String(newResolution || "").toLowerCase();
        const favorClient = resText.includes("refund") || resText.includes("client");

        if (escrow === "HELD") {
          if (favorClient) {
            await t(
              `UPDATE "Order" SET status = 'REJECTED'::"OrderStatus", "escrowStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE id = $1`,
              [dispute.order_id]
            );
            await t(
              `INSERT INTO "OrderStatusHistory" (order_id, status, changed_by)
               VALUES ($1, 'REJECTED'::"OrderStatus", $2)`,
              [dispute.order_id, userId]
            );
          } else {
            await t(
              `UPDATE "Order" SET status = 'COMPLETED'::"OrderStatus", "escrowStatus" = 'RELEASED', "updatedAt" = NOW() WHERE id = $1`,
              [dispute.order_id]
            );
            await t(
              `INSERT INTO "OrderStatusHistory" (order_id, status, changed_by)
               VALUES ($1, 'COMPLETED'::"OrderStatus", $2)`,
              [dispute.order_id, userId]
            );
          }
        } else {
          await t(
            `UPDATE "Order" SET status = 'COMPLETED'::"OrderStatus", "updatedAt" = NOW() WHERE id = $1`,
            [dispute.order_id]
          );
          await t(
            `INSERT INTO "OrderStatusHistory" (order_id, status, changed_by)
             VALUES ($1, 'COMPLETED'::"OrderStatus", $2)`,
            [dispute.order_id, userId]
          );
        }
      }

      return u;
    });

    if (!updatedDispute) {
      return next(new ApiError(500, "Failed to update dispute"));
    }

    const orderMeta = await sqlOne(
      `SELECT "orderNumber" FROM "Order" WHERE id = $1`,
      [dispute.order_id]
    );
    const raisedBy = await sqlOne(
      `SELECT firstname, lastname FROM "User" WHERE id = $1`,
      [updatedDispute.raised_by_id]
    );
    const out = {
      ...updatedDispute,
      orderId: updatedDispute.order_id,
      raisedById: updatedDispute.raised_by_id,
      resolvedBy: updatedDispute.resolved_by ?? updatedDispute.resolvedBy,
      resolvedAt: updatedDispute.resolvedAt,
      order: orderMeta,
      raisedBy,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, out, "Dispute status updated successfully"));
  } catch (error) {
    logger.error("Error updating dispute status: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to update dispute status"));
  }
};

const getDispute: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { disputeId } = req.params as Record<string, string>;
    const dId = parseInt(disputeId, 10);

    const base = await sqlOne(
      `SELECT d.*, o.id AS o_id, o.client_id, o.freelancer_id, o."orderNumber", fp."user_id" AS "freelancerUserId"
       FROM "Dispute" d
       JOIN "Order" o ON o.id = d.order_id
       JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
       WHERE d.id = $1`,
      [dId]
    );
    if (!base) {
      return next(new ApiError(404, "Dispute not found"));
    }
    if (
      base.raised_by_id !== userId &&
      base.client_id !== userId &&
      base.freelancerUserId !== userId &&
      req.user.role !== "ADMIN"
    ) {
      return next(
        new ApiError(403, "Forbidden: You can only view your own disputes or as an admin")
      );
    }

    const [client, freelancerUser, raisedBy, resolver, evidence, comments] =
      await Promise.all([
        sqlOne(
          `SELECT id, firstname, lastname FROM "User" WHERE id = $1`,
          [base.client_id]
        ),
        sqlOne(
          `SELECT u.id, u.firstname, u.lastname, fp.id AS "fpId" FROM "FreelancerProfile" fp
           JOIN "User" u ON u.id = fp.user_id WHERE fp.id = $1`,
          [base.freelancer_id]
        ),
        sqlOne(
          `SELECT firstname, lastname FROM "User" WHERE id = $1`,
          [base.raised_by_id]
        ),
        base.resolved_by
          ? sqlOne(
              `SELECT firstname, lastname FROM "User" WHERE id = $1`,
              [base.resolved_by]
            )
          : null,
        sql(
          `SELECT e.*, u.firstname AS u_fn, u.lastname AS u_ln
           FROM "DisputeEvidence" e
           JOIN "User" u ON u.id = e.uploaded_by
           WHERE e.dispute_id = $1`,
          [dId]
        ),
        sql(
          `SELECT c.*, u.firstname AS u_fn, u.lastname AS u_ln
           FROM "DisputeComment" c
           JOIN "User" u ON u.id = c.user_id
           WHERE c.dispute_id = $1
           ORDER BY c."createdAt" ASC`,
          [dId]
        ),
      ]);

    const order = {
      id: base.o_id,
      orderNumber: base.orderNumber,
      client: client
        ? { firstname: client.firstname, lastname: client.lastname }
        : null,
      freelancer: freelancerUser
        ? { user: { firstname: freelancerUser.firstname, lastname: freelancerUser.lastname } }
        : null,
    };
    const dispute = {
      id: base.id,
      orderId: base.order_id,
      raisedById: base.raised_by_id,
      reason: base.reason,
      description: base.description,
      status: base.status,
      resolution: base.resolution,
      resolvedAt: base.resolvedAt ?? base.resolved_at,
      resolvedBy: base.resolved_by ?? base.resolvedBy,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      order,
      raisedBy,
      resolver,
      evidence: evidence.map((e) => ({
        id: e.id,
        disputeId: e.dispute_id,
        fileUrl: e.fileUrl,
        fileType: e.fileType,
        fileName: e.fileName,
        uploadedBy: e.uploaded_by ?? e.uploadedBy,
        uploadedAt: e.uploadedAt,
        uploader: { firstname: e.u_fn, lastname: e.u_ln },
      })),
      comments: comments.map((c) => ({
        id: c.id,
        disputeId: c.dispute_id,
        userId: c.user_id,
        content: c.content,
        createdAt: c.createdAt,
        user: { firstname: c.u_fn, lastname: c.u_ln },
      })),
    };

    return res
      .status(200)
      .json(new ApiResponse(200, dispute, "Dispute retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving dispute: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve dispute"));
  }
};

const getUserDisputes: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query as Record<string, string | string[] | undefined>;
    const pageStr = page === undefined ? "1" : Array.isArray(page) ? page[0] : page;
    const limitStr = limit === undefined ? "10" : Array.isArray(limit) ? limit[0] : limit;
    const skip = (parseInt(String(pageStr), 10) - 1) * parseInt(String(limitStr), 10);
    const lim = parseInt(String(limitStr), 10);

    const whereParts = [
      `(
         d.raised_by_id = $1
         OR o.client_id = $1
         OR fp.user_id = $1
       )`,
    ];
    const params: unknown[] = [userId];
    let p = 2;
    if (status) {
      whereParts.push(`d.status = $${p}::"DisputeStatus"`);
      params.push(Array.isArray(status) ? status[0] : status);
      p += 1;
    }
    const whereSql = whereParts.join(" AND ");

    const [disputes, total] = await Promise.all([
      sql(
        `SELECT d.*, o."orderNumber" AS onum,
         ur.firstname AS r_fn, ur.lastname AS r_ln
         FROM "Dispute" d
         JOIN "Order" o ON o.id = d.order_id
         JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
         JOIN "User" ur ON ur.id = d.raised_by_id
         WHERE ${whereSql}
         ORDER BY d."createdAt" DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, lim, skip]
      ),
      sqlCount(
        `SELECT count(*)::int AS count
         FROM "Dispute" d
         JOIN "Order" o ON o.id = d.order_id
         JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
         WHERE ${whereSql}`,
        params
      ),
    ]);

    const out = disputes.map((d) => ({
      id: d.id,
      orderId: d.order_id,
      raisedById: d.raised_by_id,
      reason: d.reason,
      description: d.description,
      status: d.status,
      createdAt: d.createdAt,
      order: { orderNumber: d.onum },
      raisedBy: { firstname: d.r_fn, lastname: d.r_ln },
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          disputes: out,
          total,
          page: parseInt(String(pageStr), 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "User disputes retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving user disputes: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve user disputes"));
  }
};

const addDisputeEvidence: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { disputeId } = req.params as Record<string, string>;
    const dId = parseInt(disputeId, 10);

    const dispute = await sqlOne(
      `SELECT d.*, o.client_id, fp."user_id" AS "freelancerUserId"
       FROM "Dispute" d
       JOIN "Order" o ON o.id = d.order_id
       JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
       WHERE d.id = $1`,
      [dId]
    );
    if (!dispute) {
      return next(new ApiError(404, "Dispute not found or you don’t have access"));
    }
    if (
      dispute.raised_by_id !== userId &&
      dispute.client_id !== userId &&
      dispute.freelancerUserId !== userId
    ) {
      return next(new ApiError(404, "Dispute not found or you don’t have access"));
    }
    if (dispute.status === "RESOLVED" || dispute.status === "CLOSED") {
      return next(
        new ApiError(400, "Cannot add evidence to a resolved or closed dispute")
      );
    }

    if (!req.fileUrls?.length) {
      return next(new ApiError(400, "Files are required"));
    }
    const evidenceData = req.fileUrls.map((url) => ({
      fileUrl: url,
      fileType: "image/png",
      fileName: url.split("/").pop(),
      uploadedBy: userId,
    }));

    const cols = ['dispute_id', '"fileUrl"', '"fileType"', '"fileName"', '"uploaded_by"'];
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let n = 1;
    for (const row of evidenceData) {
      placeholders.push(`($${n}, $${n + 1}, $${n + 2}, $${n + 3}, $${n + 4})`);
      values.push(
        dId,
        row.fileUrl,
        row.fileType,
        row.fileName,
        row.uploadedBy
      );
      n += 5;
    }
    const inserted = await sql(
      `INSERT INTO "DisputeEvidence" (${cols.join(", ")})
       VALUES ${placeholders.join(", ")}
       RETURNING id, dispute_id, "fileUrl", "fileType", "fileName", "uploaded_by", "uploadedAt"`,
      values
    );

    return res
      .status(201)
      .json(
        new ApiResponse(201, { count: inserted.length, rows: inserted }, "Evidence added to dispute successfully")
      );
  } catch (error) {
    logger.error("Error adding dispute evidence: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to add dispute evidence"));
  }
};

const addDisputeComment: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { disputeId } = req.params as Record<string, string>;
    const { content } = req.body as Record<string, unknown>;
    const dId = parseInt(disputeId, 10);

    if (!content) {
      return next(new ApiError(400, "Comment content is required"));
    }

    const dispute = await sqlOne(
      `SELECT d.*, o.client_id, fp."user_id" AS "freelancerUserId"
       FROM "Dispute" d
       JOIN "Order" o ON o.id = d.order_id
       JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
       WHERE d.id = $1`,
      [dId]
    );
    if (!dispute) {
      return next(new ApiError(404, "Dispute not found or you don’t have access"));
    }
    if (
      dispute.raised_by_id !== userId &&
      dispute.client_id !== userId &&
      dispute.freelancerUserId !== userId &&
      req.user.role !== "ADMIN"
    ) {
      return next(new ApiError(404, "Dispute not found or you don’t have access"));
    }

    const comment = (await sqlOne(
      `INSERT INTO "DisputeComment" (dispute_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [dId, userId, content]
    )) as DbRow | null;
    if (!comment) {
      return next(new ApiError(500, "Failed to add comment"));
    }
    const u = await sqlOne(
      `SELECT firstname, lastname FROM "User" WHERE id = $1`,
      [userId]
    );
    const out = {
      ...comment,
      disputeId: comment.dispute_id,
      userId: comment.user_id,
      user: u,
    };

    return res
      .status(201)
      .json(
        new ApiResponse(201, out, "Comment added to dispute successfully")
      );
  } catch (error) {
    logger.error("Error adding dispute comment: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to add dispute comment"));
  }
};

export {
  createDispute,
  updateDisputeStatus,
  getDispute,
  getUserDisputes,
  addDisputeEvidence,
  addDisputeComment,
};
