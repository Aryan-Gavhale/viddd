import { randomUUID } from "crypto";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount } from "../db.js";
import logger from "../Utils/logger.js";
import { getIO } from "../socket.js";
import { EVENTS, ROOMS } from "../../../shared/socketEvents.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { DbRow } from "../types/index.js";

type ControllerHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

type MessageRowMut = DbRow & Record<string, unknown>;

function qp(q: Record<string, string | string[] | undefined>, key: string, def: string): string {
  const v = q[key];
  if (v === undefined) return def;
  return Array.isArray(v) ? (v[0] ?? def) : v;
}

const messageReadWhere = `m."deletedAt" IS NULL AND (NOT COALESCE(m."isDeleted", false))`;

function uniqueInts(ids: unknown[]): number[] {
  return [
    ...new Set(
      ids
        .filter((n) => n != null && !Number.isNaN(Number(n)))
        .map((n) => Number(n))
    ),
  ];
}

async function loadUsersMap(userIds: unknown[]): Promise<Map<number, DbRow>> {
  const ids = uniqueInts(userIds);
  if (!ids.length) return new Map();
  const rows = (await sql(
    `SELECT id, firstname, lastname, "profilePicture" FROM "User" WHERE id = ANY($1::int[])`,
    [ids]
  )) as DbRow[];
  return new Map(rows.map((r) => [r.id as number, r]));
}

// FIX M9: read reactions from normalized MessageReaction table, not JSONB column
async function expandReactionsOnMessages(rows: MessageRowMut[]) {
  if (!rows.length) return;
  const msgIds = rows.map((m) => m.id);
  const reactionRows = await sql(
    `SELECT mr.id, mr."messageId", mr."userId", mr.emoji,
            u.id AS u_id, u.firstname, u.lastname, u."profilePicture"
     FROM "MessageReaction" mr
     JOIN "User" u ON u.id = mr."userId"
     WHERE mr."messageId" = ANY($1::text[])`,
    [msgIds]
  );
  const byMsg = new Map<string, { emoji: unknown; user: { id: unknown; firstname: string; lastname: string; profilePicture?: unknown } }[]>();
  for (const r of reactionRows) {
    const mid = String(r.messageId);
    if (!byMsg.has(mid)) byMsg.set(mid, []);
    byMsg.get(mid)!.push({
      emoji: r.emoji,
      user: { id: r.u_id, firstname: r.firstname, lastname: r.lastname, profilePicture: r.profilePicture },
    });
  }
  for (const m of rows) {
    m.reactions = byMsg.get(String(m.id)) || [];
  }
}

/**
 * Clean job-scoped HTTP send endpoint. Mirrors the socket flow exactly so it
 * can be used as a fallback when the websocket isn't connected. Returns the
 * persisted message in the same shape the socket broadcasts.
 */
