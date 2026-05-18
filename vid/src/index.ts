import dotenv from "dotenv";
// Load env vars from ./.env at process start. Restart the process to pick up
// changes — dotenv does not watch the file.
dotenv.config({ path: "./.env" });

import { validateEnv } from "./Utils/validateEnv.js";
import { initSentry } from "./Utils/sentry.js";
import logger from "./Utils/logger.js";
validateEnv();
initSentry();

// Safety net: a transient unhandled rejection from a background Redis
// reconnect, a queue worker, or a third-party socket library should be
// logged loudly but must NOT crash the API process. Without this, Node 15+
// terminates on the first stray rejection and the dev server appears to
// "not start" because it dies seconds after listening on the port.
//
// We rate-limit identical reasons so a hot-looping reconnect (e.g. Redis
// down) doesn't fill the log file at GB/min rates.
const _rejSeen = new Map<string, number>();
process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  const key = `${err.name}:${err.message}`;
  const now = Date.now();
  const last = _rejSeen.get(key) ?? 0;
  if (now - last < 5000) return;
  _rejSeen.set(key, now);
  logger.error("UnhandledRejection (kept process alive): %s", err.message);
});
process.on("uncaughtException", (err) => {
  // In production let the process supervisor (pm2/systemd/docker) restart
  // us with a clean slate after a genuinely uncaught synchronous error.
  // In dev we'd rather keep the server alive so iteration isn't blocked by
  // a noisy background dependency (e.g. Bull/Redis flapping locally).
  const inProd = process.env.NODE_ENV === "production";
  logger.error(
    "UncaughtException (%s): %s\n%s",
    inProd ? "process will exit" : "kept process alive in dev",
    err.message,
    err.stack || ""
  );
  if (inProd) {
    setTimeout(() => process.exit(1), 250).unref();
  }
});

import { buildApp } from "./app.js";
import { connectDB, disconnectDB } from "./db.js";
import { initializeSocket } from "./socket.js";
import { startProcessors } from "./Queues/processors.js";
import { redisClient } from "./Config/redis.js";
import { emailQueue, notificationQueue, paymentQueue, fileCleanupQueue } from "./Queues/index.js";
import { Redis } from "ioredis";

// Lightweight reachability check so we don't boot Bull against a dead Redis.
// Uses a one-shot client with retries disabled — connect or fail fast (~1.5s).
async function probeRedis(): Promise<boolean> {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const usesTls = url.startsWith("rediss://");
  const probe = new Redis(url, {
    password: process.env.REDIS_PASSWORD || undefined,
    tls: usesTls ? { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false" } : undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });
  probe.on("error", () => { /* swallow — caller checks return value */ });
  try {
    await probe.connect();
    await probe.ping();
    return true;
  } catch {
    return false;
  } finally {
    try { probe.disconnect(); } catch { /* noop */ }
  }
}

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
      // Probe Redis before booting Bull. Bull's bclient/subscriber connections
      // emit unhandled rejections when Redis is unreachable, and starting the
      // processors against a dead Redis just floods the log with retries
      // without doing useful work in dev. If the probe fails in development
      // we skip processors entirely and tell the developer how to fix it.
      const redisReachable = await probeRedis();
      if (redisReachable) {
        try {
          startProcessors();
        } catch (e) {
          logger.warn("Bull processors init failed (non-fatal): %s", (e as Error).message);
        }
      } else if (isProd) {
        // In production a missing Redis is a real configuration error — fail
        // loud rather than silently dropping queue workers.
        throw new Error(
          "Redis is not reachable but workers are enabled. Check REDIS_URL or set DISABLE_WORKERS=true on this process."
        );
      } else {
        logger.warn(
          "Redis is not reachable at %s — skipping Bull processors for this dev session. " +
            "Start Redis (e.g. `docker run -p 6379:6379 redis:7`) or set DISABLE_WORKERS=true to silence this.",
          process.env.REDIS_URL || "redis://localhost:6379"
        );
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
