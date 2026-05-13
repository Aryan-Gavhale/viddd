import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { validateEnv } from "./Utils/validateEnv.js";
import { initSentry } from "./Utils/sentry.js";
import logger from "./Utils/logger.js";
validateEnv();
initSentry();

import { buildApp } from "./app.js";
import { connectDB, disconnectDB } from "./db.js";
import { initializeSocket } from "./socket.js";
import { startProcessors } from "./Queues/processors.js";
import { redisClient } from "./Config/redis.js";
import { emailQueue, notificationQueue, paymentQueue, fileCleanupQueue } from "./Queues/index.js";

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const app = await buildApp();
    const PORT = parseInt(process.env.PORT || "3000", 10);

    await app.listen({ port: PORT, host: "0.0.0.0" });

    let io: Awaited<ReturnType<typeof initializeSocket>> | null = null;
    try {
      io = await initializeSocket(app.server);
    } catch (e) {
      logger.warn("Socket.IO init failed (non-fatal): %s", (e as Error).message);
    }

    // Worker separation: in production the API process must NOT run Bull
    // processors. Set ENABLE_INLINE_WORKERS=true to opt in (single-process
    // dev), otherwise run a dedicated `worker.ts` process and leave
    // DISABLE_WORKERS=true on the API. In production with neither flag set we
    // skip processors and log a clear startup message so duplicate execution
    // can never happen by accident.
    const isProd = process.env.NODE_ENV === "production";
    const inlineOptIn = process.env.ENABLE_INLINE_WORKERS === "true";
    const disabledExplicit = process.env.DISABLE_WORKERS === "true";
    const shouldStartInline = !disabledExplicit && (!isProd || inlineOptIn);
    if (shouldStartInline) {
      try {
        startProcessors();
      } catch (e) {
        logger.warn("Bull processors init failed (non-fatal): %s", (e as Error).message);
      }
    } else {
      logger.info(
        "Bull processors NOT started in API process (isProd=%s, inlineOptIn=%s, disabledExplicit=%s). Run a dedicated worker.",
        isProd,
        inlineOptIn,
        disabledExplicit
      );
    }

    logger.info(`Fastify server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      await app.close();

      if (io) {
        io.disconnectSockets(true);
        io.close();
      }

      const queues = [emailQueue, notificationQueue, paymentQueue, fileCleanupQueue];
      await Promise.allSettled(queues.map((q) => q.close()));
      logger.info("Bull queues closed.");

      try {
        if (redisClient?.status === "ready") await redisClient.quit();
      } catch { /* already closed */ }

      try {
        const rlRedis = (app as unknown as Record<string, unknown>)._rateLimitRedis;
        if (rlRedis && typeof (rlRedis as { quit: () => Promise<void> }).quit === "function") {
          await (rlRedis as { quit: () => Promise<void> }).quit();
        }
      } catch { /* already closed */ }

      await disconnectDB();

      logger.info("Shutdown complete.");
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Startup failed: ${err.message}\n${err.stack}`);
    await disconnectDB();
    process.exit(1);
  }
};

startServer();