const sendJobMessage: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized"));
    }
    const senderId = req.user.id;
    const jobId = parseInt(String((req.params as Record<string, string>).jobId), 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return next(new ApiError(400, "Invalid jobId"));
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const content = (body.content == null ? "" : String(body.content)).slice(0, 5000);
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const replyToId = body.replyToId ? String(body.replyToId) : null;
    const clientId = body.clientId ? String(body.clientId) : null;

    if (!content.trim() && attachments.length === 0) {
      return next(new ApiError(400, "Message content or attachments are required"));
    }

    const job = await sqlOne(
      `SELECT posted_by_id AS "postedById", freelancer_id AS "freelancerId"
         FROM "Job" WHERE id = $1 AND "deletedAt" IS NULL`,
      [jobId]
    );
    if (!job) return next(new ApiError(404, "Job not found"));
    const postedById = Number(job.postedById);
    const freelancerId = job.freelancerId == null ? null : Number(job.freelancerId);
    if (senderId !== postedById && senderId !== freelancerId) {
      return next(new ApiError(403, "You are not part of this conversation"));
    }
    const receiverId = senderId === postedById ? freelancerId : postedById;

    if (replyToId) {
      const parent = await sqlOne(
        `SELECT id, "jobId" FROM "Message" WHERE id = $1`,
        [replyToId]
      );
      if (!parent || Number(parent.jobId) !== jobId) {
        return next(new ApiError(400, "Invalid reply target"));
      }
    }

    const messageId = randomUUID();
    const inserted = (await sqlOne(
      `INSERT INTO "Message"
         ("id","jobId","senderId","receiverId","content",
          "attachments","replyTo","timestamp","reactions")
       VALUES (
         $1,$2,$3,$4,$5,
         COALESCE(
           (SELECT array_agg(value) FROM jsonb_array_elements($6::jsonb)),
           ARRAY[]::jsonb[]
         ),
         $7, NOW(), '[]'::jsonb
       )
       RETURNING *`,
      [
        messageId,
        jobId,
        senderId,
        receiverId ?? senderId,
        content,
        JSON.stringify(attachments),
        replyToId,
      ]
    )) as MessageRowMut | null;

    if (!inserted) return next(new ApiError(500, "Failed to persist message"));

    const sender = await sqlOne(
      `SELECT id, firstname, lastname, "profilePicture" FROM "User" WHERE id = $1`,
      [senderId]
    );

    const formatted = {
      id: inserted.id,
      jobId: inserted.jobId,
      senderId,
      sender: {
        id: senderId,
        firstname: sender?.firstname,
        lastname: sender?.lastname,
        name: `${sender?.firstname || ""} ${sender?.lastname || ""}`.trim(),
        avatar: sender?.profilePicture || null,
        profilePicture: sender?.profilePicture || null,
      },
      content: inserted.content,
      attachments: Array.isArray(inserted.attachments) ? inserted.attachments : [],
      replyTo: inserted.replyTo,
      timestamp: inserted.timestamp instanceof Date
        ? inserted.timestamp.toISOString()
        : inserted.timestamp,
      reactions: [],
    };

    // Broadcast to the room so the *other* party sees it instantly even though
    // this came in over HTTP and not the websocket.
    try {
      const io = getIO();
      io.to(ROOMS.job(jobId)).emit(EVENTS.NEW_MESSAGE, formatted);
    } catch (e) {
      logger.warn(`HTTP message broadcast skipped: ${(e as Error).message}`);
    }

    return res.status(201).json(
      new ApiResponse(201, { clientId, message: formatted }, "Message sent")
    );
  } catch (e) {
    const err = e as Error;
    logger.error(`sendJobMessage: ${err.message}\n${err.stack}`);
    return next(new ApiError(500, `Failed to send message: ${err.message}`));
  }
};

