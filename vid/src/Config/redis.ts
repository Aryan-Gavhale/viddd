import { Redis } from "ioredis";
import logger from "../Utils/logger.js";

let redisClient: Redis;
let redisAvailable = false;
let initialized = false;

function getRedis(): Redis {
  if (initialized) return redisClient;
  initialized = true;

  const RAW_URL = process.env.REDIS_URL;
  const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev && !RAW_URL) {
    throw new Error("REDIS_URL is required in production. Refusing to start.");
  }

  const REDIS_URL = RAW_URL || "redis://localhost:6379";
  const usesTls = REDIS_URL.startsWith("rediss://");

  if (!isDev && !usesTls) {
    logger.warn("Redis connection is NOT using TLS in production. Use rediss:// to enable encryption.");
  }

  try {
    redisClient = new Redis(REDIS_URL, {
      password: REDIS_PASSWORD || undefined,
      tls: usesTls ? { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false" } : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (isDev && times > 3) return null as unknown as number;
        return Math.min(times * 200, 5000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      if (redisAvailable) logger.error("Redis Client Error: %s", err.message);
      redisAvailable = false;
    });
    redisClient.on("ready", () => {
      redisAvailable = true;
      logger.info("Redis connected (tls=%s, auth=%s)", usesTls, Boolean(REDIS_PASSWORD));
    });

    redisClient.connect().catch((err) => {
      if (isDev) {
        logger.warn("Redis unavailable in dev mode — running without Redis. Error: %s", (err as Error).message);
      } else {
        logger.error("Redis connection failed: %s", (err as Error).message);
      }
    });
  } catch (err) {
    logger.warn("Redis init failed — creating stub: %s", (err as Error).message);
    redisClient = new Redis({ lazyConnect: true, enableOfflineQueue: false });
  }

  return redisClient;
}

const redisProxy = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedis();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === "function") return val.bind(client);
    return val;
  },
});

export { redisProxy as redisClient, redisAvailable };
export default redisProxy;
