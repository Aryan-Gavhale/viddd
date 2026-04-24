/**
 * PostgreSQL full-text search utilities.
 * Uses tsvector columns maintained by database triggers.
 */
import { pool } from "../db.js";
import type { DbRow } from "../types/index.js";

type SearchFilters = { category?: string };

/**
 * Sanitize user input for to_tsquery: strip tsquery metacharacters, keep
 * alphanumerics and spaces, then join terms with AND.
 */
export function sanitizeFtsQuery(query: string): string {
  return query
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" & ");
}

export async function searchGigsFTS(
  query: string,
  filters: SearchFilters = {},
  limit: number = 20,
  offset: number = 0
): Promise<{ results: DbRow[]; total: number }> {
  const tsQuery = sanitizeFtsQuery(query);
  if (!tsQuery) {
    return { results: [], total: 0 };
  }
  const params: unknown[] = [tsQuery, limit, offset];

  let categoryFilter = "";
  if (filters.category) {
    params.push(filters.category);
    categoryFilter = `AND g."category" = $${params.length}`;
  }

  const { rows: results } = await pool.query<DbRow>(
    `SELECT g.*, ts_rank(g.search_vector, to_tsquery('english', $1)) AS rank
     FROM "Gig" g
     WHERE g.search_vector @@ to_tsquery('english', $1)
       AND g."deletedAt" IS NULL
       AND g."status" = 'ACTIVE'
       ${categoryFilter}
     ORDER BY rank DESC
     LIMIT $2 OFFSET $3`,
    params
  );

  const countParams: unknown[] = [tsQuery];
  let countCategoryFilter = "";
  if (filters.category) {
    countParams.push(filters.category);
    countCategoryFilter = `AND g."category" = $${countParams.length}`;
  }

  const { rows: countResult } = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM "Gig" g
     WHERE g.search_vector @@ to_tsquery('english', $1)
       AND g."deletedAt" IS NULL AND g."status" = 'ACTIVE'
       ${countCategoryFilter}`,
    countParams
  );

  return { results, total: countResult[0]?.total ?? 0 };
}

export async function searchJobsFTS(
  query: string,
  _filters: SearchFilters = {},
  limit: number = 20,
  offset: number = 0
): Promise<{ results: DbRow[]; total: number }> {
  const tsQuery = sanitizeFtsQuery(query);
  if (!tsQuery) {
    return { results: [], total: 0 };
  }

  const { rows: results } = await pool.query<DbRow>(
    `SELECT j.*, ts_rank(j.search_vector, to_tsquery('english', $1)) AS rank
     FROM "Job" j
     WHERE j.search_vector @@ to_tsquery('english', $1)
       AND j."deletedAt" IS NULL
       AND j."status" = 'OPEN'
     ORDER BY rank DESC
     LIMIT $2 OFFSET $3`,
    [tsQuery, limit, offset]
  );

  const { rows: countResult } = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM "Job" j
     WHERE j.search_vector @@ to_tsquery('english', $1)
       AND j."deletedAt" IS NULL AND j."status" = 'OPEN'`,
    [tsQuery]
  );

  return { results, total: countResult[0]?.total ?? 0 };
}

export async function searchFreelancersFTS(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ results: DbRow[]; total: number }> {
  const tsQuery = sanitizeFtsQuery(query);
  if (!tsQuery) {
    return { results: [], total: 0 };
  }

  const { rows: results } = await pool.query<DbRow>(
    `SELECT fp.*, u."firstname", u."lastname", u."profilePicture", u."country",
            ts_rank(fp.search_vector, to_tsquery('english', $1)) AS rank
     FROM "FreelancerProfile" fp
     JOIN "User" u ON u."id" = fp.user_id
     WHERE fp.search_vector @@ to_tsquery('english', $1)
       AND u."isActive" = true
     ORDER BY rank DESC
     LIMIT $2 OFFSET $3`,
    [tsQuery, limit, offset]
  );

  const { rows: countResult } = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM "FreelancerProfile" fp
     JOIN "User" u ON u."id" = fp.user_id
     WHERE fp.search_vector @@ to_tsquery('english', $1) AND u."isActive" = true`,
    [tsQuery]
  );

  return { results, total: countResult[0]?.total ?? 0 };
}
