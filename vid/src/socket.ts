import { Server as SocketIOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import jwt from "jsonwebtoken";
import { sqlOne, sql } from "./db.js";
import logger from "./Utils/logger.js";
import { EVENTS, ROOMS } from "../../shared/socketEvents.js";
import type { Server as HttpServer } from "http";
import type { JwtPayload, DbRow } from "./types/index.js";

const socketRateLimit = new Map<number, { count: number; resetAt: number }>();
function checkSocketRate(userId: number, maxPerWindow = 30, windowMs = 10000): boolean {
  const now = Date.now();
  const entry = socketRateLimit.get(userId);
  if (!entry || now > entry.resetAt) {
    socketRateLimit.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  if (entry.count > maxPerWindow) return false;
  return true;
}

interface SocketUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  profilePicture: string | null;
  isActive?: boolean;
}

interface AuthenticatedSocket extends Socket {
  user: SocketUser;
}

export let socketIoRedisAdapterOk = false;

const initializeSocket = async (server: HttpServer): Promise<SocketIOServer> => {
  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const redisPassword = process.env.REDIS_PASSWORD || undefined;
  const usesTls = redisUrl.startsWith("rediss://");

  try {
    const redisOpts: Record<string, unknown> = {
      password: redisPassword,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
      ...(usesTls ? { tls: { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false" } } : {}),
    };

    const pubClient = new Redis(redisUrl, redisOpts);
    const subClient = pubClient.duplicate();

    io.adapter(createAdapter(pubClient, subClient));
    socketIoRedisAdapterOk = true;
    logger.info("Socket.IO Redis adapter connected (ioredis)");

    pubClient.on("error", (err) => {
      logger.error("Socket.IO Redis pub error: %s", err.message);
      socketIoRedisAdapterOk = false;
    });
    subClient.on("error", (err) => {
      logger.error("Socket.IO Redis sub error: %s", err.message);
      socketIoRedisAdapterOk = false;
    });
    pubClient.on("ready", () => { socketIoRedisAdapterOk = true; });
    subClient.on("ready", () => { socketIoRedisAdapterOk = true; });
  } catch (err) {
    logger.error("Socket.IO Redis adapter failed: %s", (err as Error).message);
    socketIoRedisAdapterOk = false;
  }

  io.use(async (socket, next) => {
    try {
      let token: string | null = null;
      const cookieHeader = socket.handshake.headers.cookie || "";
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) {
        token = match[1];
      } else {
        token = (socket.handshake.auth as Record<string, string>)?.token ?? null;
      }
      if (!token) throw new Error("Authentication token missing");

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const tokenType = (decoded as unknown as Record<string, unknown>).type;
      if (tokenType !== "access") {
        return next(new Error("Invalid token type"));
      }
      const user = await sqlOne(
        `SELECT "id", "firstname", "lastname", "email", "role", "profilePicture", "isActive"
         FROM "User" WHERE "id" = $1`,
        [decoded.id]
      ) as SocketUser | null;

      if (!user || user.isActive === false) {
        return next(new Error("Account is deactivated"));
      }

      (socket as AuthenticatedSocket).user = user;
      logger.info("Socket authenticated", { userId: user.id });
      next();
    } catch (error) {
      logger.error("Socket auth error", { error: (error as Error).message });
      next(new Error("Authentication error"));
    }
  });

  io.on(EVENTS.CONNECTION, (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    logger.info("User connected", { userId: socket.user.id });

    socket.join(ROOMS.user(socket.user.id));

    socket.on(EVENTS.JOIN_JOB_ROOM, async ({ jobId }: { jobId: string | number }) => {
      if (!checkSocketRate(socket.user.id)) {
        socket.emit(EVENTS.ERROR, { message: "Rate limit exceeded" });
        return;
      }
      try {
        const job = await sqlOne(
          `SELECT posted_by_id AS "postedById", freelancer_id AS "freelancerId"
           FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
          [parseInt(String(jobId))]
        );

        if (!job) throw new Error("Job not found");
        if (socket.user.id !== job.postedById && socket.user.id !== job.freelancerId) {
          throw new Error("Unauthorized access to job room");
        }

        const room = ROOMS.job(jobId);
        socket.join(room);
        socket.emit(EVENTS.JOINED_JOB_ROOM, { jobId });
        logger.info("Joined job room", { userId: socket.user.id, jobId });
      } catch (error) {
        logger.error("Join room error", { userId: socket.user.id, error: (error as Error).message });
        socket.emit(EVENTS.ERROR, { message: (error as Error).message });
      }
    });

    socket.on(EVENTS.LEAVE_JOB_ROOM, ({ jobId }: { jobId: string | number }) => {
      const room = ROOMS.job(jobId);
      socket.leave(room);
      logger.info("Left job room", { userId: socket.user.id, jobId });
    });

    socket.on(EVENTS.SEND_MESSAGE, async ({ jobId, content, attachments = [], replyToId }: {
      jobId: string | number;
      content: string;
      attachments?: unknown[];
      replyToId?: string;
    }) => {
      if (!checkSocketRate(socket.user.id)) {
        socket.emit(EVENTS.ERROR, { message: "Rate limit exceeded" });
        return;
      }
      try {
        const job = await sqlOne(
          `SELECT posted_by_id AS "postedById", freelancer_id AS "freelancerId"
           FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
          [parseInt(String(jobId))]
        );

        if (!job) throw new Error("Job not found");
        if (socket.user.id !== job.postedById && socket.user.id !== job.freelancerId) {
          throw new Error("Unauthorized to send message");
        }

        let replyTo: string | null = null;
        if (replyToId) {
          const replyMessage = await sqlOne(
            `SELECT "id", "jobId" FROM "Message" WHERE "id" = $1`,
            [replyToId]
          );
          if (!replyMessage || replyMessage.jobId !== parseInt(String(jobId))) {
            throw new Error("Invalid reply message");
          }
          replyTo = replyToId;
        }

        const message = await sqlOne(
          `INSERT INTO "Message" ("jobId", "senderId", "content", "attachments", "replyTo", "timestamp", "reactions")
           VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), '[]'::jsonb)
           RETURNING *`,
          [parseInt(String(jobId)), socket.user.id, content || "", JSON.stringify(attachments), replyTo]
        );

        if (!message) throw new Error("Failed to create message");

        const formattedMessage = {
          id: message.id,
          jobId: message.jobId,
          sender: {
            id: socket.user.id,
            name: `${socket.user.firstname} ${socket.user.lastname}`,
            avatar: socket.user.profilePicture || null,
          },
          content: message.content,
          attachments: message.attachments,
          replyTo: message.replyTo,
          timestamp: (message.timestamp as Date).toISOString(),
        };

        io.to(ROOMS.job(jobId)).emit(EVENTS.NEW_MESSAGE, formattedMessage);
        logger.info("Message sent", { userId: socket.user.id, jobId, messageId: message.id });
      } catch (error) {
        logger.error("Send message error", { userId: socket.user.id, error: (error as Error).message });
        socket.emit(EVENTS.ERROR, { message: (error as Error).message });
      }
    });

    socket.on(EVENTS.DELETE_MESSAGE, async ({ jobId, messageId }: { jobId: string | number; messageId: string }) => {
      try {
        const message = await sqlOne(
          `SELECT "senderId", "jobId" FROM "Message" WHERE "id" = $1`,
          [messageId]
        );

        if (!message) throw new Error("Message not found");
        if (message.senderId !== socket.user.id) throw new Error("Cannot delete another user's message");
        if (message.jobId !== parseInt(String(jobId))) throw new Error("Message does not belong to this job");

        await sql(`UPDATE "Message" SET "deletedAt" = NOW(), "isDeleted" = true WHERE "id" = $1`, [messageId]);

        io.to(ROOMS.job(jobId)).emit(EVENTS.MESSAGE_DELETED, { jobId, messageId });
        logger.info("Message deleted", { userId: socket.user.id, messageId });
      } catch (error) {
        logger.error("Delete message error", { userId: socket.user.id, error: (error as Error).message });
        socket.emit(EVENTS.ERROR, { message: (error as Error).message });
      }
    });

    socket.on(EVENTS.TYPING_START, async ({ jobId }: { jobId: string | number }) => {
      try {
        const room = ROOMS.job(jobId);
        if (!socket.rooms.has(room)) {
          socket.emit(EVENTS.ERROR, { message: "You must join the job room before typing" });
          return;
        }
        socket.to(room).emit(EVENTS.USER_TYPING, {
          userId: socket.user.id,
          name: `${socket.user.firstname} ${socket.user.lastname}`,
          isTyping: true,
        });
      } catch (error) {
        logger.error("Typing start error", { userId: socket.user.id, error: (error as Error).message });
      }
    });

    socket.on(EVENTS.TYPING_STOP, async ({ jobId }: { jobId: string | number }) => {
      try {
        const room = ROOMS.job(jobId);
        if (!socket.rooms.has(room)) return;
        socket.to(room).emit(EVENTS.USER_TYPING, {
          userId: socket.user.id,
          name: `${socket.user.firstname} ${socket.user.lastname}`,
          isTyping: false,
        });
      } catch (error) {
        logger.error("Typing stop error", { userId: socket.user.id, error: (error as Error).message });
      }
    });

    // Edit message via socket
    socket.on(EVENTS.EDIT_MESSAGE, async ({ jobId, messageId, content }: {
      jobId: string | number; messageId: string; content: string;
    }) => {
      try {
        const message = await sqlOne(
          `SELECT "senderId", "jobId" FROM "Message" WHERE "id" = $1`,
          [messageId]
        );
        if (!message) throw new Error("Message not found");
        if (message.senderId !== socket.user.id) throw new Error("Cannot edit another user's message");
        if (message.jobId !== parseInt(String(jobId))) throw new Error("Message does not belong to this job");

        const updated = await sqlOne(
          `UPDATE "Message" SET "content" = $2 WHERE "id" = $1 RETURNING id, content`,
          [messageId, content]
        );
        io.to(ROOMS.job(jobId)).emit(EVENTS.MESSAGE_EDITED, {
          jobId, messageId, content: updated?.content,
          editedBy: { id: socket.user.id, name: `${socket.user.firstname} ${socket.user.lastname}` },
        });
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: (error as Error).message });
      }
    });

    // Add/toggle reaction via socket
    socket.on(EVENTS.ADD_REACTION, async ({ jobId, messageId, emoji }: {
      jobId: string | number; messageId: string; emoji: string;
    }) => {
      if (!checkSocketRate(socket.user.id)) {
        socket.emit(EVENTS.ERROR, { message: "Rate limit exceeded" });
        return;
      }
      try {
        const room = ROOMS.job(jobId);
        if (!socket.rooms.has(room)) {
          socket.emit(EVENTS.ERROR, { message: "Join the job room first" });
          return;
        }
        const existing = await sqlOne(
          `SELECT id FROM "MessageReaction" WHERE "messageId" = $1::text AND "userId" = $2 AND emoji = $3`,
          [messageId, socket.user.id, emoji]
        );
        if (existing) {
          await sql(`DELETE FROM "MessageReaction" WHERE id = $1`, [existing.id]);
        } else {
          await sql(
            `INSERT INTO "MessageReaction" (id, "messageId", "userId", emoji, "createdAt")
             VALUES (gen_random_uuid(), $1::text, $2, $3, NOW())
             ON CONFLICT ("messageId", "userId", emoji) DO NOTHING`,
            [messageId, socket.user.id, emoji]
          );
        }
        io.to(room).emit(EVENTS.REACTION_UPDATED, {
          messageId, emoji,
          user: { id: socket.user.id, name: `${socket.user.firstname} ${socket.user.lastname}` },
          action: existing ? "removed" : "added",
        });
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: (error as Error).message });
      }
    });

    // WebRTC Signaling
    socket.on("call:initiate", async ({ targetUserId, orderId }: { targetUserId: number; orderId?: number }) => {
      try {
        const hasRelationship = await sqlOne(
          `SELECT 1 FROM "Order" o
           JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
           WHERE o."deletedAt" IS NULL
           AND ((o."client_id" = $1 AND fp."user_id" = $2) OR (o."client_id" = $2 AND fp."user_id" = $1))
           LIMIT 1`,
          [socket.user.id, targetUserId]
        );
        if (!hasRelationship) {
          socket.emit(EVENTS.ERROR, { message: "You can only call users you share an order with" });
          return;
        }
        const targetRoom = ROOMS.user(targetUserId);
        io.to(targetRoom).emit("call:incoming", {
          callerId: socket.user.id,
          callerName: `${socket.user.firstname} ${socket.user.lastname}`,
          callerAvatar: socket.user.profilePicture,
          orderId,
        });
        logger.info("Call initiated", { from: socket.user.id, to: targetUserId });
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: "Failed to initiate call" });
      }
    });

    socket.on("call:accept", async ({ targetUserId }: { targetUserId: number }) => {
      try {
        const hasRelationship = await sqlOne(
          `SELECT 1 FROM "Order" o
           JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
           WHERE o."deletedAt" IS NULL
           AND ((o."client_id" = $1 AND fp."user_id" = $2) OR (o."client_id" = $2 AND fp."user_id" = $1))
           LIMIT 1`,
          [socket.user.id, targetUserId]
        );
        if (!hasRelationship) { socket.emit(EVENTS.ERROR, { message: "Unauthorized call action" }); return; }
        io.to(ROOMS.user(targetUserId)).emit("call:accepted", { acceptedBy: socket.user.id });
      } catch { socket.emit(EVENTS.ERROR, { message: "Call action failed" }); }
    });

    socket.on("call:reject", async ({ targetUserId }: { targetUserId: number }) => {
      try {
        const hasRelationship = await sqlOne(
          `SELECT 1 FROM "Order" o
           JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
           WHERE o."deletedAt" IS NULL
           AND ((o."client_id" = $1 AND fp."user_id" = $2) OR (o."client_id" = $2 AND fp."user_id" = $1))
           LIMIT 1`,
          [socket.user.id, targetUserId]
        );
        if (!hasRelationship) { socket.emit(EVENTS.ERROR, { message: "Unauthorized call action" }); return; }
        io.to(ROOMS.user(targetUserId)).emit("call:rejected", { rejectedBy: socket.user.id });
      } catch { socket.emit(EVENTS.ERROR, { message: "Call action failed" }); }
    });

    socket.on("call:end", async ({ targetUserId }: { targetUserId: number }) => {
      try {
        const hasRelationship = await sqlOne(
          `SELECT 1 FROM "Order" o
           JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
           WHERE o."deletedAt" IS NULL
           AND ((o."client_id" = $1 AND fp."user_id" = $2) OR (o."client_id" = $2 AND fp."user_id" = $1))
           LIMIT 1`,
          [socket.user.id, targetUserId]
        );
        if (!hasRelationship) { socket.emit(EVENTS.ERROR, { message: "Unauthorized call action" }); return; }
        io.to(ROOMS.user(targetUserId)).emit("call:ended", { endedBy: socket.user.id });
      } catch { socket.emit(EVENTS.ERROR, { message: "Call action failed" }); }
    });

    socket.on("call:signal", async ({ targetUserId, signal }: { targetUserId: number; signal: unknown }) => {
      try {
        const hasRelationship = await sqlOne(
          `SELECT 1 FROM "Order" o
           JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
           WHERE o."deletedAt" IS NULL
           AND ((o."client_id" = $1 AND fp."user_id" = $2) OR (o."client_id" = $2 AND fp."user_id" = $1))
           LIMIT 1`,
          [socket.user.id, targetUserId]
        );
        if (!hasRelationship) { socket.emit(EVENTS.ERROR, { message: "Unauthorized call action" }); return; }
        io.to(ROOMS.user(targetUserId)).emit("call:signal", { from: socket.user.id, signal });
      } catch { socket.emit(EVENTS.ERROR, { message: "Call action failed" }); }
    });

    socket.on("call:ice-candidate", async ({ targetUserId, candidate }: { targetUserId: number; candidate: unknown }) => {
      try {
        const hasRelationship = await sqlOne(
          `SELECT 1 FROM "Order" o
           JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
           WHERE o."deletedAt" IS NULL
           AND ((o."client_id" = $1 AND fp."user_id" = $2) OR (o."client_id" = $2 AND fp."user_id" = $1))
           LIMIT 1`,
          [socket.user.id, targetUserId]
        );
        if (!hasRelationship) { socket.emit(EVENTS.ERROR, { message: "Unauthorized call action" }); return; }
        io.to(ROOMS.user(targetUserId)).emit("call:ice-candidate", { from: socket.user.id, candidate });
      } catch { socket.emit(EVENTS.ERROR, { message: "Call action failed" }); }
    });

    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit(EVENTS.USER_ONLINE, {
          userId: socket.user.id,
          name: `${socket.user.firstname} ${socket.user.lastname}`,
        });
      }
    }

    socket.on(EVENTS.DISCONNECT, () => {
      logger.info("User disconnected", { userId: socket.user.id });
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit(EVENTS.USER_OFFLINE, { userId: socket.user.id });
        }
      }
    });
  });

  _ioInstance = io;
  return io;
};

let _ioInstance: SocketIOServer | null = null;
export function getIO(): SocketIOServer | null {
  return _ioInstance;
}

export { initializeSocket };
