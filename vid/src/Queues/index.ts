import Queue, { type QueueOptions } from "bull";
import logger from "../Utils/logger.js";

/**
 * FIX M5: support TLS + auth for production Redis.
 * FIX M11: single shared connection config — every queue here uses the same
 *          Redis instance, no per-queue ad-hoc clients.
 */
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const usesTls = REDIS_URL.startsWith("rediss://");

if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) {
  throw new Error("REDIS_URL is required in production. Refusing to start.");
}

if (process.env.NODE_ENV === "production" && !usesTls) {
  logger.warn(
    "Bull queues are NOT using TLS Redis in production. Use rediss:// to enable encryption."
  );
}

const queueOptions: QueueOptions = {
  redis: {
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
    ...(usesTls
      ? {
          tls: {
            rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
          },
        }
      : {}),
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
};

function createQueue(name: string): Queue.Queue {
  const queue = new Queue(name, REDIS_URL, queueOptions);

  queue.on("error", (err) => logger.error("Queue %s error: %s", name, err.message));
  queue.on("failed", (job, err) => logger.error("Job %s in queue %s failed: %s", job.id, name, err.message));

  return queue;
}

export const emailQueue = createQueue("emails");
export const notificationQueue = createQueue("notifications");
export const paymentQueue = createQueue("payments");
export const fileCleanupQueue = createQueue("file-cleanup");

export { startProcessors } from "./processors.js";