const sendMessage: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const senderId = req.user.id;
    const { receiverId, orderId, content, subject, parentId, attachments, jobId: jobIdBody } = req.body as Record<
      string,
      unknown
    >;

    if (!receiverId || !content) {
      return next(new ApiError(400, "Receiver ID and content are required"));
    }

    // FIX M8: refuse free-form DMs. Every message must be tied to an Order or Job
    // that both sender + receiver actually belong to. Otherwise the platform is a
    // free spam/phishing channel between any two registered users.
    if (!orderId && !jobIdBody) {
      return next(
        new ApiError(
          400,
          "Messages must be associated with an order or job. Direct messages without context are not allowed."
        )
      );
    }

    const receiver = await sqlOne(
      `SELECT id FROM "User" WHERE id = $1 AND "isActive" = true`,
      [parseInt(String(receiverId), 10)]
    );
    if (!receiver) {
      return next(new ApiError(404, "Receiver not found"));
    }

    let order: DbRow | null = null;
    let freelancerUserId: number | null = null;
    const receiverIdNum = parseInt(String(receiverId), 10);

    if (orderId) {
      order = (await sqlOne(
        `SELECT o.*, fp."user_id" AS "freelancerUserId"
         FROM "Order" o
         JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
         WHERE o.id = $1 AND o."deletedAt" IS NULL`,
        [parseInt(String(orderId), 10)]
      )) as DbRow | null;
      if (order != null && order.freelancerUserId != null) {
        freelancerUserId = Number(order.freelancerUserId);
      }
      if (!order || (order.client_id !== senderId && freelancerUserId !== senderId)) {
        return next(new ApiError(404, "Order not found or you don't have access"));
      }
      // Receiver must be the other party on the order — not an arbitrary 3rd user.
      const orderParties = new Set([Number(order.client_id), Number(freelancerUserId)]);
      if (!orderParties.has(receiverIdNum)) {
        return next(new ApiError(403, "Receiver is not a party to this order"));
      }
    }

    if (jobIdBody && !orderId) {
      const job = (await sqlOne(
        `SELECT j."id", j."posted_by_id" AS "postedById", j."freelancer_id" AS "freelancerId"
         FROM "Job" j
         WHERE j."id" = $1 AND j."deletedAt" IS NULL`,
        [parseInt(String(jobIdBody), 10)]
      )) as DbRow | null;
      if (!job) {
        return next(new ApiError(404, "Job not found"));
      }
      const postedById = Number(job.postedById);
      const jobFreelancerId = job.freelancerId != null ? Number(job.freelancerId) : null;
      const isPoster = postedById === senderId;
      const isAssigned = jobFreelancerId !== null && jobFreelancerId === senderId;
      if (!isPoster && !isAssigned) {
        return next(new ApiError(403, "You are not a participant on this job"));
      }
      const jobParties = new Set<number>([postedById]);
      if (jobFreelancerId !== null) jobParties.add(jobFreelancerId);
      if (!jobParties.has(receiverIdNum)) {
        return next(new ApiError(403, "Receiver is not a participant on this job"));
      }
    }

    if (parentId) {
      const parentMessage = await sqlOne(
        `SELECT * FROM "Message" pm
         WHERE pm.id = $1::text
           AND pm."deletedAt" IS NULL
           AND (NOT COALESCE(pm."isDeleted", false))`,
        [String(parentId)]
      );
      const parentOk =
        parentMessage &&
        (parentMessage.senderId === senderId ||
          parentMessage.receiverId === senderId);
      if (!parentOk) {
        return next(
          new ApiError(404, "Parent message not found or you don't have access")
        );
      }
    }

    const attachmentData = req.fileUrls
      ? req.fileUrls.map((url) => ({
          fileUrl: url,
          fileType: "video/mp4",
          fileName: url.split("/").pop(),
        }))
      : Array.isArray(attachments)
        ? attachments
        : [];

    const newId = randomUUID();
    const receiverInt = parseInt(String(receiverId), 10);
    const orderIdVal = orderId ? parseInt(String(orderId), 10) : null;
    const jobIdVal =
      jobIdBody != null && jobIdBody !== ""
        ? parseInt(String(jobIdBody), 10)
        : null;
    const replyToVal = parentId ? String(parentId) : null;
    const attStrings = attachmentData.map((o) => JSON.stringify(o));

    const message = (await sqlOne(
      `INSERT INTO "Message" (
         id, "jobId", "senderId", "receiverId", "orderId", "content", "subject",
         "replyTo", "attachments", "reactions", "isDeleted", "isRead", "isFlagged"
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8,
         (SELECT COALESCE(array_agg(s.x::jsonb), ARRAY[]::jsonb[])
          FROM (SELECT unnest(COALESCE($9::text[], ARRAY[]::text[])) AS x) s),
         '[]'::jsonb,
         false, false, false
       ) RETURNING *`,
      [
        newId,
        jobIdVal,
        senderId,
        receiverInt,
        orderIdVal,
        content,
        subject ?? null,
        replyToVal,
        attStrings,
      ]
    )) as MessageRowMut | null;
    if (!message) {
      return next(new ApiError(500, "Failed to create message"));
    }

    const [sender, recv] = await Promise.all([
      sqlOne(
        `SELECT id, firstname, lastname FROM "User" WHERE id = $1`,
        [senderId]
      ),
      sqlOne(
        `SELECT id, firstname, lastname FROM "User" WHERE id = $1`,
        [receiverInt]
      ),
    ]);
    message.sender = sender;
    message.receiver = recv;

    const senderFirst = (sender as DbRow | null)?.firstname;
    const preview = String(subject || content).substring(0, 50);
    await sql(
      `INSERT INTO "Notification" ("user_id", type, content) VALUES ($1, 'MESSAGE', $2)`,
      [receiverInt, `New message from ${senderFirst ?? "User"}: ${preview}...`]
    );

    // Broadcast to socket room so real-time clients get the message
    const io = getIO();
    if (io && jobIdVal) {
      io.to(ROOMS.job(jobIdVal)).emit(EVENTS.NEW_MESSAGE, {
        id: message.id,
        jobId: message.jobId,
        sender: { id: senderId, name: `${sender?.firstname ?? ""} ${sender?.lastname ?? ""}`.trim(), avatar: null },
        content: message.content,
        attachments: message.attachments,
        replyTo: message.replyTo,
        timestamp: message.timestamp ? new Date(message.timestamp as string | number | Date).toISOString() : new Date().toISOString(),
      });
    }
    if (io) {
      io.to(ROOMS.user(receiverInt)).emit(EVENTS.NEW_MESSAGE, {
        id: message.id,
        jobId: message.jobId,
        sender: { id: senderId, name: `${sender?.firstname ?? ""} ${sender?.lastname ?? ""}`.trim(), avatar: null },
        content: message.content,
        timestamp: message.timestamp ? new Date(message.timestamp as string | number | Date).toISOString() : new Date().toISOString(),
      });
    }

    return res.status(201).json(new ApiResponse(201, message, "Message sent successfully"));
  } catch (error) {
    logger.error("Error sending message: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to send message"));
  }
};

