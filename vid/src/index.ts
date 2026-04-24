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
    logger.info("Connected to PostgreSQL via pg Pool.");

    const app = await buildApp();
    const PORT = parseInt(process.env.PORT || "3000", 10);

    await app.listen({ port: PORT, host: "0.0.0.0" });

    const io = await initializeSocket(app.server);
    startProcessors();

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
    logger.error("Startup failed: %s", (error as Error).message);
    await disconnectDB();
    process.exit(1);
  }
};

startServer();
