/**
 * Cursor-based pagination utility for raw SQL queries.
 *
 * `cursorField` must reference a **UNIQUE** column (e.g. primary key `id`). Non-unique
 * fields can produce duplicate or skipped rows when paginating. Prefer stable
 * monotonic fields like `id` or a dedicated cursor column.
 *
 * Usage:
 *   const pag = parseCursorPagination(request.query);
 *   // Use pag.limit, pag.cursor, pag.direction, pag.cursorField in your SQL
 */
import type { CursorPaginationOpts, CursorPaginationResult, OffsetPaginationResult } from "../types/index.js";

export function parseCursorPagination(
  query: Record<string, string | string[] | undefined>,
  { defaultLimit = 20, maxLimit = 100, cursorField = "id" }: CursorPaginationOpts = {}
): CursorPaginationResult {
  const limit = Math.min(Math.max(parseInt(String(query.limit), 10) || defaultLimit, 1), maxLimit);
  const raw = query.cursor;
  const cursor = raw != null && raw !== "" ? parseInt(String(Array.isArray(raw) ? raw[0] : raw), 10) : null;
  const parsedCursor = cursor != null && !Number.isNaN(cursor) ? cursor : null;
  const direction: "next" | "prev" = query.direction === "prev" ? "prev" : "next";

  return { limit, cursor: parsedCursor, direction, cursorField };
}

export function parseOffsetPagination(
  query: Record<string, string | string[] | undefined>,
  { defaultLimit = 10, maxLimit = 100 }: Pick<CursorPaginationOpts, "defaultLimit" | "maxLimit"> = {}
): OffsetPaginationResult {
  const page = Math.max(parseInt(String(query.page), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(query.limit), 10) || defaultLimit, 1), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
