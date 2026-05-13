// src/controllers/notificationController.js
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount } from "../db.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { DbRow, NotificationRow } from "../types/index.js";

type ControllerHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

function qs(
  q: Record<string, string | string[] | undefined>,
  key: string,
  defaultVal: string
): string {
  const v = q[key];
  if (v === undefined) return defaultVal;
  return Array.isArray(v) ? (v[0] ?? defaultVal) : v;
}

const createNotification: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const creatorId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const { userId, type, content, entityType, entityId, priority, expiresAt, metadata } = body;

    if (!userId || !type || !content) {
      return next(new ApiError(400, "User ID, type, and content are required"));
    }

    const targetUser = (await sqlOne(`SELECT id FROM "User" WHERE id = $1`, [
      parseInt(String(userId), 10),
    ])) as DbRow | null;
    if (!targetUser) {
      return next(new ApiError(404, "Target user not found"));
    }

    if (type === "SYSTEM" && req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Forbidden: Only admins can create SYSTEM notifications"));
    }

    if (req.user.role !== "ADMIN" && creatorId !== parseInt(String(userId), 10)) {
      return next(new ApiError(403, "Forbidden: Only admins can create notifications for other users"));
    }

    if (entityType && entityId) {
      const validEntities = ["ORDER", "MESSAGE", "REVIEW", "TRANSACTION", "APPLICATION"];
      if (!validEntities.includes(String(entityType))) {
        return next(new ApiError(400, `Invalid entity type. Allowed: ${validEntities.join(", ")}`));
      }
    }

    const row = (await sqlOne(
      `INSERT INTO "Notification" (
         "user_id", type, content, "entityType", "entityId", priority,
         "expiresAt", metadata
       ) VALUES ($1, $2::"NotificationType", $3, $4, $5, $6::"Priority", $7, $8)
       RETURNING *`,
      [
        parseInt(String(userId), 10),
        type,
        content,
        entityType ?? null,
        entityId != null ? parseInt(String(entityId), 10) : null,
        priority || "NORMAL",
        expiresAt ? new Date(String(expiresAt)) : null,
        metadata ?? null,
      ]
    )) as unknown as NotificationRow & { userId?: number; user?: unknown };
    const user = (await sqlOne(`SELECT firstname, lastname FROM "User" WHERE id = $1`, [
      row.user_id,
    ])) as DbRow | null;
    const notification = { ...row, userId: row.user_id, user };

    return res
      .status(201)
      .json(new ApiResponse(201, notification, "Notification created successfully"));
  } catch (error) {
    logger.error("Error creating notification: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to create notification"));
  }
};

const getNotifications: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { type, isRead } = req.query;
    const page = qs(req.query, "page", "1");
    const limit = qs(req.query, "limit", "20");
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const whereParts = [`"user_id" = $1`, `("expiresAt" >= now() OR "expiresAt" IS NULL)`];
    const params: unknown[] = [userId];
    let p = 2;
    if (type) {
      const t = Array.isArray(type) ? type[0] : type;
      whereParts.push(`type = $${p}::"NotificationType"`);
      params.push(t);
      p += 1;
    }
    if (isRead !== undefined) {
      const ir = Array.isArray(isRead) ? isRead[0] : isRead;
      whereParts.push(`"isRead" = $${p}`);
      params.push(ir === "true");
      p += 1;
    }
    const whereSql = whereParts.join(" AND ");

    const [notifications, total, unread] = await Promise.all([
      sql(
        `SELECT n.* FROM "Notification" n
         WHERE ${whereSql}
         ORDER BY n.priority DESC, n."createdAt" DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, lim, skip]
      ) as Promise<(NotificationRow & DbRow & { userId?: number; user?: unknown })[]>,
      sqlCount(`SELECT count(*)::int AS count FROM "Notification" n WHERE ${whereSql}`, params),
      sqlCount(
        `SELECT count(*)::int AS count
         FROM "Notification" n
         WHERE "user_id" = $1
           AND "isRead" = false
           AND ("expiresAt" >= now() OR "expiresAt" IS NULL)`,
        [userId]
      ),
    ]);

    const u = (await sqlOne(`SELECT firstname, lastname FROM "User" WHERE id = $1`, [
      userId,
    ])) as DbRow | null;
    for (const n of notifications) {
      n.userId = n.user_id;
      n.user = u ? { firstname: u.firstname, lastname: u.lastname } : null;
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          notifications,
          total,
          unread,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "Notifications retrieved successfully"
      )
    );
  } catch (error) {
    const e = error as Error;
    logger.error(`Error retrieving notifications: ${e.message}\n${e.stack}`);
    return next(new ApiError(500, `Failed to retrieve notifications: ${e.message}`));
  }
};

const getNotificationSummary: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const [counts, latest] = await Promise.all([
      sqlOne(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE "isRead" = false)::int AS unread,
           COUNT(*) FILTER (WHERE priority = 'HIGH'::"Priority" AND "isRead" = false)::int AS urgent
         FROM "Notification"
         WHERE "user_id" = $1
           AND ("expiresAt" >= now() OR "expiresAt" IS NULL)`,
        [userId]
      ),
      sql(
        `SELECT *
         FROM "Notification"
         WHERE "user_id" = $1
           AND ("expiresAt" >= now() OR "expiresAt" IS NULL)
         ORDER BY priority DESC, "createdAt" DESC
         LIMIT 5`,
        [userId]
      ),
    ]);

    const byTypeRows = await sql(
      `SELECT type::text AS type, COUNT(*)::int AS count
       FROM "Notification"
       WHERE "user_id" = $1
         AND ("expiresAt" >= now() OR "expiresAt" IS NULL)
       GROUP BY type`,
      [userId]
    );
    const byType: Record<string, number> = {};
    for (const row of byTypeRows) byType[String(row.type)] = Number(row.count);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          total: Number(counts?.total || 0),
          unread: Number(counts?.unread || 0),
          urgent: Number(counts?.urgent || 0),
          byType,
          latest,
        },
        "Notification summary"
      )
    );
  } catch (error) {
    const e = error as Error;
    logger.error(`Error retrieving notification summary: ${e.message}\n${e.stack}`);
    return next(new ApiError(500, `Failed to retrieve notification summary: ${e.message}`));
  }
};