const getMessages: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const qq = req.query as Record<string, string | string[] | undefined>;
    const orderId = qq.orderId;
    const receiverId = qq.receiverId;
    const page = qp(qq, "page", "1");
    const limit = qp(qq, "limit", "20");
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    let cond = `(m."senderId" = $1 OR m."receiverId" = $1) AND ${messageReadWhere}`;

    const params: unknown[] = [userId];
    let p = 2;

    if (orderId) {
      const oid = Array.isArray(orderId) ? orderId[0] : orderId;
      const order = (await sqlOne(
        `SELECT o.*, fp."user_id" AS "freelancerUserId"
         FROM "Order" o
         JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
         WHERE o.id = $1 AND o."deletedAt" IS NULL`,
        [parseInt(String(oid), 10)]
      )) as DbRow | null;
      if (!order) {
        return next(new ApiError(404, "Order not found"));
      }
      const fuid = order.freelancerUserId;
      if (order.client_id !== userId && fuid !== userId) {
        return next(new ApiError(403, "Forbidden: You don't have access to this order's messages"));
      }
      cond += ` AND m."orderId" = $${p}`;
      params.push(parseInt(String(oid), 10));
      p += 1;
    }

    if (receiverId) {
      const rid = Array.isArray(receiverId) ? receiverId[0] : receiverId;
      cond += ` AND m."receiverId" = $${p}`;
      params.push(parseInt(String(rid), 10));
      p += 1;
    }

    const total = await sqlCount(
      `SELECT count(*)::int AS count FROM "Message" m WHERE ${cond}`,
      params
    );

    const messages = await sql(
      `SELECT m.* FROM "Message" m WHERE ${cond}
       ORDER BY m.timestamp DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lim, skip]
    );

    const allIds = uniqueInts(
      messages.flatMap((m) => [m.senderId, m.receiverId])
    );
    const orderIds = [...new Set(messages.map((m) => m.orderId).filter((x) => x != null))];
    const usersMap = await loadUsersMap(allIds);
    const orders = orderIds.length
      ? await sql(
          `SELECT id, "orderNumber" FROM "Order" WHERE id = ANY($1::int[])`,
          [orderIds]
        )
      : [];
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const msgIds = messages.map((m) => m.id);
    const replies = msgIds.length
      ? await sql(
          `SELECT r.* FROM "Message" r
           WHERE r."replyTo" = ANY($1::text[]) AND ${messageReadWhere.replace(/m\./g, "r.")}`,
          [msgIds]
        )
      : [];
    const repliesByParent = new Map<string, MessageRowMut[]>();
    for (const r of replies as MessageRowMut[]) {
      const k = String(r.replyTo ?? "");
      if (!repliesByParent.has(k)) repliesByParent.set(k, []);
      repliesByParent.get(k)!.push(r);
    }

    for (const m of messages) {
      m.sender = usersMap.get(Number(m.senderId)) || null;
      m.receiver = usersMap.get(Number(m.receiverId)) || null;
      const ord = m.orderId != null ? orderMap.get(Number(m.orderId)) : undefined;
      m.order = ord != null ? { orderNumber: ord.orderNumber as string | number } : null;
      const child = repliesByParent.get(String(m.id)) || [];
      for (const c of child) {
        c.sender = usersMap.get(Number(c.senderId)) || null;
      }
      m.replies = child;
    }
    await expandReactionsOnMessages(messages);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          messages,
          total,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "Messages retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving messages: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve messages"));
  }
};

const getMessagesByJob: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { jobId } = req.params;

    const job = await sqlOne(
      `SELECT id, "posted_by_id" AS "postedById", "freelancer_id" AS "freelancerId"
       FROM "Job" WHERE id = $1 AND "deletedAt" IS NULL`,
      [parseInt(jobId, 10)]
    );

    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    if (userId !== job.postedById && userId !== job.freelancerId) {
      return next(new ApiError(403, "Unauthorized access to job messages"));
    }

    const messages = await sql(
      `SELECT m.* FROM "Message" m
       WHERE m."jobId" = $1 AND ${messageReadWhere}
       ORDER BY m.timestamp ASC`,
      [parseInt(jobId, 10)]
    );

    const senders = await loadUsersMap(messages.map((m) => m.senderId));
    const msgIds = messages.map((m) => m.id);
    const reactionRows = msgIds.length
      ? await sql(
          `SELECT mr.id, mr."messageId" AS "messageId", mr."userId" AS "userId", mr.emoji,
                  u.id AS u_id, u.firstname, u.lastname
           FROM "MessageReaction" mr
           JOIN "User" u ON u.id = mr."userId"
           WHERE mr."messageId" = ANY($1::text[])`,
          [msgIds]
        )
      : [];
    const reactionsByMessage = new Map<string, { id: unknown; emoji: unknown; user: { id: unknown; name: string } }[]>();
    for (const row of reactionRows) {
      const mid = String(row.messageId);
      if (!reactionsByMessage.has(mid)) reactionsByMessage.set(mid, []);
      reactionsByMessage.get(mid)!.push({
        id: row.id,
        emoji: row.emoji,
        user: {
          id: row.u_id,
          name: `${row.firstname} ${row.lastname}`,
        },
      });
    }

    const formattedMessages = messages.map((message) => {
      const srow = senders.get(Number(message.senderId));
      return {
        id: message.id,
        jobId: message.jobId,
        content: message.content,
        sender: {
          id: message.senderId,
          name: srow ? `${srow.firstname} ${srow.lastname}` : "",
          avatar: srow?.profilePicture || null,
        },
        reactions: reactionsByMessage.get(String(message.id)) || [],
        timestamp: message.timestamp
          ? new Date(message.timestamp as string | number | Date).toISOString()
          : null,
      };
    });

    return res
      .status(200)
      .json(new ApiResponse(200, formattedMessages, "Messages retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving job messages: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve job messages"));
  }
};

const markMessageAsRead: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await sqlOne(
      `SELECT * FROM "Message" m WHERE m.id = $1::text AND ${messageReadWhere}`,
      [String(messageId)]
    );
    if (!message || message.receiverId !== userId) {
      return next(
        new ApiError(404, "Message not found or you are not the receiver")
      );
    }
    if (message.isRead || message.readAt) {
      return next(new ApiError(400, "Message is already marked as read"));
    }

    const updatedMessage = (await sqlOne(
      `UPDATE "Message"
       SET "isRead" = true,
           "readAt" = now(),
           "status" = 'READ'::"MessageStatus"
       WHERE id = $1::text
       RETURNING *`,
      [String(messageId)]
    )) as MessageRowMut | null;
    if (!updatedMessage) {
      return next(new ApiError(500, "Failed to update message"));
    }

    const sender = await sqlOne(
      `SELECT firstname, lastname FROM "User" WHERE id = $1`,
      [Number(updatedMessage.senderId)]
    );
    updatedMessage.sender = sender;

    return res
      .status(200)
      .json(new ApiResponse(200, updatedMessage, "Message marked as read successfully"));
  } catch (error) {
    logger.error("Error marking message as read: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to mark message as read"));
  }
};

const deleteMessage: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }

    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await sqlOne(
      `SELECT m.*, j."posted_by_id" AS "postedById"
       FROM "Message" m
       LEFT JOIN "Job" j ON j.id = m."jobId"
       WHERE m.id = $1::text AND ${messageReadWhere}`,
      [String(messageId)]
    );

    if (!message) {
      return next(new ApiError(404, "Message not found"));
    }

    const isSender = Number(message.senderId) === userId;
    const isJobOwner = message.postedById != null && Number(message.postedById) === userId;

    if (!isSender && !isJobOwner) {
      return next(
        new ApiError(403, "Forbidden: You can only delete your own messages or messages in your job")
      );
    }

    await sql(
      `UPDATE "Message" SET
        "isDeleted" = true,
        "deletedAt" = now(),
        content = $2,
        attachments = ARRAY[]::jsonb[]
       WHERE id = $1::text`,
      [String(messageId), "This message was deleted"]
    );

    const io = getIO();
    if (io) {
      io.to(ROOMS.job(message.jobId)).emit(EVENTS.MESSAGE_DELETED, {
        messageId: message.id,
        jobId: message.jobId,
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Message deleted successfully"));
  } catch (error) {
    logger.error("Error deleting message: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete message"));
  }
};

const flagMessage: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { messageId } = req.params;
    const { reason } = req.body;

    const message = await sqlOne(
      `SELECT * FROM "Message" m WHERE m.id = $1::text AND ${messageReadWhere}`,
      [String(messageId)]
    );
    if (!message) {
      return next(new ApiError(404, "Message not found or you don't have access"));
    }
    if (message.senderId !== userId && message.receiverId !== userId) {
      return next(new ApiError(404, "Message not found or you don't have access"));
    }
    if (message.isFlagged) {
      return next(new ApiError(400, "Message is already flagged"));
    }

    const updatedMessage = (await sqlOne(
      `UPDATE "Message"
       SET "isFlagged" = true, "flaggedReason" = $2
       WHERE id = $1::text
       RETURNING *`,
      [String(messageId), reason || "Not specified"]
    )) as MessageRowMut | null;
    if (!updatedMessage) {
      return next(new ApiError(500, "Failed to update message"));
    }
    const [s, r] = await Promise.all([
      sqlOne(`SELECT firstname, lastname FROM "User" WHERE id = $1`, [Number(updatedMessage.senderId)]),
      sqlOne(
        `SELECT firstname, lastname FROM "User" WHERE id = $1`,
        [Number(updatedMessage.receiverId)]
      ),
    ]);
    updatedMessage.sender = s;
    updatedMessage.receiver = r;

    const adminForFlag = (await sqlOne(
      `SELECT "id" FROM "User" WHERE "role" = 'ADMIN' LIMIT 1`,
      []
    )) as DbRow | null;
    if (adminForFlag != null && adminForFlag.id != null) {
      await sql(
        `INSERT INTO "Notification" ("user_id", type, content) VALUES ($1, 'SYSTEM', $2)`,
        [
          adminForFlag.id,
          `Message #${messageId} flagged by user ${userId} for: ${String(reason || "Not specified")}`,
        ]
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedMessage, "Message flagged successfully"));
  } catch (error) {
    logger.error("Error flagging message: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to flag message"));
  }
};

