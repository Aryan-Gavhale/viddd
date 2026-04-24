// src/controllers/orderController.js
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount, withTransaction } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import logger from "../Utils/logger.js";
import { queueOrderNotification } from "../Queues/processors.js";
import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

function mapOrderRow(row: DbRow | null | undefined): DbRow | null {
  if (!row) return null;
  const { gig_id, client_id, freelancer_id, ...rest } = row as DbRow & {
    gig_id?: number;
    client_id?: number;
    freelancer_id?: number;
  };
  return {
    ...rest,
    gigId: (rest as DbRow).gigId ?? gig_id,
    clientId: (rest as DbRow).clientId ?? client_id,
    freelancerId: (rest as DbRow).freelancerId ?? freelancer_id,
  };
}

function daysLeftFromDeadline(ord: DbRow): number | null {
  const d = ord.deliveryDeadline;
  if (d == null) return null;
  return Math.max(
    0,
    Math.ceil((new Date(d as string | number | Date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
}

function mapOrderStatusHistoryRow(row: DbRow | null | undefined): DbRow | null {
  if (!row) return null;
  const { order_id, changed_by, ...rest } = row as DbRow & {
    order_id?: number;
    changed_by?: number;
  };
  return {
    ...rest,
    orderId: (rest as DbRow).orderId ?? order_id,
    changedBy: (rest as DbRow).changedBy ?? changed_by,
  };
}

async function buildOrderCreateResponse(orderId: number): Promise<DbRow | null> {
  const order = mapOrderRow(
    (await sqlOne(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [orderId]
    )) as DbRow | null
  );
  if (!order) return null;
  return loadOrderWithGigAndFreelancer(order);
}

async function loadOrderWithGigAndFreelancer(order: DbRow | null): Promise<DbRow | null> {
  if (!order) return null;
  const gig = await sqlOne(`SELECT * FROM "Gig" WHERE "id" = $1 AND "deletedAt" IS NULL`, [order.gigId as number]);
  const fp = await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "id" = $1`, [order.freelancerId as number]);
  const fUser = fp
    ? await sqlOne(
        `SELECT "id", "firstname", "lastname", "email", "profilePicture", "role" FROM "User" WHERE "id" = $1`,
        [(fp as DbRow).user_id ?? (fp as DbRow).userId]
      )
    : null;
  const statusHistory = await sql(
    `SELECT * FROM "OrderStatusHistory" WHERE "order_id" = $1 ORDER BY "changedAt" ASC`,
    [order.id as number]
  );
  return {
    ...order,
    gig,
    freelancer: fp ? { ...(fp as DbRow), user: fUser } : null,
    statusHistory: statusHistory
      .map((r) => mapOrderStatusHistoryRow(r as DbRow))
      .filter((x): x is DbRow => x != null),
  } as DbRow;
}

// Create Order
const createOrder: Handler = async (req, res, next) => {
  try {
    logger.debug("Order creation started");

    if (!req.user?.id) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const clientId = req.user.id;

    const body = req.body as Record<string, unknown>;
    const {
      gigId,
      selectedPackage,
      title,
      description,
      videoType,
      numberOfVideos,
      totalDuration,
      referenceUrl,
      aspectRatio,
      addSubtitles,
      expressDelivery,
      uploadedFiles,
      requirements,
      customDetails,
    } = body;

    if (gigId == null || selectedPackage == null || String(gigId) === "" || String(selectedPackage) === "") {
      throw new ApiError(400, "Gig ID and package are required");
    }

    const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const gigRow = await sqlOne(
      `SELECT g.*, g."freelancer_id" AS "freelancerId", fp."id" AS "fpId", fp."user_id" AS "userId"
       FROM "Gig" g
       INNER JOIN "FreelancerProfile" fp ON g."freelancer_id" = fp."id"
       WHERE g."id" = $1 AND g."deletedAt" IS NULL`,
      [parseInt(String(gigId), 10)]
    );
    if (!gigRow || (gigRow as DbRow).status !== "ACTIVE") {
      throw new ApiError(404, "Gig not found or not active");
    }
    const gr0 = gigRow as DbRow;
    const gig = {
      ...gr0,
      freelancer: { id: gr0.freelancerId as number, userId: gr0.userId },
    } as DbRow & { freelancer: { id: number; userId: unknown } };

    const gr = gigRow as DbRow;
    const pricingData = (typeof gr.pricing === "string" ? JSON.parse(String(gr.pricing)) : gr.pricing) as { name: string; price: unknown }[];
    const selectedPackageData = pricingData.find((pkg) => pkg.name === String(selectedPackage));
    if (!selectedPackageData) {
      throw new ApiError(400, "Invalid package selected");
    }

    const basePrice = Number(selectedPackageData.price);
    if (isNaN(basePrice)) {
      throw new ApiError(500, "Invalid package price format");
    }

    const totalPrice = expressDelivery ? basePrice * 1.5 : basePrice;
    const priorityFee = expressDelivery ? basePrice * 0.5 : null;
    const deliveryDeadline = new Date(Date.now() + Number(gr.deliveryTime || 7) * 24 * 60 * 60 * 1000);

    const platformFeePercent = 12.5;
    const clientFeePercent = 3.5;
    const platformFeeAmount = Math.round(totalPrice * (platformFeePercent / 100));
    const clientFeeAmount = Math.round(totalPrice * (clientFeePercent / 100));
    const freelancerPayout = totalPrice - platformFeeAmount;

    const metadata = JSON.stringify({ clientIp: req.ip });
    const uploadedJson = uploadedFiles != null ? JSON.stringify(uploadedFiles) : null;
    const customJson = customDetails != null ? JSON.stringify(customDetails) : null;
    const orderSource = req.headers["user-agent"]?.includes("Mobile") ? "MOBILE" : "WEB";
    const urgencyLevel = expressDelivery ? "EXPRESS" : "STANDARD";
    const orderPriority = expressDelivery ? 1 : 0;

    const newOrderId = await withTransaction(async (client) => {
      const ins = await client.query(
        `INSERT INTO "Order" (
          "gig_id", "client_id", "freelancer_id", "title", "description", "videoType", "numberOfVideos", "totalDuration",
          "referenceUrl", "aspectRatio", "addSubtitles", "expressDelivery", "uploadedFiles", "package", "totalPrice",
          "requirements", "isUrgent", "priorityFee", "customDetails", "orderNumber", "deliveryDeadline", "orderSource",
          "urgencyLevel", "orderPriority", "metadata", "status",
          "platformFeePercent", "platformFeeAmount", "clientFeePercent", "clientFeeAmount", "freelancerPayout"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22, $23, $24, $25::jsonb, 'PENDING'::"OrderStatus",
          $26, $27, $28, $29, $30
        ) RETURNING "id"`,
        [
          gig.id,
          clientId,
          gig.freelancerId,
          title ?? "",
          description ?? "",
          videoType ?? null,
          numberOfVideos ?? null,
          totalDuration ?? null,
          referenceUrl ?? null,
          aspectRatio ?? null,
          addSubtitles ?? false,
          expressDelivery ?? false,
          uploadedJson,
          selectedPackage,
          totalPrice,
          requirements ?? null,
          expressDelivery || false,
          priorityFee,
          customJson,
          orderNumber,
          deliveryDeadline,
          orderSource,
          urgencyLevel,
          orderPriority,
          metadata,
          platformFeePercent,
          platformFeeAmount,
          clientFeePercent,
          clientFeeAmount,
          freelancerPayout,
        ]
      );
      const oid = ins.rows[0].id;

      await client.query(
        `INSERT INTO "OrderStatusHistory" ("order_id", "status", "changed_by")
         VALUES ($1, 'PENDING'::"OrderStatus", $2)`,
        [oid, clientId]
      );

      await client.query(
        `INSERT INTO "PlatformRevenue" ("type","amount","sourceId","sourceType","description","createdAt")
         VALUES ('SERVICE_FEE',$1,$2,'Order',$3,NOW())`,
        [platformFeeAmount + clientFeeAmount, oid,
         `Order #${orderNumber}: ${platformFeePercent}% freelancer fee + ${clientFeePercent}% client fee`]
      );

      await client.query(
        `UPDATE "Gig"
         SET "orderCount" = "orderCount" + 1, "lastOrderedAt" = $1, "views" = "views" + 1, "updatedAt" = $1
         WHERE "id" = $2 AND "deletedAt" IS NULL`,
        [new Date(), gig.id]
      );

      await client.query(
        `UPDATE "FreelancerProfile"
         SET "orderCount" = "orderCount" + 1, "activeOrders" = "activeOrders" + 1, "lastActiveAt" = $1, "updatedAt" = $1
         WHERE "id" = $2`,
        [new Date(), gig.freelancerId]
      );

      return oid;
    });

    const order = await buildOrderCreateResponse(newOrderId);
    const _fr = order?.freelancer as (DbRow & { user: DbRow }) | null;
    if (!order || !_fr?.user) {
      throw new ApiError(500, "Order created but failed to load");
    }
    const freelancerUserId = (_fr.user as DbRow).id as number;

    queueOrderNotification({
      orderId: order.id as number,
      clientId,
      freelancerId: freelancerUserId,
      orderNumber,
      status: "PENDING",
    }).catch((err) => logger.error("Notification queue error: %s", (err as Error).message));

    sql(
      `INSERT INTO "Notification" ("user_id", "type", "content", "entityType", "entityId", "priority", "deliveryMethod")
       VALUES
       ($1, 'ORDER_UPDATE'::"NotificationType", $2, 'ORDER', $3, 'HIGH'::"Priority", 'IN_APP'),
       ($4, 'ORDER_UPDATE'::"NotificationType", $5, 'ORDER', $6, 'HIGH'::"Priority", 'IN_APP')`,
      [
        clientId,
        `Your order #${orderNumber} has been placed.`,
        order.id,
        freelancerUserId,
        `You have a new order #${orderNumber}.`,
        order.id,
      ]
    ).catch((err) => logger.error("Notification creation error: %s", (err as Error).message));

    logger.info(`Order created: #${order.orderNumber} by client ${clientId}`);
    return res.status(201).json(new ApiResponse(201, order, "Order created successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Error creating order for client %s: %s", req.user?.id ?? "unknown", (error as Error).message);
    return next(new ApiError(500, "Failed to create order"));
  }
};

// Update Order Status
const updateOrderStatus: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const userId = req.user.id;
    const { orderId } = req.params as Record<string, string>;
    const { status } = req.body as Record<string, unknown>;
    const st = String(status ?? "");
    const oid = parseInt(orderId, 10);

    await withTransaction(async (client) => {
      const order = mapOrderRow(
        (await client.query(
          `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId",
                  fp."user_id" AS "freelancerUserId"
           FROM "Order" o
           JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
           WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
          [oid]
        )).rows[0]
      );
      if (!order) {
        throw new ApiError(404, "Order not found");
      }

      const isClient = order.clientId === userId;
      logger.debug("updateOrderStatus: resolving role from order");
      const isFreelancer = order.freelancerUserId === userId;

      if (!isClient && !isFreelancer) {
        throw new ApiError(403, "Forbidden: You can only update your own orders");
      }

      /**
       * FIX M9: each transition must spell out *who* is allowed to perform it.
       * Previous code let either party fire any transition, which let the
       * client mark their own order COMPLETED to force escrow release, and
       * let the freelancer "REJECT" a delivered order without recourse.
       *
       *   PENDING  → CURRENT    : freelancer accepts the order
       *   PENDING  → REJECTED   : freelancer declines (escrow refunded)
       *   CURRENT  → COMPLETED  : client accepts delivery (releases escrow)
       *   CURRENT  → REJECTED   : client cancels with reason (open dispute flow)
       */
      type Allowed = { roles: ("client" | "freelancer")[] };
      const validTransitions: Record<string, Record<string, Allowed>> = {
        PENDING: {
          CURRENT: { roles: ["freelancer"] },
          REJECTED: { roles: ["freelancer"] },
        },
        CURRENT: {
          COMPLETED: { roles: ["client"] },
          REJECTED: { roles: ["client"] },
        },
        COMPLETED: {},
        REJECTED: {},
      };
      const ostat = String(order.status ?? "");
      const nextAllowed = validTransitions[ostat] ?? {};
      const rule = nextAllowed[st];
      if (!st || !rule) {
        throw new ApiError(400, `Invalid status transition from ${String(order.status)} to ${st}`);
      }
      const role: "client" | "freelancer" = isClient ? "client" : "freelancer";
      if (!rule.roles.includes(role)) {
        throw new ApiError(
          403,
          `Forbidden: ${role}s cannot transition order from ${ostat} to ${st}`
        );
      }

      const now = new Date();
      if (st === "REJECTED") {
        const bodyUpd = req.body as Record<string, unknown>;
        const cancellationReason = (bodyUpd.cancellationReason as string) || "Freelancer rejected the order.";
        await client.query(
          `UPDATE "Order" SET
            "status" = $1::"OrderStatus",
            "updatedAt" = $2, "lastNotifiedAt" = $2,
            "cancellationReason" = $3, "cancellationDate" = $2
          WHERE "id" = $4 AND "deletedAt" IS NULL`,
          [st, now, cancellationReason, oid]
        );
      } else if (st === "COMPLETED") {
        await client.query(
          `UPDATE "Order" SET
            "status" = $1::"OrderStatus",
            "updatedAt" = $2, "lastNotifiedAt" = $2, "completedAt" = $2
          WHERE "id" = $3 AND "deletedAt" IS NULL`,
          [st, now, oid]
        );
      } else {
        await client.query(
          `UPDATE "Order" SET "status" = $1::"OrderStatus", "updatedAt" = $2, "lastNotifiedAt" = $2
          WHERE "id" = $3 AND "deletedAt" IS NULL`,
          [st, now, oid]
        );
      }

      await client.query(
        `INSERT INTO "OrderStatusHistory" ("order_id", "status", "changed_by")
         VALUES ($1, $2::"OrderStatus", $3)`,
        [oid, st, userId]
      );

      const notifyUserId = isClient ? order.freelancerUserId : order.clientId;
      await client.query(
        `INSERT INTO "Notification" ("user_id", "type", "content", "entityType", "entityId", "priority", "deliveryMethod")
         VALUES ($1, 'ORDER_UPDATE'::"NotificationType", $2, 'ORDER', $3, 'HIGH'::"Priority", 'IN_APP')`,
        [notifyUserId, `Order #${order.orderNumber} status updated to ${st}.`, oid]
      );
    });

    const orow = mapOrderRow(
      await sqlOne(
        `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
         FROM "Order" o WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
        [oid]
      )
    );
    const updatedOrder = await loadOrderWithGigAndFreelancer(orow);
    const uo = updatedOrder as DbRow & { freelancer?: { user?: { id: number } } };
    if (!uo?.freelancer?.user) {
      throw new ApiError(500, "Order updated but failed to load");
    }

    await queueOrderNotification({
      orderId: uo.id as number,
      clientId: uo.clientId as number,
      freelancerId: uo.freelancer!.user!.id as number,
      orderNumber: String(uo.orderNumber),
      status: st,
    });

    logger.info(`Order #${String(uo.orderNumber)} status updated to ${st} by user ${userId}`);
    return res.status(200).json(new ApiResponse(200, uo, "Order status updated successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error(`Error updating order status for order ${(req.params as Record<string, string>).orderId}: ${(error as Error).message}`);
    return next(new ApiError(500, "Failed to update order status"));
  }
};

// Get Order
const getOrder: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const userId = req.user.id;
    const { orderId } = req.params as Record<string, string>;
    const oid = parseInt(orderId, 10);

    if (!orderId || isNaN(oid)) {
      throw new ApiError(400, "Valid orderId is required");
    }

    const order = mapOrderRow(
      (await sqlOne(
        `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId",
                fp."user_id" AS "freelancerUserId"
         FROM "Order" o
         JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
         WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
        [oid]
      )) as DbRow | null
    );
    if (!order) {
      throw new ApiError(404, "Order not found");
    }
    if (order.clientId !== userId && order.freelancerUserId !== userId) {
      throw new ApiError(403, "Forbidden: You can only view your own orders");
    }

    const gig = await sqlOne(`SELECT * FROM "Gig" WHERE "id" = $1 AND "deletedAt" IS NULL`, [order.gigId]);
    const client = await sqlOne(
      `SELECT "firstname", "lastname", "email" FROM "User" WHERE "id" = $1`,
      [order.clientId]
    );
    const fp = (await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "id" = $1`, [order.freelancerId])) as DbRow | null;
    if (!fp) {
      throw new ApiError(500, "Order data incomplete");
    }
    const fUser = await sqlOne(
      `SELECT "firstname", "lastname", "email" FROM "User" WHERE "id" = $1`,
      [fp.user_id ?? fp.userId]
    );
    const review = await sqlOne(`SELECT * FROM "Review" WHERE "order_id" = $1`, [oid]);
    const dispute = await sqlOne(`SELECT * FROM "Dispute" WHERE "order_id" = $1`, [oid]);
    const mrows = await sql(
      `SELECT * FROM "Message" WHERE "orderId" = $1 ORDER BY "timestamp" DESC LIMIT 50`,
      [oid]
    );
    const senderIds = [...new Set(mrows.map((m) => m.senderId))];
    let senders: DbRow[] = [];
    if (senderIds.length) {
      senders = (await sql(
        `SELECT "id", "firstname", "lastname", "profilePicture", "role" FROM "User" WHERE "id" = ANY($1::int[])`,
        [senderIds]
      )) as DbRow[];
    }
    const sMap = new Map(senders.map((s) => [s.id, s] as [unknown, DbRow]));
    const messages = mrows.map((m) => {
      const mr = m as DbRow;
      return { ...mr, sender: sMap.get(mr.senderId) || null };
    });
    messages.reverse();
    const msgCountRow = await sqlOne(`SELECT COUNT(*)::int as count FROM "Message" WHERE "orderId" = $1`, [oid]);
    const totalMessages = (msgCountRow?.count as number) || messages.length;
    const statusRows = await sql(
      `SELECT * FROM "OrderStatusHistory" WHERE "order_id" = $1 ORDER BY "changedAt" DESC LIMIT 50`,
      [oid]
    );
    const statusHistory = statusRows
      .map((r) => mapOrderStatusHistoryRow(r as DbRow))
      .filter((x): x is DbRow => x != null);
    statusHistory.reverse();

    const orderFull = {
      ...order,
      gig,
      client,
      freelancer: { ...fp, user: fUser },
      review: review || null,
      messages,
      totalMessages,
      dispute: dispute || null,
      statusHistory,
    };

    const orderWithDaysLeft = {
      ...orderFull,
      daysLeft: daysLeftFromDeadline(order as DbRow),
    };

    logger.info(`Order #${String((order as DbRow).orderNumber)} retrieved by user ${userId}`);
    return res.status(200).json(new ApiResponse(200, orderWithDaysLeft, "Order retrieved successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error(`Error retrieving order ${(req.params as Record<string, string>).orderId}: ${(error as Error).message}`);
    return next(new ApiError(500, "Failed to retrieve order"));
  }
};

// Get Client Orders
const getClientOrders: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const clientId = req.user.id;
    const qco = req.query as Record<string, string | string[] | undefined>;
    const page = String((Array.isArray(qco.page) ? qco.page[0] : qco.page) ?? "1");
    const limit = String((Array.isArray(qco.limit) ? qco.limit[0] : qco.limit) ?? "10");
    const status = Array.isArray(qco.status) ? qco.status[0] : qco.status;
    const take = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * take;

    const [orders, total] = await (async () => {
      if (status) {
        return Promise.all([
          sql(
            `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
             FROM "Order" o
             WHERE o."client_id" = $1 AND o."deletedAt" IS NULL AND o."status" = $2::"OrderStatus"
             ORDER BY o."createdAt" DESC
             LIMIT $3 OFFSET $4`,
            [clientId, status, take, offset]
          ),
          sqlCount(
            `SELECT COUNT(*)::int AS count FROM "Order" o
             WHERE o."client_id" = $1 AND o."deletedAt" IS NULL AND o."status" = $2::"OrderStatus"`,
            [clientId, status]
          ),
        ]);
      }
      return Promise.all([
        sql(
          `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
           FROM "Order" o
           WHERE o."client_id" = $1 AND o."deletedAt" IS NULL
           ORDER BY o."createdAt" DESC
           LIMIT $2 OFFSET $3`,
          [clientId, take, offset]
        ),
        sqlCount(
          `SELECT COUNT(*)::int AS count FROM "Order" o WHERE o."client_id" = $1 AND o."deletedAt" IS NULL`,
          [clientId]
        ),
      ]);
    })();

    const mapped = orders.map((row) => mapOrderRow(row as DbRow) as DbRow);
    const gigIds = [...new Set(mapped.map(o => o.gigId as number).filter(Boolean))];
    const fpIds = [...new Set(mapped.map(o => o.freelancerId as number).filter(Boolean))];

    const [allGigs, allFps] = await Promise.all([
      gigIds.length > 0
        ? sql(`SELECT * FROM "Gig" WHERE "id" = ANY($1::int[]) AND "deletedAt" IS NULL`, [gigIds])
        : Promise.resolve([]),
      fpIds.length > 0
        ? sql(
            `SELECT fp.*, u."firstname", u."lastname"
             FROM "FreelancerProfile" fp
             JOIN "User" u ON u.id = fp."user_id"
             WHERE fp."id" = ANY($1::int[])`,
            [fpIds]
          )
        : Promise.resolve([]),
    ]);

    const gigMap = new Map<number, Record<string, unknown>>();
    for (const g of allGigs) gigMap.set(g.id as number, g);
    const fpMap = new Map<number, Record<string, unknown>>();
    for (const f of allFps) fpMap.set(f.id as number, f);

    const withIncludes = mapped.map(o => {
      const gig = gigMap.get(o.gigId as number) || null;
      const fpR = fpMap.get(o.freelancerId as number) || null;
      if (!fpR) return { ...o, gig, freelancer: null as DbRow | null };
      return { ...o, gig, freelancer: { ...fpR, user: { firstname: fpR.firstname, lastname: fpR.lastname } } };
    });

    const ordersWithDaysLeft = withIncludes.map((order) => ({
      ...order,
      daysLeft: daysLeftFromDeadline(order as DbRow),
    }));

    logger.info(`Retrieved ${ordersWithDaysLeft.length} client orders for user ${clientId}`);
    return res.status(200).json(
      new ApiResponse(200, {
        orders: ordersWithDaysLeft,
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take) || 0,
      }, "Client orders retrieved successfully")
    );
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error(`Error retrieving client orders for user ${req.user?.id}: ${(error as Error).message}`);
    return next(new ApiError(500, "Failed to retrieve client orders"));
  }
};

// Get Freelancer Orders
const getFreelancerOrders: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const userId = req.user.id;
    const qfo = req.query as Record<string, string | string[] | undefined>;
    const page = String((Array.isArray(qfo.page) ? qfo.page[0] : qfo.page) ?? "1");
    const limit = String((Array.isArray(qfo.limit) ? qfo.limit[0] : qfo.limit) ?? "10");
    const status = Array.isArray(qfo.status) ? qfo.status[0] : qfo.status;
    const take = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * take;

    const fp = (await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!fp) {
      throw new ApiError(404, "Freelancer profile not found");
    }
    const freelancerId = fp.id as number;

    const [orders, total] = await (async () => {
      if (status) {
        return Promise.all([
          sql(
            `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
             FROM "Order" o
             WHERE o."freelancer_id" = $1 AND o."deletedAt" IS NULL AND o."status" = $2::"OrderStatus"
             ORDER BY o."createdAt" DESC
             LIMIT $3 OFFSET $4`,
            [freelancerId, status, take, offset]
          ),
          sqlCount(
            `SELECT COUNT(*)::int AS count FROM "Order" o
             WHERE o."freelancer_id" = $1 AND o."deletedAt" IS NULL AND o."status" = $2::"OrderStatus"`,
            [freelancerId, status]
          ),
        ]);
      }
      return Promise.all([
        sql(
          `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
           FROM "Order" o
           WHERE o."freelancer_id" = $1 AND o."deletedAt" IS NULL
           ORDER BY o."createdAt" DESC
           LIMIT $2 OFFSET $3`,
          [freelancerId, take, offset]
        ),
        sqlCount(
          `SELECT COUNT(*)::int AS count FROM "Order" o WHERE o."freelancer_id" = $1 AND o."deletedAt" IS NULL`,
          [freelancerId]
        ),
      ]);
    })();

    const mappedFo = orders.map((row) => mapOrderRow(row as DbRow) as DbRow);
    const foGigIds = [...new Set(mappedFo.map(o => o.gigId as number).filter(Boolean))];
    const foClientIds = [...new Set(mappedFo.map(o => o.clientId as number).filter(Boolean))];

    const [foGigs, foClients] = await Promise.all([
      foGigIds.length > 0
        ? sql(`SELECT * FROM "Gig" WHERE "id" = ANY($1::int[]) AND "deletedAt" IS NULL`, [foGigIds])
        : Promise.resolve([]),
      foClientIds.length > 0
        ? sql(`SELECT "id", "firstname", "lastname" FROM "User" WHERE "id" = ANY($1::int[])`, [foClientIds])
        : Promise.resolve([]),
    ]);

    const foGigMap = new Map<number, Record<string, unknown>>();
    for (const g of foGigs) foGigMap.set(g.id as number, g);
    const foClientMap = new Map<number, Record<string, unknown>>();
    for (const c of foClients) foClientMap.set(c.id as number, c);

    const withIncludes = mappedFo.map(o => ({
      ...o,
      gig: foGigMap.get(o.gigId as number) || null,
      client: foClientMap.get(o.clientId as number) || null,
    }));

    const ordersWithDaysLeft = withIncludes.map((order) => ({
      ...order,
      daysLeft: daysLeftFromDeadline(order as DbRow),
    }));

    logger.info(`Retrieved ${ordersWithDaysLeft.length} freelancer orders for freelancer ${freelancerId}`);
    return res.status(200).json(
      new ApiResponse(200, {
        orders: ordersWithDaysLeft,
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take) || 0,
      }, "Freelancer orders retrieved successfully")
    );
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error(`Error retrieving freelancer orders for user ${req.user?.id}: ${(error as Error).message}`);
    return next(new ApiError(500, "Failed to retrieve freelancer orders"));
  }
};

