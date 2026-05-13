/**
 * Raw PostgreSQL connection pool and query helpers.
 * Replaces Prisma ORM throughout the application.
 *
 * Pool creation is deferred to connectDB() so that dotenv has loaded
 * process.env.DATABASE_URL before the Pool constructor reads it.
 */
import pg from "pg";
import fs from "fs";
import logger from "./Utils/logger.js";
import type { PoolClient } from "pg";
import type { DbRow, TxQueryFn, TxOneFn } from "./types/index.js";

const { Pool, types } = pg;

types.setTypeParser(1700, (val: string) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return val;
  return n;
});

let pool: InstanceType<typeof Pool>;

function getPool(): InstanceType<typeof Pool> {
  if (!pool) {
    const POOL_MAX = parseInt(process.env.DB_POOL_MAX || "20", 10);
    const POOL_MIN = parseInt(process.env.DB_POOL_MIN || "2", 10);
    const STATEMENT_TIMEOUT_MS = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || "30000", 10);
    const IDLE_TX_TIMEOUT_MS = parseInt(process.env.DB_IDLE_TX_TIMEOUT_MS || "60000", 10);

    const dbUrl = process.env.DATABASE_URL || "";
    const needsSsl =
      /sslmode=require/.test(dbUrl) ||
      dbUrl.includes(".neon.tech") ||
      process.env.DATABASE_SSL === "true";

    // Strict TLS in production:
    //   - default `rejectUnauthorized: true`
    //   - optionally pin a CA via DATABASE_SSL_CA (PEM literal) or
    //     DATABASE_SSL_CA_PATH (file containing the PEM)
    //   - operators can opt out with DATABASE_SSL_REJECT_UNAUTHORIZED="false"
    //     ONLY for genuinely self-signed staging environments.
    let ssl: false | { rejectUnauthorized: boolean; ca?: string } = false;
    if (needsSsl) {
      const inProd = process.env.NODE_ENV === "production";
      const rejectUnauthEnv = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
      const rejectUnauthorized = inProd
        ? rejectUnauthEnv !== "false"
        : rejectUnauthEnv === "true";

      let ca: string | undefined;
      if (process.env.DATABASE_SSL_CA) {
        ca = process.env.DATABASE_SSL_CA;
      } else if (process.env.DATABASE_SSL_CA_PATH) {
        try {
          ca = fs.readFileSync(process.env.DATABASE_SSL_CA_PATH, "utf8");
        } catch (e) {
          throw new Error(`Failed to read DATABASE_SSL_CA_PATH: ${(e as Error).message}`);
        }
      }

      if (inProd && !rejectUnauthorized && !ca) {
        logger.warn(
          "DATABASE_SSL_REJECT_UNAUTHORIZED=false in production — Postgres TLS is not verified. Pin a CA via DATABASE_SSL_CA or DATABASE_SSL_CA_PATH for a hardened deployment."
        );
      }

      ssl = ca ? { rejectUnauthorized, ca } : { rejectUnauthorized };
    }

    pool = new Pool({
      connectionString: dbUrl,
      max: POOL_MAX,
      min: POOL_MIN,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      application_name: "vidlancing-api",
      ...(ssl ? { ssl } : {}),
    });

    pool.on("error", (err) => {
      logger.error("Unexpected pg pool error: %s", err.message);
    });

    pool.on("connect", (client) => {
      client
        .query(
          `SET statement_timeout = ${STATEMENT_TIMEOUT_MS};
           SET idle_in_transaction_session_timeout = ${IDLE_TX_TIMEOUT_MS};
           SET lock_timeout = 5000;`
        )
        .catch((e) => logger.warn("Failed to set per-connection timeouts: %s", (e as Error).message));
    });
  }
  return pool;
}

// ─── Core query helpers ───

export async function sql(text: string, params: unknown[] = []): Promise<DbRow[]> {
  const { rows } = await getPool().query(text, params);
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
  const client = await getPool().connect();
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
  const p = getPool();
  const client = await p.connect();
  client.release();
  logger.info("Connected to PostgreSQL via pg Pool.");
}

export async function disconnectDB(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info("PostgreSQL pool closed.");
  }
}

export { pool };
export default { sql, sqlOne, sqlCount, withTransaction, txSql, txOne, get pool() { return getPool(); }, connectDB, disconnectDB };
