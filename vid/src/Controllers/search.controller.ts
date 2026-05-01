import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlCount } from "../db.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { DbRow } from "../types/index.js";

type ControllerHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

function qs(
  q: Record<string, string | string[] | undefined>,
  key: string,
  defaultVal: string
): string {
  const v = q[key];
  if (v === undefined) return defaultVal;
  return Array.isArray(v) ? (v[0] ?? defaultVal) : v;
}

const searchGigs: ControllerHandler = async (req, res, next) => {
  try {
    const { category, search, deliveryTime, rating } = req.query;
    const page = qs(req.query, "page", "1");
    const limit = qs(req.query, "limit", "20");
    const sortBy = qs(req.query, "sortBy", "createdAt");
    const sortOrder = qs(req.query, "sortOrder", "desc");
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const allowedSortCols = ["createdAt", "title", "deliveryTime"];
    const safeSort = allowedSortCols.includes(sortBy) ? `"${sortBy}"` : `"createdAt"`;
    const safeDir = sortOrder === "asc" ? "ASC" : "DESC";

    const whereParts = [`g."status" = 'ACTIVE'`, `g."deletedAt" IS NULL`];
    const params: unknown[] = [];
    let p = 1;

    if (category) {
      const c = Array.isArray(category) ? category[0] : category;
      whereParts.push(`$${p} = ANY(g."category")`);
      params.push(c);
      p++;
    }
    if (search) {
      const s = Array.isArray(search) ? search[0] : search;
      if (s && s.trim().length > 0) {
        whereParts.push(`g."search_vector" @@ plainto_tsquery('english', $${p})`);
        params.push(s);
        p++;
      }
    }
    if (deliveryTime) {
      const dt = Array.isArray(deliveryTime) ? deliveryTime[0] : deliveryTime;
      whereParts.push(`g."deliveryTime" <= $${p}`);
      params.push(parseInt(String(dt), 10));
      p++;
    }
    if (rating) {
      const rt = Array.isArray(rating) ? rating[0] : rating;
      whereParts.push(`fp."rating" >= $${p}`);
      params.push(parseFloat(String(rt)));
      p++;
    }

    const whereClause = whereParts.join(" AND ");
    const countParams = [...params];
    params.push(lim, skip);

    const gigsQuery = `
      SELECT g.*, u."firstname", u."lastname", fp."rating" AS "freelancerRating"
      FROM "Gig" g
      JOIN "FreelancerProfile" fp ON fp."id" = g."freelancer_id"
      JOIN "User" u ON u."id" = fp."user_id"
      WHERE ${whereClause}
      ORDER BY g.${safeSort} ${safeDir}
      LIMIT $${p} OFFSET $${p + 1}`;

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM "Gig" g
      JOIN "FreelancerProfile" fp ON fp."id" = g."freelancer_id"
      WHERE ${whereClause}`;

    const [gigs, total] = await Promise.all([
      sql(gigsQuery, params) as Promise<DbRow[]>,
      sqlCount(countQuery, countParams),
    ]);

    if (gigs.length > 0) {
      const gigIds = gigs.map((g) => g.id as number);
      const media = (await sql(
        `SELECT * FROM "GigSampleMedia" WHERE "gig_id" = ANY($1::int[])`,
        [gigIds]
      )) as DbRow[];
      const mediaMap: Record<number, DbRow[]> = {};
      for (const m of media) {
        const gid = m.gig_id as number;
        (mediaMap[gid] ??= []).push(m);
      }
      for (const g of gigs) {
        const gid = g.id as number;
        g.sampleMedia = mediaMap[gid] || [];
        g.freelancer = { rating: g.freelancerRating, user: { firstname: g.firstname, lastname: g.lastname } };
        delete g.freelancerRating;
        delete g.firstname;
        delete g.lastname;
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          gigs,
          total,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "Gigs search results retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error searching gigs: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to search gigs"));
  }
};

const searchFreelancers: ControllerHandler = async (req, res, next) => {
  try {
    const { skills, minRate, maxRate, availabilityStatus, rating, location, search } = req.query;
    const page = qs(req.query, "page", "1");
    const limit = qs(req.query, "limit", "20");
    const sortBy = qs(req.query, "sortBy", "rating");
    const sortOrder = qs(req.query, "sortOrder", "desc");
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const allowedSortCols = ["rating", "createdAt", "minimumRate"];
    const safeSort = allowedSortCols.includes(sortBy) ? `fp."${sortBy}"` : `fp."rating"`;
    const safeDir = sortOrder === "asc" ? "ASC" : "DESC";

    const whereParts = [`u."isActive" = true`];
    const params: unknown[] = [];
    let p = 1;

    if (skills) {
      const sk = skills;
      const skillArray = Array.isArray(sk) ? sk : [sk];
      whereParts.push(`fp."skills" @> $${p}::text[]`);
      params.push(skillArray);
      p++;
    }
    if (minRate) {
      const mr = Array.isArray(minRate) ? minRate[0] : minRate;
      whereParts.push(`fp."minimumRate" >= $${p}`);
      params.push(parseFloat(String(mr)));
      p++;
    }
    if (maxRate) {
      const mr = Array.isArray(maxRate) ? maxRate[0] : maxRate;
      whereParts.push(`fp."maximumRate" <= $${p}`);
      params.push(parseFloat(String(mr)));
      p++;
    }
    if (availabilityStatus) {
      const av = Array.isArray(availabilityStatus) ? availabilityStatus[0] : availabilityStatus;
      whereParts.push(`fp."availabilityStatus" = $${p}`);
      params.push(av);
      p++;
    }
    if (rating) {
      const rt = Array.isArray(rating) ? rating[0] : rating;
      whereParts.push(`fp."rating" >= $${p}`);
      params.push(parseFloat(String(rt)));
      p++;
    }
    if (location) {
      const loc = Array.isArray(location) ? location[0] : location;
      whereParts.push(`u."country" ILIKE $${p}`);
      params.push(loc);
      p++;
    }
    if (search) {
      const s = Array.isArray(search) ? search[0] : search;
      if (s && s.trim().length > 0) {
        whereParts.push(`fp."search_vector" @@ plainto_tsquery('english', $${p})`);
        params.push(s);
        p++;
      }
    }

    const whereClause = whereParts.join(" AND ");
    const countParams = [...params];
    params.push(lim, skip);

    const freelancersQuery = `
      SELECT fp.*, u."firstname", u."lastname", u."country", u."profilePicture"
      FROM "FreelancerProfile" fp
      JOIN "User" u ON u."id" = fp."user_id"
      WHERE ${whereClause}
      ORDER BY ${safeSort} ${safeDir}
      LIMIT $${p} OFFSET $${p + 1}`;

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM "FreelancerProfile" fp
      JOIN "User" u ON u."id" = fp."user_id"
      WHERE ${whereClause}`;

    const [freelancers, total] = await Promise.all([
      sql(freelancersQuery, params) as Promise<DbRow[]>,
      sqlCount(countQuery, countParams),
    ]);

    for (const f of freelancers) {
      f.user = {
        firstname: f.firstname,
        lastname: f.lastname,
        country: f.country,
        profilePicture: f.profilePicture,
      };
      delete f.firstname;
      delete f.lastname;
      delete f.country;
      delete f.profilePicture;
    }

    if (freelancers.length > 0) {
      const fpIds = freelancers.map((f) => f.id as number);
      const videos = (await sql(
        `SELECT * FROM "PortfolioVideo" WHERE "freelancer_id" = ANY($1::int[]) ORDER BY "id" ASC`,
        [fpIds]
      )) as DbRow[];
      const vidMap: Record<number, DbRow[]> = {};
      for (const v of videos) {
        const fid = v.freelancer_id as number;
        const arr = (vidMap[fid] ??= []);
        if (arr.length < 3) arr.push(v);
      }
      for (const f of freelancers) {
        f.portfolioVideos = vidMap[f.id as number] || [];
      }
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          freelancers,
          total,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "Freelancers search results retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error searching freelancers: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to search freelancers"));
  }
};