// Cancel Order
const cancelOrder: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const userId = req.user.id;
    const { orderId } = req.params as Record<string, string>;
    const { cancellationReason } = req.body as Record<string, unknown>;
    const oid = parseInt(orderId, 10);

    const updatedOrder = await withTransaction(async (client) => {
      const order = mapOrderRow(
        (await client.query(
          `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId",
                  fp."user_id" AS "freelancerUserId"
           FROM "Order" o
           JOIN "FreelancerProfile" fp ON o."freelancer_id" = fp."id"
           WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
          [oid]
        )).rows[0]
      );
      if (!order) {
        throw new ApiError(404, "Order not found");
      }
      if (order.clientId !== userId && order.freelancerUserId !== userId) {
        throw new ApiError(403, "Forbidden: You can only cancel your own orders");
      }
      if (!["PENDING", "CURRENT"].includes(String(order.status))) {
        throw new ApiError(400, "Order cannot be cancelled in its current status");
      }

      const now = new Date();
      await client.query(
        `UPDATE "Order" SET
          "status" = 'REJECTED'::"OrderStatus",
          "updatedAt" = $1, "lastNotifiedAt" = $1,
          "cancellationReason" = $2, "cancellationDate" = $1
        WHERE "id" = $3 AND "deletedAt" IS NULL`,
        [now, (cancellationReason as string) || "Not specified", oid]
      );

      await client.query(
        `INSERT INTO "OrderStatusHistory" ("order_id", "status", "changed_by")
         VALUES ($1, 'REJECTED'::"OrderStatus", $2)`,
        [oid, userId]
      );

      await client.query(
        `UPDATE "FreelancerProfile"
         SET "activeOrders" = GREATEST("activeOrders" - 1, 0), "updatedAt" = $1
         WHERE "id" = $2`,
        [now, order.freelancerId]
      );

      const notifyUserId = order.clientId === userId ? order.freelancerUserId : order.clientId;
      await client.query(
        `INSERT INTO "Notification" ("user_id", "type", "content", "entityType", "entityId", "priority", "deliveryMethod")
         VALUES ($1, 'ORDER_UPDATE'::"NotificationType", $2, 'ORDER', $3, 'HIGH'::"Priority", 'IN_APP')`,
        [notifyUserId, `Order #${order.orderNumber} has been cancelled.`, oid]
      );

      const sh = await client.query(
        `SELECT * FROM "OrderStatusHistory" WHERE "order_id" = $1 ORDER BY "changedAt" ASC`,
        [oid]
      );
      return {
        order,
        statusHistory: sh.rows
          .map((r) => mapOrderStatusHistoryRow(r as DbRow))
          .filter((x): x is DbRow => x != null),
      };
    });

    const orow = mapOrderRow(
      await sqlOne(
        `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
         FROM "Order" o WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
        [oid]
      )
    );
    if (!orow) {
      return next(new ApiError(500, "Failed to load cancelled order"));
    }
    const withHist = { ...orow, statusHistory: updatedOrder.statusHistory };
    const fp2 = (await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "id" = $1`,
      [orow.freelancerId as number]
    )) as DbRow | null;
    if (!fp2) {
      return next(new ApiError(500, "Failed to load freelancer for cancelled order"));
    }
    const fUser2 = (await sqlOne(
      `SELECT "id", "firstname", "lastname", "email", "profilePicture", "role" FROM "User" WHERE "id" = $1`,
      [fp2.user_id ?? fp2.userId]
    )) as DbRow | null;
    if (!fUser2) {
      return next(new ApiError(500, "Failed to load user for cancelled order"));
    }

    const fullCancel = { ...withHist, freelancer: { ...fp2, user: fUser2 } } as DbRow;

    await queueOrderNotification({
      orderId: fullCancel.id as number,
      clientId: fullCancel.clientId as number,
      freelancerId: fUser2.id as number,
      orderNumber: String(fullCancel.orderNumber),
      status: "REJECTED",
    });

    logger.info(`Order #${fullCancel.orderNumber} cancelled by user ${userId}`);
    return res.status(200).json(new ApiResponse(200, fullCancel, "Order cancelled successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error(`Error cancelling order ${(req.params as Record<string, string>).orderId}: ${(error as Error).message}`);
    return next(new ApiError(500, "Failed to cancel order"));
  }
};

// Get Current Orders
const getCurrentOrders: Handler = async (req, res, next) => {
  try {
    logger.debug("getCurrentOrders: starting");

    if (!req.user || !req.user.id) {
      logger.debug("getCurrentOrders: no user or user.id");
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const userId = req.user.id;
    logger.debug("getCurrentOrders: querying freelancer profile");

    const freelancer = await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    );
    if (!freelancer) {
      logger.debug("getCurrentOrders: no freelancer profile, returning empty array");
      return res.status(200).json(new ApiResponse(200, [], "No freelancer profile found, no current orders"));
    }

    logger.debug("getCurrentOrders: querying orders");
    const orders = await sql(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."freelancer_id" = $1 AND o."deletedAt" IS NULL AND o."status" = 'CURRENT'::"OrderStatus"
       ORDER BY o."orderPriority" DESC, o."createdAt" DESC
       LIMIT 100`,
      [freelancer.id]
    );
    logger.debug("getCurrentOrders: orders found");

    const mappedOrders = orders.map((row) => mapOrderRow(row as DbRow) as DbRow);
    const gigIds = [...new Set(mappedOrders.map((o) => o.gigId as number).filter(Boolean))];
    const clientIds = [...new Set(mappedOrders.map((o) => o.clientId as number).filter(Boolean))];

    const [allGigs, allClients] = await Promise.all([
      gigIds.length > 0
        ? sql(`SELECT * FROM "Gig" WHERE "id" = ANY($1::int[]) AND "deletedAt" IS NULL`, [gigIds])
        : Promise.resolve([]),
      clientIds.length > 0
        ? sql(`SELECT "id", "firstname", "lastname" FROM "User" WHERE "id" = ANY($1::int[])`, [clientIds])
        : Promise.resolve([]),
    ]);
    const gigMap = new Map<number, Record<string, unknown>>();
    for (const g of allGigs) gigMap.set(g.id as number, g);
    const clientMap = new Map<number, Record<string, unknown>>();
    for (const c of allClients) clientMap.set(c.id as number, c);

    const withIncludes = mappedOrders.map((o) => ({
      ...o,
      gig: gigMap.get(o.gigId as number) || null,
      client: clientMap.get(o.clientId as number) || null,
    }));

    const ordersWithDaysLeft = withIncludes.map((order) => ({
      ...order,
      daysLeft: daysLeftFromDeadline(order as DbRow),
    }));

    logger.debug("getCurrentOrders: returning success response");
    logger.info(`Retrieved ${ordersWithDaysLeft.length} current orders for freelancer ${freelancer.id}`);
    return res.status(200).json(new ApiResponse(200, ordersWithDaysLeft, "Current orders retrieved successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Error retrieving current orders for user %s: %s", req.user?.id ?? "unknown", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve current orders"));
  }
};

// Get Pending Orders
const getPendingOrders: Handler = async (req, res, next) => {
  try {
    logger.debug("getPendingOrders: starting");

    if (!req.user || !req.user.id) {
      logger.debug("getPendingOrders: no user or user.id");
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const userId = req.user.id;
    logger.debug("getPendingOrders: querying freelancer profile");

    const freelancer = await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    );
    if (!freelancer) {
      logger.debug("getPendingOrders: no freelancer profile, returning empty array");
      return res.status(200).json(new ApiResponse(200, [], "No freelancer profile found, no pending orders"));
    }

    logger.debug("getPendingOrders: querying orders");
    const orders = await sql(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."freelancer_id" = $1 AND o."deletedAt" IS NULL AND o."status" = 'PENDING'::"OrderStatus"
       ORDER BY o."orderPriority" DESC, o."createdAt" DESC
       LIMIT 100`,
      [freelancer.id]
    );
    logger.debug("getPendingOrders: orders found");

    const mappedOrders = orders.map((row) => mapOrderRow(row as DbRow) as DbRow);
    const gigIds = [...new Set(mappedOrders.map((o) => o.gigId as number).filter(Boolean))];
    const clientIds = [...new Set(mappedOrders.map((o) => o.clientId as number).filter(Boolean))];

    const [allGigs, allClients] = await Promise.all([
      gigIds.length > 0
        ? sql(`SELECT * FROM "Gig" WHERE "id" = ANY($1::int[]) AND "deletedAt" IS NULL`, [gigIds])
        : Promise.resolve([]),
      clientIds.length > 0
        ? sql(`SELECT "id", "firstname", "lastname" FROM "User" WHERE "id" = ANY($1::int[])`, [clientIds])
        : Promise.resolve([]),
    ]);
    const gigMap = new Map<number, Record<string, unknown>>();
    for (const g of allGigs) gigMap.set(g.id as number, g);
    const clientMap = new Map<number, Record<string, unknown>>();
    for (const c of allClients) clientMap.set(c.id as number, c);

    const withIncludes = mappedOrders.map((o) => ({
      ...o,
      gig: gigMap.get(o.gigId as number) || null,
      client: clientMap.get(o.clientId as number) || null,
    }));

    const ordersWithDaysLeft = withIncludes.map((order) => ({
      ...order,
      daysLeft: daysLeftFromDeadline(order as DbRow),
    }));

    logger.debug("getPendingOrders: returning success response");
    logger.info(`Retrieved ${ordersWithDaysLeft.length} pending orders for freelancer ${freelancer.id}`);
    return res.status(200).json(new ApiResponse(200, ordersWithDaysLeft, "Pending orders retrieved successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Error retrieving pending orders for user %s: %s", req.user?.id ?? "unknown", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve pending orders"));
  }
};

// Get Completed Orders
const getCompletedOrders: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const userId = req.user.id;

    const freelancer = await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    );
    if (!freelancer) {
      return res.status(200).json(new ApiResponse(200, [], "No freelancer profile found, no completed orders"));
    }

    const orders = await sql(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."freelancer_id" = $1 AND o."deletedAt" IS NULL AND o."status" = 'COMPLETED'::"OrderStatus"
       ORDER BY o."completedAt" DESC
       LIMIT 100`,
      [freelancer.id]
    );

    const mappedOrders = orders.map((row) => mapOrderRow(row as DbRow) as DbRow);
    const gigIds = [...new Set(mappedOrders.map((o) => o.gigId as number).filter(Boolean))];
    const clientIds = [...new Set(mappedOrders.map((o) => o.clientId as number).filter(Boolean))];

    const [allGigs, allClients] = await Promise.all([
      gigIds.length > 0
        ? sql(`SELECT * FROM "Gig" WHERE "id" = ANY($1::int[]) AND "deletedAt" IS NULL`, [gigIds])
        : Promise.resolve([]),
      clientIds.length > 0
        ? sql(`SELECT "id", "firstname", "lastname" FROM "User" WHERE "id" = ANY($1::int[])`, [clientIds])
        : Promise.resolve([]),
    ]);
    const gigMap = new Map<number, Record<string, unknown>>();
    for (const g of allGigs) gigMap.set(g.id as number, g);
    const clientMap = new Map<number, Record<string, unknown>>();
    for (const c of allClients) clientMap.set(c.id as number, c);

    const withIncludes = mappedOrders.map((o) => ({
      ...o,
      gig: gigMap.get(o.gigId as number) || null,
      client: clientMap.get(o.clientId as number) || null,
    }));

    const ordersWithDaysLeft = withIncludes.map((order) => ({
      ...order,
      daysLeft: daysLeftFromDeadline(order as DbRow),
    }));

    logger.info(`Retrieved ${ordersWithDaysLeft.length} completed orders for freelancer ${freelancer.id}`);
    return res.status(200).json(new ApiResponse(200, ordersWithDaysLeft, "Completed orders retrieved successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error(`Error retrieving completed orders for user ${req.user?.id}: ${(error as Error).message}`);
    return next(new ApiError(500, "Failed to retrieve completed orders"));
  }
};

// Get Rejected Orders
const getRejectedOrders: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, "Unauthorized: User not authenticated");
    }
    const userId = req.user.id;

    const freelancer = await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    );
    if (!freelancer) {
      return res.status(200).json(new ApiResponse(200, [], "No freelancer profile found, no rejected orders"));
    }

    const orders = await sql(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."freelancer_id" = $1 AND o."deletedAt" IS NULL AND o."status" = 'REJECTED'::"OrderStatus"
       ORDER BY o."updatedAt" DESC
       LIMIT 100`,
      [freelancer.id]
    );

    const mappedOrders = orders.map((row) => mapOrderRow(row as DbRow) as DbRow);
    const gigIds = [...new Set(mappedOrders.map((o) => o.gigId as number).filter(Boolean))];
    const clientIds = [...new Set(mappedOrders.map((o) => o.clientId as number).filter(Boolean))];

    const [allGigs, allClients] = await Promise.all([
      gigIds.length > 0
        ? sql(`SELECT * FROM "Gig" WHERE "id" = ANY($1::int[]) AND "deletedAt" IS NULL`, [gigIds])
        : Promise.resolve([]),
      clientIds.length > 0
        ? sql(`SELECT "id", "firstname", "lastname" FROM "User" WHERE "id" = ANY($1::int[])`, [clientIds])
        : Promise.resolve([]),
    ]);
    const gigMap = new Map<number, Record<string, unknown>>();
    for (const g of allGigs) gigMap.set(g.id as number, g);
    const clientMap = new Map<number, Record<string, unknown>>();
    for (const c of allClients) clientMap.set(c.id as number, c);

    const withIncludes = mappedOrders.map((o) => ({
      ...o,
      gig: gigMap.get(o.gigId as number) || null,
      client: clientMap.get(o.clientId as number) || null,
    }));

    const ordersWithDaysLeft = withIncludes.map((order) => ({
      ...order,
      daysLeft: daysLeftFromDeadline(order as DbRow),
    }));

    logger.info(`Retrieved ${ordersWithDaysLeft.length} rejected orders for freelancer ${freelancer.id}`);
    return res.status(200).json(new ApiResponse(200, ordersWithDaysLeft, "Rejected orders retrieved successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error(`Error retrieving rejected orders for user ${req.user?.id}: ${(error as Error).message}`);
    return next(new ApiError(500, "Failed to retrieve rejected orders"));
  }
};

// Get Freelancer Active Orders for Workspace
const getFreelancerActiveOrders: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const freelancerUser = req.user.id;

    const freelancerProfile = await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [freelancerUser]
    );
    if (!freelancerProfile) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    const activeOrderRows = await sql(
      `SELECT o.*, o."gig_id" AS "gigId", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId"
       FROM "Order" o
       WHERE o."freelancer_id" = $1
         AND o."deletedAt" IS NULL
         AND o."status"::text IN ('CURRENT', 'COMPLETED')
       ORDER BY o."createdAt" DESC
       LIMIT 50`,
      [freelancerProfile.id]
    );

    const mapped = activeOrderRows.map((row) => mapOrderRow(row as DbRow) as DbRow);
    const orderIds = mapped.map((o) => o.id as number);
    const gigIds = [...new Set(mapped.map((o) => o.gigId as number).filter(Boolean))];
    const clientIds = [...new Set(mapped.map((o) => o.clientId as number).filter(Boolean))];

    const [allGigs, allClients, allMessages, allHistory] = await Promise.all([
      gigIds.length > 0
        ? sql(`SELECT * FROM "Gig" WHERE "id" = ANY($1::int[]) AND "deletedAt" IS NULL`, [gigIds])
        : Promise.resolve([]),
      clientIds.length > 0
        ? sql(
            `SELECT "id", "firstname", "lastname", "email", "profilePicture" FROM "User" WHERE "id" = ANY($1::int[])`,
            [clientIds]
          )
        : Promise.resolve([]),
      orderIds.length > 0
        ? sql(
            `SELECT * FROM (
               SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m."orderId" ORDER BY m."timestamp" DESC) AS rn
               FROM "Message" m
               WHERE m."orderId" = ANY($1::int[])
             ) sub
             WHERE rn <= 20
             ORDER BY "orderId", "timestamp" ASC`,
            [orderIds]
          )
        : Promise.resolve([]),
      orderIds.length > 0
        ? sql(
            `SELECT * FROM "OrderStatusHistory" WHERE "order_id" = ANY($1::int[]) ORDER BY "changedAt" DESC`,
            [orderIds]
          )
        : Promise.resolve([]),
    ]);

    const gigMap = new Map<number, Record<string, unknown>>();
    for (const g of allGigs) gigMap.set(g.id as number, g);
    const clientMap = new Map<number, Record<string, unknown>>();
    for (const c of allClients) clientMap.set(c.id as number, c);

    const msgsByOrder = new Map<number, Record<string, unknown>[]>();
    for (const m of allMessages) {
      const oid = m.orderId as number;
      if (!msgsByOrder.has(oid)) msgsByOrder.set(oid, []);
      msgsByOrder.get(oid)!.push(m);
    }

    const senderIds = [...new Set(allMessages.map((m) => m.senderId as number).filter(Boolean))];
    const senderRows =
      senderIds.length > 0
        ? await sql(
            `SELECT "id", "firstname", "lastname", "profilePicture", "role" FROM "User" WHERE "id" = ANY($1::int[])`,
            [senderIds]
          )
        : [];
    const senderMap = new Map<number, Record<string, unknown>>();
    for (const s of senderRows) senderMap.set(s.id as number, s);

    const histByOrder = new Map<number, Record<string, unknown>[]>();
    for (const h of allHistory) {
      const oid = h.order_id as number;
      if (!histByOrder.has(oid)) histByOrder.set(oid, []);
      histByOrder.get(oid)!.push(h);
    }

    const activeOrders = mapped.map((order) => {
      const msgs = (msgsByOrder.get(order.id as number) || []).map((m) => {
        const { rn, ...messageRest } = m as Record<string, unknown> & { rn?: number; senderId: number };
        return {
          ...messageRest,
          sender: senderMap.get(m.senderId as number) || null,
        };
      });
      const statusHistory = (histByOrder.get(order.id as number) || [])
        .map((r) => mapOrderStatusHistoryRow(r as DbRow))
        .filter((x): x is DbRow => x != null);
      return {
        ...order,
        gig: gigMap.get(order.gigId as number) || null,
        client: clientMap.get(order.clientId as number) || null,
        messages: msgs,
        statusHistory,
      } as DbRow;
    });

    const workspaceProjects = activeOrders.map((ord) => {
      const order = ord as DbRow;
      return {
        id: order.id,
        title: order.title || `Order #${String(order.orderNumber)}`,
        name: order.title || `Order #${String(order.orderNumber)}`,
        status: order.status,
        progress: calculateOrderProgress(order),
        client: (order as DbRow & { client: unknown }).client,
        freelancerId: order.freelancerId,
        messages: (order as DbRow & { messages: unknown[] }).messages,
        notes: (order.requirements as string) || "",
        timeline: generateOrderTimeline(order),
        tasks: generateOrderTasks(order),
        drafts: [],
        revenue: order.totalPrice,
        responseTime: (order.responseTime as number) || 24,
        completionRate: (order.completionRate as number) || 95,
        createdAt: order.createdAt,
        deliveryDeadline: order.deliveryDeadline,
        orderNumber: order.orderNumber,
        gigId: order.gigId,
        gig: (order as DbRow & { gig: unknown }).gig,
      };
    });

    return res.status(200).json(
      new ApiResponse(200, workspaceProjects, "Freelancer active orders retrieved successfully")
    );
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Error retrieving freelancer active orders: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve active orders"));
  }
};