const markNotificationAsRead: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = (await sqlOne(`SELECT * FROM "Notification" WHERE id = $1`, [
      parseInt(String(notificationId), 10),
    ])) as NotificationRow | null;
    if (!notification || notification.user_id !== userId) {
      return next(new ApiError(404, "Notification not found or you don't own it"));
    }
    const updatedNotification = (await sqlOne(
      `UPDATE "Notification"
       SET "isRead" = true, "readAt" = now()
       WHERE id = $1
       RETURNING *`,
      [parseInt(String(notificationId), 10)]
    )) as unknown as NotificationRow & { userId?: number; user?: unknown };
    const user = (await sqlOne(`SELECT firstname, lastname FROM "User" WHERE id = $1`, [
      userId,
    ])) as DbRow | null;
    updatedNotification.userId = updatedNotification.user_id;
    updatedNotification.user = user;

    return res
      .status(200)
      .json(new ApiResponse(200, updatedNotification, "Notification marked as read successfully"));
  } catch (error) {
    logger.error("Error marking notification as read: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to mark notification as read"));
  }
};

const deleteNotification: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = (await sqlOne(`SELECT * FROM "Notification" WHERE id = $1`, [
      parseInt(String(notificationId), 10),
    ])) as NotificationRow | null;
    if (!notification || notification.user_id !== userId) {
      return next(new ApiError(404, "Notification not found or you don't own it"));
    }

    await sql(`DELETE FROM "Notification" WHERE id = $1`, [parseInt(String(notificationId), 10)]);

    return res.status(200).json(new ApiResponse(200, null, "Notification deleted successfully"));
  } catch (error) {
    logger.error("Error deleting notification: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete notification"));
  }
};

const markAllNotificationsAsRead: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;

    const unreadCount = await sqlCount(
      `SELECT count(*)::int AS count
       FROM "Notification" n
       WHERE n."user_id" = $1
         AND n."isRead" = false
         AND (n."expiresAt" >= now() OR n."expiresAt" IS NULL)`,
      [userId]
    );
    if (unreadCount === 0) {
      return next(new ApiError(400, "No unread notifications to mark"));
    }

    await sql(
      `UPDATE "Notification"
       SET "isRead" = true, "readAt" = now()
       WHERE "user_id" = $1
         AND "isRead" = false
         AND ("expiresAt" >= now() OR "expiresAt" IS NULL)`,
      [userId]
    );

    return res
      .status(200)
      .json(new ApiResponse(200, null, "All notifications marked as read successfully"));
  } catch (error) {
    logger.error("Error marking all notifications as read: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to mark all notifications as read"));
  }
};

const deleteReadNotifications: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const result = await sql(
      `DELETE FROM "Notification"
       WHERE "user_id" = $1 AND "isRead" = true
       RETURNING id`,
      [req.user.id]
    );
    return res
      .status(200)
      .json(new ApiResponse(200, { deleted: result.length }, "Read notifications cleared"));
  } catch (error) {
    const e = error as Error;
    logger.error(`Error clearing read notifications: ${e.message}`);
    return next(new ApiError(500, `Failed to clear read notifications: ${e.message}`));
  }
};

export {
  createNotification,
  getNotifications,
  getNotificationSummary,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
  deleteReadNotifications,
};