const addReaction: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }

    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const message = await sqlOne(
      `SELECT id FROM "Message" m WHERE m.id = $1::text AND ${messageReadWhere}`,
      [String(messageId)]
    );
    if (!message) {
      return next(new ApiError(404, "Message not found"));
    }

    // FIX M9: use normalized MessageReaction table exclusively (toggle semantics)
    const existing = await sqlOne(
      `SELECT id FROM "MessageReaction" WHERE "messageId" = $1::text AND "userId" = $2 AND emoji = $3`,
      [String(messageId), userId, emoji]
    );

    if (existing) {
      await sql(`DELETE FROM "MessageReaction" WHERE id = $1`, [existing.id]);
    } else {
      await sql(
        `INSERT INTO "MessageReaction" (id, "messageId", "userId", emoji, "createdAt")
         VALUES (gen_random_uuid(), $1::text, $2, $3, NOW())
         ON CONFLICT ("messageId", "userId", emoji) DO NOTHING`,
        [String(messageId), userId, emoji]
      );
    }

    const reactions = await sql(
      `SELECT mr.id, mr.emoji, mr."userId", u.firstname, u.lastname
       FROM "MessageReaction" mr
       JOIN "User" u ON u.id = mr."userId"
       WHERE mr."messageId" = $1::text`,
      [String(messageId)]
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, { id: String(messageId), reactions }, "Reaction updated successfully")
      );
  } catch (error) {
    logger.error("Error adding reaction: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to add reaction"));
  }
};

