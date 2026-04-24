/**
 * Raw PostgreSQL connection pool and query helpers.
 * Replaces Prisma ORM throughout the application.
 */
import pg from "pg";
import logger from "./Utils/logger.js";
import type { PoolClient } from "pg";
import type { DbRow, TxQueryFn, TxOneFn } from "./types/index.js";

const { Pool, types } = pg;

types.setTypeParser(1700, (val: string) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return val;
  return n;
});

/**
 * FIX M4: increase max connections; behind PgBouncer (recommended for prod),
 *         set DB_POOL_MAX low (e.g. 10) since PgBouncer fans out the work.
 * FIX M6: enforce statement_timeout + idle_in_transaction_session_timeout per
 *         connection so a single runaway query cannot lock up the pool.
 */
const POOL_MAX = parseInt(process.env.DB_POOL_MAX || "20", 10);
const POOL_MIN = parseInt(process.env.DB_POOL_MIN || "2", 10);
const STATEMENT_TIMEOUT_MS = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || "30000", 10);
const IDLE_TX_TIMEOUT_MS = parseInt(process.env.DB_IDLE_TX_TIMEOUT_MS || "60000", 10);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_MAX,
  min: POOL_MIN,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  application_name: "vidlancing-api",
});

pool.on("error", (err) => {
  logger.error("Unexpected pg pool error: %s", err.message);
});

pool.on("connect", (client) => {
  // Apply per-connection timeouts so any long query is killed instead of pinning the pool.
  client
    .query(
      `SET statement_timeout = ${STATEMENT_TIMEOUT_MS};
       SET idle_in_transaction_session_timeout = ${IDLE_TX_TIMEOUT_MS};
       SET lock_timeout = 5000;`
    )
    .catch((e) => logger.warn("Failed to set per-connection timeouts: %s", (e as Error).message));
});

// ─── Core query helpers ───

export async function sql(text: string, params: unknown[] = []): Promise<DbRow[]> {
  const { rows } = await pool.query(text, params);
  return rows;
}

export async function sqlOne(text: string, params: unknown[] = []): Promise<DbRow | null> {
  const rows = await sql(text, params);
  return rows[0] || null;
}

export async function sqlCount(text: string, params: unknown[] = []): Promise<number> {
  const rows = await sql(text, params);
  return parseInt(String(rows[0]?.count ?? 0));
}

// ─── Transaction helper ───

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export function txSql(client: PoolClient): TxQueryFn {
  return async (text: string, params: unknown[] = []) => {
    const { rows } = await client.query(text, params);
    return rows;
  };
}

export function txOne(client: PoolClient): TxOneFn {
  return async (text: string, params: unknown[] = []) => {
    const { rows } = await client.query(text, params);
    return rows[0] || null;
  };
}

// ─── Soft-delete models ───
export const SOFT_DELETE_MODELS = new Set(["Gig", "Job", "Order", "Review", "Message"]);

// ─── Lifecycle ───

export async function connectDB(): Promise<void> {
  const client = await pool.connect();
  client.release();
  logger.info("Connected to PostgreSQL via pg Pool.");
}

export async function disconnectDB(): Promise<void> {
  await pool.end();
  logger.info("PostgreSQL pool closed.");
}

export { pool };
export default { sql, sqlOne, sqlCount, withTransaction, txSql, txOne, pool, connectDB, disconnectDB };