const calculateOrderProgress = (order: DbRow) => {
  const statusProgress: Record<string, number> = {
    PENDING: 0,
    CURRENT: 50,
    COMPLETED: 100,
    REJECTED: 0,
  };
  return statusProgress[String(order.status)] || 0;
};

const generateOrderTimeline = (order: DbRow) => {
  const timeline: { id: string; title: string; date: unknown; status: string }[] = [];
  timeline.push({
    id: `timeline-${String(order.id)}-created`,
    title: "Order Created",
    date: order.createdAt,
    status: "completed",
  });
  (order.statusHistory as DbRow[] | undefined)?.forEach((history, index) => {
    timeline.push({
      id: `timeline-${String(order.id)}-${index}`,
      title: `Status: ${String(history.status)}`,
      date: history.changedAt,
      status: history.status === "COMPLETED" ? "completed" : history.status === "CURRENT" ? "in-progress" : "pending",
    });
  });
  if (order.deliveryDeadline) {
    timeline.push({
      id: `timeline-${String(order.id)}-deadline`,
      title: "Delivery Deadline",
      date: order.deliveryDeadline,
      status: new Date() > new Date(order.deliveryDeadline as string) ? "completed" : "pending",
    });
  }
  return timeline.sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
};

const generateOrderTasks = (order: DbRow) => {
  const tasks: { id: string; name: string; status: string; hours: number; cost: number; dueDate: string }[] = [];
  tasks.push({
    id: `task-${order.id}-review`,
    name: "Review Order Requirements",
    status: order.status === "PENDING" ? "Pending" : "Completed",
    hours: 1,
    cost: 50,
    dueDate: new Date(new Date(order.createdAt as string | number | Date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
  });
  if (order.status !== "PENDING") {
    tasks.push({
      id: `task-${order.id}-work`,
      name: "Complete Video Editing",
      status: order.status === "COMPLETED" ? "Completed" : order.status === "CURRENT" ? "In Progress" : "Pending",
      hours: 8,
      cost: Number(order.totalPrice) * 0.8,
      dueDate: order.deliveryDeadline
        ? new Date(order.deliveryDeadline as string | number | Date).toISOString()
        : new Date().toISOString(),
    });
  }
  if (order.status === "COMPLETED") {
    tasks.push({
      id: `task-${order.id}-delivery`,
      name: "Deliver Final Files",
      status: "Completed",
      hours: 1,
      cost: Number(order.totalPrice) * 0.2,
      dueDate: order.deliveryDeadline
        ? new Date(order.deliveryDeadline as string | number | Date).toISOString()
        : new Date().toISOString(),
    });
  }
  return tasks;
};

export {
  createOrder,
  updateOrderStatus,
  getOrder,
  getClientOrders,
  getFreelancerOrders,
  cancelOrder,
  getCurrentOrders,
  getPendingOrders,
  getCompletedOrders,
  getRejectedOrders,
  getFreelancerActiveOrders,
};