const getMessagesByJobId: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { jobId } = req.params;
    const page = qp(req.query, "page", "1");
    const limit = qp(req.query, "limit", "50");
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const job = await sqlOne(
      `SELECT j.id, j."posted_by_id" AS "postedById", j."freelancer_id" AS "freelancerId"
       FROM "Job" j
       WHERE j.id = $1 AND j."deletedAt" IS NULL`,
      [parseInt(jobId, 10)]
    );

    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    if (job.postedById !== userId && job.freelancerId !== userId) {
      return next(
        new ApiError(403, "Forbidden: You don't have access to this job's messages")
      );
    }

    const total = await sqlCount(
      `SELECT count(*)::int AS count FROM "Message" m
       WHERE m."jobId" = $1 AND ${messageReadWhere}`,
      [parseInt(jobId, 10)]
    );

    const messages = await sql(
      `SELECT m.* FROM "Message" m
       WHERE m."jobId" = $1 AND ${messageReadWhere}
       ORDER BY m.timestamp ASC
       LIMIT $2 OFFSET $3`,
      [parseInt(jobId, 10), lim, skip]
    );

    const usersMap = await loadUsersMap(uniqueInts(messages.map((m) => m.senderId)));

    const parentIds = [...new Set(messages.map((m) => m.replyTo).filter(Boolean))];
    const parents = parentIds.length
      ? await sql(
          `SELECT m.* FROM "Message" m
           WHERE m.id = ANY($1::text[]) AND ${messageReadWhere}`,
          [parentIds]
        )
      : [];
    const parentSenders = await loadUsersMap(parents.map((p) => p.senderId));
    const parentById = new Map((parents as MessageRowMut[]).map((p) => [String(p.id), p]));
    for (const m of messages) {
      m.sender = usersMap.get(Number(m.senderId)) || null;
      if (m.replyTo) {
        const p = parentById.get(String(m.replyTo));
        m.parent = p
          ? { ...p, sender: parentSenders.get(Number(p.senderId)) || null }
          : null;
      } else {
        m.parent = null;
      }
    }
    await expandReactionsOnMessages(messages);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          messages,
          total,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "Job messages retrieved successfully"
      )
    );
  } catch (error) {
    const err = error as Error;
    logger.error(`Error retrieving job messages: ${err.message}\n${err.stack}`);
    return next(new ApiError(500, `Failed to retrieve job messages: ${err.message}`));
  }
};

