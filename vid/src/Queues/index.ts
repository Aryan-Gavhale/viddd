import Queue, { type QueueOptions } from "bull";
import logger from "../Utils/logger.js";

const isDev = () => process.env.NODE_ENV !== "production";

let _queues: {
  emailQueue: Queue.Queue;
  notificationQueue: Queue.Queue;
  paymentQueue: Queue.Queue;
  fileCleanupQueue: Queue.Queue;
} | null = null;

function initQueues() {
  if (_queues) return _queues;

  const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
  const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
  const usesTls = REDIS_URL.startsWith("rediss://");

  if (!isDev() && !process.env.REDIS_URL) {
    throw new Error("REDIS_URL is required in production. Refusing to start.");
  }

  if (!isDev() && !usesTls) {
    logger.warn(
      "Bull queues are NOT using TLS Redis in production. Use rediss:// to enable encryption."
    );
  }

  const redisOpts: Record<string, unknown> = {
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
    ...(usesTls
      ? { tls: { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false" } }
      : {}),
    maxRetriesPerRequest: isDev() ? 1 : 3,
    retryStrategy: isDev()
      ? (times: number) => (times > 2 ? null : Math.min(times * 200, 2000))
      : (times: number) => Math.min(times * 200, 5000),
  };

  const queueOptions: QueueOptions = {
    redis: redisOpts as QueueOptions["redis"],
    createClient: (type) => {
      const { default: IORedis } = require("ioredis") as { default: typeof import("ioredis").default };
      const client = new IORedis(REDIS_URL, redisOpts as import("ioredis").RedisOptions);
      client.on("error", () => {});
      return client as unknown as Queue.Queue["client"];
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
    queue.on("error", (err) => {
      if (isDev()) return;
      logger.error("Queue %s error: %s", name, err.message);
    });
    queue.on("failed", (job, err) => logger.error("Job %s in queue %s failed: %s", job.id, name, err.message));
    return queue;
  }

  _queues = {
    emailQueue: createQueue("emails"),
    notificationQueue: createQueue("notifications"),
    paymentQueue: createQueue("payments"),
    fileCleanupQueue: createQueue("file-cleanup"),
  };

  return _queues;
}

export const emailQueue = new Proxy({} as Queue.Queue, {
  get(_, prop) { const q = initQueues().emailQueue; const v = (q as unknown as Record<string | symbol, unknown>)[prop]; return typeof v === "function" ? (v as Function).bind(q) : v; },
});
export const notificationQueue = new Proxy({} as Queue.Queue, {
  get(_, prop) { const q = initQueues().notificationQueue; const v = (q as unknown as Record<string | symbol, unknown>)[prop]; return typeof v === "function" ? (v as Function).bind(q) : v; },
});
export const paymentQueue = new Proxy({} as Queue.Queue, {
  get(_, prop) { const q = initQueues().paymentQueue; const v = (q as unknown as Record<string | symbol, unknown>)[prop]; return typeof v === "function" ? (v as Function).bind(q) : v; },
});
export const fileCleanupQueue = new Proxy({} as Queue.Queue, {
  get(_, prop) { const q = initQueues().fileCleanupQueue; const v = (q as unknown as Record<string | symbol, unknown>)[prop]; return typeof v === "function" ? (v as Function).bind(q) : v; },
});

export { startProcessors } from "./processors.js";
