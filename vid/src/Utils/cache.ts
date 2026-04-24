import redisClient from "../Config/redis.js";
import logger from "./logger.js";

const DEFAULT_TTL = 120; // 2 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (redisClient.status !== "ready") return null;
    const val = await redisClient.get(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, data: unknown, ttl = DEFAULT_TTL): Promise<void> {
  try {
    if (redisClient.status !== "ready") return;
    await redisClient.set(key, JSON.stringify(data), "EX", ttl);
  } catch (err) {
    logger.warn("Cache set failed for %s: %s", key, (err as Error).message);
  }
}

export async function cacheDel(pattern: string): Promise<void> {
  try {
    if (redisClient.status !== "ready") return;
    const stream = redisClient.scanStream({ match: pattern, count: 100 });
    const pipeline = redisClient.pipeline();
    let count = 0;
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (keys: string[]) => {
        for (const key of keys) {
          pipeline.del(key);
          count++;
        }
      });
      stream.on("end", () => {
        if (count > 0) pipeline.exec().then(() => resolve()).catch(reject);
        else resolve();
      });
      stream.on("error", reject);
    });
  } catch (err) {
    logger.warn("Cache del failed for %s: %s", pattern, (err as Error).message);
  }
}