const getMessagesByOrderId: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { orderId } = req.params;
    const page = qp(req.query, "page", "1");
    const limit = qp(req.query, "limit", "50");
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const order = await sqlOne(
      `SELECT o.*, fp."user_id" AS "freelancerUserId"
       FROM "Order" o
       JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
       WHERE o.id = $1 AND o."deletedAt" IS NULL`,
      [parseInt(orderId, 10)]
    );

    if (!order) {
      return next(new ApiError(404, "Order not found"));
    }

    if (order.client_id !== userId && order.freelancerUserId !== userId) {
      return next(
        new ApiError(403, "Forbidden: You don't have access to this order's messages")
      );
    }

    const total = await sqlCount(
      `SELECT count(*)::int AS count FROM "Message" m
       WHERE m."orderId" = $1 AND ${messageReadWhere}`,
      [parseInt(orderId, 10)]
    );

    const messages = await sql(
      `SELECT m.* FROM "Message" m
       WHERE m."orderId" = $1 AND ${messageReadWhere}
       ORDER BY m.timestamp ASC
       LIMIT $2 OFFSET $3`,
      [parseInt(orderId, 10), lim, skip]
    );

    const usersMap = await loadUsersMap(
      uniqueInts(messages.map((m) => m.senderId))
    );
    const parentIds = [...new Set(messages.map((m) => m.replyTo).filter(Boolean))];
    const parents = parentIds.length
      ? await sql(
          `SELECT m.* FROM "Message" m
           WHERE m.id = ANY($1::text[]) AND ${messageReadWhere}`,
          [parentIds]
        )
      : [];
    const parentSenders = await loadUsersMap(parents.map((p) => p.senderId));
    const parentById = new Map((parents as MessageRowMut[]).map((p) => [String(p.id), p]));
    for (const m of messages) {
      m.sender = usersMap.get(Number(m.senderId)) || null;
      if (m.replyTo) {
        const p = parentById.get(String(m.replyTo));
        m.parent = p
          ? { ...p, sender: parentSenders.get(Number(p.senderId)) || null }
          : null;
      } else {
        m.parent = null;
      }
    }
    await expandReactionsOnMessages(messages);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          messages,
          total,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "Order messages retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving order messages: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve order messages"));
  }
};

export {
  sendMessage,
  sendJobMessage,
  getMessages,
  getMessagesByJob,
  markMessageAsRead,
  deleteMessage,
  flagMessage,
  addReaction,
  getMessagesByJobId,
  getMessagesByOrderId,
};
