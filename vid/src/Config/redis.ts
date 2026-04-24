import { Redis } from "ioredis";
import logger from "../Utils/logger.js";

const RAW_URL = process.env.REDIS_URL;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

if (process.env.NODE_ENV === "production" && !RAW_URL) {
  throw new Error("REDIS_URL is required in production. Refusing to start.");
}

const REDIS_URL = RAW_URL || "redis://localhost:6379";
const usesTls = REDIS_URL.startsWith("rediss://");

if (process.env.NODE_ENV === "production" && !usesTls) {
  logger.warn("Redis connection is NOT using TLS in production. Use rediss:// to enable encryption.");
}

const redisClient = new Redis(REDIS_URL, {
  password: REDIS_PASSWORD || undefined,
  tls: usesTls ? { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false" } : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 200, 5000),
  enableOfflineQueue: false,
  lazyConnect: false,
});

redisClient.on("error", (err) => {
  logger.error("Redis Client Error: %s", err.message);
});
redisClient.on("connect", () => {
  logger.info("Redis connected (tls=%s, auth=%s)", usesTls, Boolean(REDIS_PASSWORD));
});

export { redisClient };
export default redisClient;