/**
 * Unified search suggestions for the navbar typeahead. Returns at most
 * `limit` results from each of: gigs, freelancers, jobs — chosen by full-text
 * match on title/skills/etc. Falls back to ILIKE when the FTS index isn't
 * primed for the term. Public — no auth required so the homepage navbar
 * works for anonymous visitors.
 */
const searchSuggestions: ControllerHandler = async (req, res, next) => {
  try {
    const raw = qs(req.query, "q", "").trim();
    const limit = Math.min(8, Math.max(1, parseInt(qs(req.query, "limit", "5"), 10) || 5));
    if (raw.length < 2) {
      return res.status(200).json(
        new ApiResponse(200, { gigs: [], freelancers: [], jobs: [] }, "Type at least 2 characters")
      );
    }
    const like = `%${raw}%`;

    const [gigs, freelancers, jobs] = await Promise.all([
      sql(
        `SELECT g.id, g.title, g."thumbnailUrl", g.pricing,
                u.firstname AS f_fn, u.lastname AS f_ln, u."profilePicture" AS f_pp
           FROM "Gig" g
           JOIN "FreelancerProfile" fp ON fp.id = g."freelancer_id"
           JOIN "User" u ON u.id = fp."user_id"
          WHERE g."status" = 'ACTIVE'::"GigStatus"
            AND g."deletedAt" IS NULL
            AND (g."title" ILIKE $1 OR g."description" ILIKE $1 OR g."category" ILIKE $1)
          ORDER BY g."views" DESC, g."createdAt" DESC
          LIMIT $2`,
        [like, limit]
      ),
      sql(
        `SELECT u.id, u.firstname, u.lastname, u."profilePicture", u."rating",
                fp."jobTitle", fp."skills"
           FROM "User" u
           JOIN "FreelancerProfile" fp ON fp."user_id" = u.id
          WHERE u."role" = 'FREELANCER'
            AND u."isActive" = true
            AND u."isProfileComplete" = true
            AND (u."firstname" ILIKE $1 OR u."lastname" ILIKE $1
                 OR fp."jobTitle" ILIKE $1
                 OR EXISTS (SELECT 1 FROM unnest(fp."skills") s WHERE s ILIKE $1))
          ORDER BY u."rating" DESC NULLS LAST, u."createdAt" DESC
          LIMIT $2`,
        [like, limit]
      ),
      sql(
        `SELECT j.id, j.title, j."budgetMin", j."budgetMax",
                j."status"::text AS status, j."deadline"
           FROM "Job" j
          WHERE j."status" = 'OPEN'::"JobStatus"
            AND j."deletedAt" IS NULL
            AND (j."title" ILIKE $1 OR j."description" ILIKE $1)
          ORDER BY j."createdAt" DESC
          LIMIT $2`,
        [like, limit]
      ),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          gigs: gigs.map((g) => ({
            id: Number(g.id),
            title: g.title,
            thumbnailUrl: g.thumbnailUrl,
            pricing: g.pricing,
            freelancer: {
              firstname: g.f_fn,
              lastname: g.f_ln,
              profilePicture: g.f_pp,
            },
          })),
          freelancers: freelancers.map((f) => ({
            id: Number(f.id),
            firstname: f.firstname,
            lastname: f.lastname,
            profilePicture: f.profilePicture,
            rating: f.rating == null ? null : Number(f.rating),
            jobTitle: f.jobTitle,
            skills: f.skills,
          })),
          jobs: jobs.map((j) => ({
            id: Number(j.id),
            title: j.title,
            budgetMin: j.budgetMin == null ? null : Number(j.budgetMin),
            budgetMax: j.budgetMax == null ? null : Number(j.budgetMax),
            status: j.status,
            deadline: j.deadline,
          })),
        },
        "Search suggestions"
      )
    );
  } catch (error) {
    const e = error as Error;
    logger.error(`Error in search suggestions: ${e.message}\n${e.stack}`);
    return next(new ApiError(500, `Search suggestions failed: ${e.message}`));
  }
};

export { searchGigs, searchFreelancers, searchSuggestions };
