import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount } from "../db.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

const ENTITY_TYPES = ["GIG", "FREELANCER", "JOB"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

function qs(q: Record<string, string | string[] | undefined>, key: string, fallback: string) {
  const v = q[key];
  if (v == null) return fallback;
  return Array.isArray(v) ? v[0] ?? fallback : v;
}

function normalizeEntityType(raw: unknown): EntityType | null {
  const t = String(raw || "").trim().toUpperCase();
  if (t === "EDITOR") return "FREELANCER";
  if (t === "SERVICE") return "GIG";
  return ENTITY_TYPES.includes(t as EntityType) ? (t as EntityType) : null;
}

async function assertEntityExists(entityType: EntityType, entityId: number) {
  if (entityType === "GIG") {
    const row = await sqlOne(
      `SELECT id FROM "Gig"
        WHERE id = $1 AND "deletedAt" IS NULL AND status = 'ACTIVE'::"GigStatus"`,
      [entityId]
    );
    if (!row) throw new ApiError(404, "Gig not found or not published");
    return;
  }

  if (entityType === "FREELANCER") {
    const row = await sqlOne(
      `SELECT u.id
         FROM "User" u
         JOIN "FreelancerProfile" fp ON fp."user_id" = u.id
        WHERE u.id = $1
          AND u.role = 'FREELANCER'
          AND u."isActive" = true
          AND u."isProfileComplete" = true`,
      [entityId]
    );
    if (!row) throw new ApiError(404, "Editor profile not found or not published");
    return;
  }

  const row = await sqlOne(
    `SELECT id FROM "Job"
      WHERE id = $1 AND "deletedAt" IS NULL AND status = 'OPEN'::"JobStatus"`,
    [entityId]
  );
  if (!row) throw new ApiError(404, "Job not found or no longer open");
}

function buildGigMap(rows: DbRow[]) {
  return new Map(
    rows.map((g) => [
      Number(g.id),
      {
        id: Number(g.id),
        type: "GIG",
        title: g.title,
        subtitle: `${g.f_fn || ""} ${g.f_ln || ""}`.trim() || "Video editing service",
        image: g.thumbnailUrl || null,
        href: `/gigs/${g.id}`,
        meta: {
          category: g.category,
          pricing: g.pricing,
          seller: { firstname: g.f_fn, lastname: g.f_ln, profilePicture: g.f_pp },
        },
      },
    ])
  );
}

function buildFreelancerMap(rows: DbRow[]) {
  return new Map(
    rows.map((f) => [
      Number(f.id),
      {
        id: Number(f.id),
        type: "FREELANCER",
        title: `${f.firstname || ""} ${f.lastname || ""}`.trim() || `Editor #${f.id}`,
        subtitle: f.jobTitle || "Video editor",
        image: f.profilePicture || null,
        href: `/freelancers/${f.id}`,
        meta: {
          rating: f.rating == null ? null : Number(f.rating),
          skills: f.skills || [],
          minimumRate: f.minimumRate == null ? null : Number(f.minimumRate),
          maximumRate: f.maximumRate == null ? null : Number(f.maximumRate),
        },
      },
    ])
  );
}

function buildJobMap(rows: DbRow[]) {
  return new Map(
    rows.map((j) => [
      Number(j.id),
      {
        id: Number(j.id),
        type: "JOB",
        title: j.title,
        subtitle: j.company || "Open project",
        image: null,
        href: `/jobs/${j.id}`,
        meta: {
          budgetMin: j.budgetMin == null ? null : Number(j.budgetMin),
          budgetMax: j.budgetMax == null ? null : Number(j.budgetMax),
          deadline: j.deadline,
          status: j.status,
        },
      },
    ])
  );
}

async function hydrateSavedRows(savedRows: DbRow[]) {
  const idsByType = new Map<EntityType, number[]>();
  for (const row of savedRows) {
    const type = normalizeEntityType(row.entityType);
    if (!type) continue;
    idsByType.set(type, [...(idsByType.get(type) || []), Number(row.entityId)]);
  }

  const [gigRows, freelancerRows, jobRows] = await Promise.all([
    idsByType.get("GIG")?.length
      ? sql(
          `SELECT g.id, g.title, g."thumbnailUrl", g.category, g.pricing,
                  u.firstname AS f_fn, u.lastname AS f_ln, u."profilePicture" AS f_pp
             FROM "Gig" g
             JOIN "FreelancerProfile" fp ON fp.id = g.freelancer_id
             JOIN "User" u ON u.id = fp."user_id"
            WHERE g.id = ANY($1::int[])
              AND g."deletedAt" IS NULL
              AND g.status = 'ACTIVE'::"GigStatus"`,
          [idsByType.get("GIG")]
        )
      : [],
    idsByType.get("FREELANCER")?.length
      ? sql(
          `SELECT u.id, u.firstname, u.lastname, u."profilePicture", u.rating,
                  fp."jobTitle", fp.skills, fp."minimumRate", fp."maximumRate"
             FROM "User" u
             JOIN "FreelancerProfile" fp ON fp."user_id" = u.id
            WHERE u.id = ANY($1::int[])
              AND u.role = 'FREELANCER'
              AND u."isActive" = true
              AND u."isProfileComplete" = true`,
          [idsByType.get("FREELANCER")]
        )
      : [],
    idsByType.get("JOB")?.length
      ? sql(
          `SELECT id, title, company, "budgetMin", "budgetMax", deadline, status::text AS status
             FROM "Job"
            WHERE id = ANY($1::int[])
              AND "deletedAt" IS NULL`,
          [idsByType.get("JOB")]
        )
      : [],
  ]);

  const maps = {
    GIG: buildGigMap(gigRows),
    FREELANCER: buildFreelancerMap(freelancerRows),
    JOB: buildJobMap(jobRows),
  };

  return savedRows
    .map((row) => {
      const type = normalizeEntityType(row.entityType);
      if (!type) return null;
      const item = maps[type].get(Number(row.entityId));
      if (!item) return null;
      return {
        id: Number(row.id),
        entityType: type,
        entityId: Number(row.entityId),
        note: row.note || null,
        createdAt: row.createdAt,
        item,
      };
    })
    .filter(Boolean);
}

const listSavedItems: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const entityType = normalizeEntityType(req.query.entityType);
    const page = Math.max(1, parseInt(qs(req.query, "page", "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(qs(req.query, "limit", "12"), 10) || 12));
    const offset = (page - 1) * limit;

    const params: unknown[] = [req.user.id];
    const where = [`"user_id" = $1`];
    if (entityType) {
      params.push(entityType);
      where.push(`"entityType" = $${params.length}`);
    }
    const whereSql = where.join(" AND ");

    const [rows, total] = await Promise.all([
      sql(
        `SELECT * FROM "SavedItem"
          WHERE ${whereSql}
          ORDER BY "createdAt" DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      sqlCount(`SELECT count(*)::int AS count FROM "SavedItem" WHERE ${whereSql}`, params),
    ]);

    const items = await hydrateSavedRows(rows);
    return res.status(200).json(
      new ApiResponse(
        200,
        { items, total, page, limit, totalPages: Math.ceil(total / limit) },
        "Saved items retrieved"
      )
    );
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    const e = error as Error;
    logger.error(`listSavedItems: ${e.message}\n${e.stack}`);
    return next(new ApiError(500, `Failed to retrieve saved items: ${e.message}`));
  }
};

const getSavedSummary: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const rows = await sql(
      `SELECT "entityType", count(*)::int AS count
         FROM "SavedItem"
        WHERE "user_id" = $1
        GROUP BY "entityType"`,
      [req.user.id]
    );
    const byType = { GIG: 0, FREELANCER: 0, JOB: 0 };
    for (const row of rows) {
      const type = normalizeEntityType(row.entityType);
      if (type) byType[type] = Number(row.count);
    }
    const total = byType.GIG + byType.FREELANCER + byType.JOB;
    return res
      .status(200)
      .json(new ApiResponse(200, { total, byType }, "Saved items summary"));
  } catch (error) {
    const e = error as Error;
    logger.error(`getSavedSummary: ${e.message}`);
    return next(new ApiError(500, `Failed to retrieve saved summary: ${e.message}`));
  }
};

const createSavedItem: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const body = (req.body || {}) as Record<string, unknown>;
    const entityType = normalizeEntityType(body.entityType);
    const entityId = Number(body.entityId);
    if (!entityType || !Number.isInteger(entityId) || entityId <= 0) {
      return next(new ApiError(400, "Valid entityType and entityId are required"));
    }

    await assertEntityExists(entityType, entityId);
    const row = await sqlOne(
      `INSERT INTO "SavedItem" ("user_id", "entityType", "entityId", note, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT ("user_id", "entityType", "entityId")
       DO UPDATE SET note = COALESCE(EXCLUDED.note, "SavedItem".note), "updatedAt" = NOW()
       RETURNING *`,
      [req.user.id, entityType, entityId, body.note ? String(body.note).slice(0, 500) : null]
    );
    const [item] = await hydrateSavedRows(row ? [row] : []);
    return res.status(201).json(new ApiResponse(201, item, "Item saved"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    const e = error as Error;
    logger.error(`createSavedItem: ${e.message}\n${e.stack}`);
    return next(new ApiError(500, `Failed to save item: ${e.message}`));
  }
};

const deleteSavedByEntity: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const entityType = normalizeEntityType(req.params.entityType);
    const entityId = Number(req.params.entityId);
    if (!entityType || !Number.isInteger(entityId)) {
      return next(new ApiError(400, "Valid entityType and entityId are required"));
    }
    await sql(
      `DELETE FROM "SavedItem"
        WHERE "user_id" = $1 AND "entityType" = $2 AND "entityId" = $3`,
      [req.user.id, entityType, entityId]
    );
    return res.status(200).json(new ApiResponse(200, { entityType, entityId }, "Item removed"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    const e = error as Error;
    logger.error(`deleteSavedByEntity: ${e.message}`);
    return next(new ApiError(500, `Failed to remove saved item: ${e.message}`));
  }
};

const deleteSavedById: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const savedItemId = Number(req.params.savedItemId);
    if (!Number.isInteger(savedItemId)) return next(new ApiError(400, "Invalid saved item id"));
    await sql(`DELETE FROM "SavedItem" WHERE id = $1 AND "user_id" = $2`, [
      savedItemId,
      req.user.id,
    ]);
    return res.status(200).json(new ApiResponse(200, { id: savedItemId }, "Item removed"));
  } catch (error) {
    const e = error as Error;
    logger.error(`deleteSavedById: ${e.message}`);
    return next(new ApiError(500, `Failed to remove saved item: ${e.message}`));
  }
};

export {
  listSavedItems,
  getSavedSummary,
  createSavedItem,
  deleteSavedByEntity,
  deleteSavedById,
};
