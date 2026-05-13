// src/controllers/reviewController.js
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount } from "../db.js";
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

/**
 * FIX M7: a review marked isAnonymous must NOT leak the client's real name
 * back through any list/detail endpoint. Strip it server-side, regardless of
 * what the frontend chooses to render.
 */
function anonymizeClient(
  client: { firstname?: unknown; lastname?: unknown; id?: unknown } | null | undefined,
  isAnonymous: unknown
) {
  if (!client) return client;
  if (isAnonymous) {
    return { firstname: "Anonymous", lastname: "" };
  }
  return { firstname: client.firstname, lastname: client.lastname };
}

async function refreshFreelancerRating(freelancerProfileId: number) {
  const row = (await sqlOne(
    `SELECT COALESCE(AVG(rating::float8), 0) AS "avg" FROM "Review"
     WHERE freelancer_id = $1 AND "deletedAt" IS NULL`,
    [freelancerProfileId]
  )) as DbRow | null;
  await sql(`UPDATE "FreelancerProfile" SET rating = $1 WHERE id = $2`, [
    row?.avg ? Number(row.avg) : 0,
    freelancerProfileId,
  ]);
}

type CloseoutScopeType = "ORDER" | "JOB";
type CloseoutRole = "client" | "freelancer";

function parseCloseoutScopeType(value: unknown): CloseoutScopeType {
  const scopeType = String(value || "").toUpperCase();
  if (scopeType !== "ORDER" && scopeType !== "JOB") {
    throw new ApiError(400, "scopeType must be ORDER or JOB");
  }
  return scopeType;
}

function parsePositiveInt(value: unknown, label: string): number {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) throw new ApiError(400, `Invalid ${label}`);
  return n;
}

function normalizeCriteria(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, raw]) => [key, Math.min(Math.max(Number(raw) || 0, 1), 5)])
      .filter(([, rating]) => Number.isFinite(rating))
  );
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((tag) => String(tag || "").trim()).filter(Boolean))].slice(0, 12);
}

async function loadCloseoutScope(
  req: ExpressRequest,
  scopeType: CloseoutScopeType,
  scopeId: number
): Promise<{
  scopeType: CloseoutScopeType;
  scopeId: number;
  role: CloseoutRole;
  revieweeRole: CloseoutRole;
  clientId: number;
  freelancerUserId: number;
  reviewerId: number;
  revieweeId: number;
  eligible: boolean;
  scope: DbRow;
}> {
  if (!req.user?.id) throw new ApiError(401, "Unauthorized");

  if (scopeType === "ORDER") {
    const row = (await sqlOne(
      `SELECT o."id", o."orderNumber", o."status", o."escrowStatus", o."client_id" AS "clientId",
              fp."id" AS "freelancerProfileId", fp."user_id" AS "freelancerUserId",
              client."firstname" AS "clientFirstName", client."lastname" AS "clientLastName",
              freelancer."firstname" AS "freelancerFirstName", freelancer."lastname" AS "freelancerLastName",
              EXISTS (
                SELECT 1 FROM "FinalDelivery" fd
                 WHERE fd."scopeType" = 'ORDER' AND fd."orderId" = o."id" AND fd."status" IN ('FINAL_DELIVERED', 'AUTO_APPROVED')
              ) AS "hasFinalDelivery"
         FROM "Order" o
         JOIN "FreelancerProfile" fp ON fp."id" = o."freelancer_id"
         JOIN "User" client ON client."id" = o."client_id"
         JOIN "User" freelancer ON freelancer."id" = fp."user_id"
        WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [scopeId]
    )) as DbRow | null;
    if (!row) throw new ApiError(404, "Order not found");
    const clientId = Number(row.clientId);
    const freelancerUserId = Number(row.freelancerUserId);
    const role = clientId === Number(req.user.id) ? "client" : freelancerUserId === Number(req.user.id) ? "freelancer" : null;
    if (!role) throw new ApiError(403, "You are not part of this order");
    return {
      scopeType,
      scopeId,
      role,
      revieweeRole: role === "client" ? "freelancer" : "client",
      clientId,
      freelancerUserId,
      reviewerId: Number(req.user.id),
      revieweeId: role === "client" ? freelancerUserId : clientId,
      eligible: Boolean(row.hasFinalDelivery) || String(row.status) === "COMPLETED",
      scope: row,
    };
  }

  const row = (await sqlOne(
    `SELECT j."id", j."title", j."status", j."posted_by_id" AS "clientId", j."freelancer_id" AS "freelancerUserId",
            client."firstname" AS "clientFirstName", client."lastname" AS "clientLastName",
            freelancer."firstname" AS "freelancerFirstName", freelancer."lastname" AS "freelancerLastName",
            EXISTS (
              SELECT 1 FROM "FinalDelivery" fd
               WHERE fd."scopeType" = 'JOB' AND fd."jobId" = j."id" AND fd."status" IN ('FINAL_DELIVERED', 'AUTO_APPROVED')
            ) AS "hasFinalDelivery"
       FROM "Job" j
       JOIN "User" client ON client."id" = j."posted_by_id"
       JOIN "User" freelancer ON freelancer."id" = j."freelancer_id"
      WHERE j."id" = $1 AND j."deletedAt" IS NULL`,
    [scopeId]
  )) as DbRow | null;
  if (!row) throw new ApiError(404, "Project not found");
  const clientId = Number(row.clientId);
  const freelancerUserId = Number(row.freelancerUserId);
  const role = clientId === Number(req.user.id) ? "client" : freelancerUserId === Number(req.user.id) ? "freelancer" : null;
  if (!role) throw new ApiError(403, "You are not part of this project");
  return {
    scopeType,
    scopeId,
    role,
    revieweeRole: role === "client" ? "freelancer" : "client",
    clientId,
    freelancerUserId,
    reviewerId: Number(req.user.id),
    revieweeId: role === "client" ? freelancerUserId : clientId,
    eligible: Boolean(row.hasFinalDelivery) || String(row.status) === "COMPLETED",
    scope: row,
  };
}

function mapCounterpartyReview(row: DbRow | null): DbRow | null {
  if (!row) return null;
  return {
    id: row.id,
    scopeType: row.scopeType,
    orderId: row.orderId,
    jobId: row.jobId,
    reviewerId: row.reviewerId,
    revieweeId: row.revieweeId,
    reviewerRole: row.reviewerRole,
    revieweeRole: row.revieweeRole,
    rating: Number(row.rating),
    criteriaRatings: row.criteriaRatings || {},
    tags: Array.isArray(row.tags) ? row.tags : [],
    publicComment: row.publicComment,
    privateNote: row.privateNote,
    wouldWorkAgain: Boolean(row.wouldWorkAgain),
    moderationStatus: row.moderationStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getCloseoutReviews(scopeType: CloseoutScopeType, scopeId: number): Promise<DbRow[]> {
  const key = scopeType === "ORDER" ? "orderId" : "jobId";
  return (await sql(
    `SELECT * FROM "CounterpartyReview"
      WHERE "scopeType" = $1 AND "${key}" = $2 AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC`,
    [scopeType, scopeId]
  )) as DbRow[];
}

function buildCloseoutReviewState(scope: Awaited<ReturnType<typeof loadCloseoutScope>>, reviews: DbRow[]) {
  const myReview = reviews.find((review) => Number(review.reviewerId) === scope.reviewerId) || null;
  const peerReview = reviews.find((review) => Number(review.reviewerId) === scope.revieweeId) || null;
  return {
    scopeType: scope.scopeType,
    scopeId: scope.scopeId,
    role: scope.role,
    eligible: scope.eligible,
    canReview: scope.eligible && !myReview,
    peer: {
      id: scope.revieweeId,
      role: scope.revieweeRole,
      name:
        scope.revieweeRole === "freelancer"
          ? [scope.scope.freelancerFirstName, scope.scope.freelancerLastName].filter(Boolean).join(" ") || "Editor"
          : [scope.scope.clientFirstName, scope.scope.clientLastName].filter(Boolean).join(" ") || "Client",
    },
    me: {
      id: scope.reviewerId,
      role: scope.role,
    },
    myReview: mapCounterpartyReview(myReview),
    peerReview: mapCounterpartyReview(peerReview),
    reviews: reviews.map(mapCounterpartyReview),
  };
}

const createReview: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const clientId = req.user.id;
    const body = req.body as Record<string, unknown>;
    const { orderId, rating, comment, title, isAnonymous } = body;

    const r = rating != null ? Number(rating) : NaN;
    if (!orderId || !rating || r < 1 || r > 5) {
      return next(new ApiError(400, "Order ID and rating (1-5) are required"));
    }

    const order = (await sqlOne(
      `SELECT o.*, fp."user_id" AS "freelancerUserId"
       FROM "Order" o
       JOIN "FreelancerProfile" fp ON fp.id = o.freelancer_id
       WHERE o.id = $1 AND o."deletedAt" IS NULL`,
      [parseInt(String(orderId), 10)]
    )) as (DbRow & { freelancerUserId?: number }) | null;
    if (!order || order.client_id !== clientId) {
      return next(new ApiError(404, "Order not found or you don't own it"));
    }
    if (order.status !== "COMPLETED") {
      return next(new ApiError(400, "Reviews can only be submitted for completed orders"));
    }

    const existing = (await sqlOne(
      `SELECT id FROM "Review" WHERE order_id = $1 AND "deletedAt" IS NULL`,
      [parseInt(String(orderId), 10)]
    )) as DbRow | null;
    if (existing) {
      return next(new ApiError(400, "A review already exists for this order"));
    }

    const review = (await sqlOne(
      `INSERT INTO "Review" (
         order_id, client_id, freelancer_id, rating, comment, title, "isAnonymous", gig_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        parseInt(String(orderId), 10),
        clientId,
        order.freelancer_id,
        r,
        comment ?? null,
        title ?? null,
        Boolean(isAnonymous),
        order.gig_id,
      ]
    )) as DbRow;
    const client = (await sqlOne(`SELECT id, firstname, lastname FROM "User" WHERE id = $1`, [
      clientId,
    ])) as DbRow | null;
    const fp = (await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE id = $1`, [
      order.freelancer_id as number,
    ])) as DbRow | null;
    const freelancer = {
      ...fp,
      user: await sqlOne(
        `SELECT id, firstname, lastname, email FROM "User" WHERE id = (SELECT "user_id" FROM "FreelancerProfile" WHERE id = $1)`,
        [order.freelancer_id as number]
      ),
    };

    const out = {
      ...review,
      orderId: review.order_id,
      clientId: review.client_id,
      freelancerId: review.freelancer_id,
      client: anonymizeClient(client, review.isAnonymous),
      freelancer,
    };

    await refreshFreelancerRating(order.freelancer_id as number);

    return res.status(201).json(new ApiResponse(201, out, "Review created successfully"));
  } catch (error) {
    logger.error("Error creating review: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to create review"));
  }
};

const updateReview: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const clientId = req.user.id;
    const { reviewId } = req.params;
    const body = req.body as Record<string, unknown>;
    const { rating, comment, title, isAnonymous } = body;

    const review = (await sqlOne(
      `SELECT r.*, o.client_id, o.id AS "orderPk"
       FROM "Review" r
       JOIN "Order" o ON o.id = r.order_id
       WHERE r.id = $1 AND r."deletedAt" IS NULL`,
      [parseInt(String(reviewId), 10)]
    )) as (DbRow & { client_id?: number }) | null;
    if (!review || review.client_id !== clientId) {
      return next(new ApiError(404, "Review not found or you don't own it"));
    }
    if (review.moderationStatus !== "APPROVED") {
      return next(new ApiError(400, "Cannot update a review that is not approved"));
    }
    if (new Date().getTime() - new Date(review.createdAt as string | number | Date).getTime() > 7 * 24 * 60 * 60 * 1000) {
      return next(new ApiError(400, "Reviews can only be updated within 7 days of creation"));
    }

    const nextRating =
      rating !== undefined
        ? Math.min(Math.max(parseInt(String(rating), 10), 1), 5)
        : review.rating;

    const updatedReview = (await sqlOne(
      `UPDATE "Review" SET
         rating = $2,
         comment = $3,
         title = $4,
         "isAnonymous" = $5
       WHERE id = $1
       RETURNING *`,
      [
        parseInt(String(reviewId), 10),
        nextRating,
        comment !== undefined ? comment : review.comment,
        title !== undefined ? title : review.title,
        isAnonymous !== undefined ? isAnonymous : review.isAnonymous,
      ]
    )) as DbRow;
    const client = (await sqlOne(`SELECT id, firstname, lastname FROM "User" WHERE id = $1`, [
      clientId,
    ])) as DbRow | null;
    const fp = (await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE id = $1`, [
      review.freelancer_id,
    ])) as DbRow | null;
    const freelancer = {
      ...fp,
      user: await sqlOne(
        `SELECT id, firstname, lastname, email FROM "User" WHERE id = (SELECT "user_id" FROM "FreelancerProfile" WHERE id = $1)`,
        [review.freelancer_id as number]
      ),
    };

    const out = {
      ...updatedReview,
      orderId: updatedReview.order_id,
      clientId: updatedReview.client_id,
      freelancerId: updatedReview.freelancer_id,
      client: anonymizeClient(client, updatedReview.isAnonymous),
      freelancer,
    };

    await refreshFreelancerRating(review.freelancer_id as number);

    return res.status(200).json(new ApiResponse(200, out, "Review updated successfully"));
  } catch (error) {
    logger.error("Error updating review: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to update review"));
  }
};

const deleteReview: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { reviewId } = req.params;

    const review = (await sqlOne(
      `SELECT r.*, o.client_id
       FROM "Review" r
       JOIN "Order" o ON o.id = r.order_id
       WHERE r.id = $1 AND r."deletedAt" IS NULL`,
      [parseInt(String(reviewId), 10)]
    )) as (DbRow & { client_id?: number }) | null;
    if (!review) {
      return next(new ApiError(404, "Review not found"));
    }
    if (review.client_id !== userId && req.user.role !== "ADMIN") {
      return next(
        new ApiError(403, "Forbidden: You can only delete your own reviews or as an admin")
      );
    }

    await sql(`UPDATE "Review" SET "deletedAt" = now() WHERE id = $1`, [parseInt(String(reviewId), 10)]);

    await refreshFreelancerRating(review.freelancer_id as number);

    return res.status(200).json(new ApiResponse(200, null, "Review deleted successfully"));
  } catch (error) {
    logger.error("Error deleting review: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete review"));
  }
};

const getReview: ControllerHandler = async (req, res, next) => {
  try {
    const { reviewId } = req.params;

    const review = (await sqlOne(
      `SELECT r.*,
         uc.firstname AS "clientFirst", uc.lastname AS "clientLast",
         uff.firstname AS "fluFirst", uff.lastname AS "fluLast",
         o."orderNumber"
       FROM "Review" r
       JOIN "User" uc ON uc.id = r.client_id
       JOIN "FreelancerProfile" fp ON fp.id = r.freelancer_id
       JOIN "User" uff ON uff.id = fp.user_id
       JOIN "Order" o ON o.id = r.order_id
       WHERE r.id = $1 AND r."deletedAt" IS NULL`,
      [parseInt(String(reviewId), 10)]
    )) as DbRow | null;
    if (!review) {
      return next(new ApiError(404, "Review not found"));
    }
    if (
      review.moderationStatus !== "APPROVED" &&
      (!req.user || (req.user.id !== review.client_id && req.user.role !== "ADMIN"))
    ) {
      return next(new ApiError(403, "Forbidden: Review is not public or you lack permission"));
    }

    const out = {
      id: review.id,
      orderId: review.order_id,
      clientId: review.client_id,
      freelancerId: review.freelancer_id,
      rating: review.rating,
      comment: review.comment,
      title: review.title,
      isAnonymous: review.isAnonymous,
      helpfulCount: review.helpfulCount,
      response: review.response,
      respondedAt: review.respondedAt,
      isVerified: review.isVerified,
      moderationStatus: review.moderationStatus,
      moderatedAt: review.moderatedAt,
      moderatedBy: review.moderated_by,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      gigId: review.gig_id,
      client: anonymizeClient(
        { firstname: review.clientFirst, lastname: review.clientLast },
        review.isAnonymous
      ),
      freelancer: {
        user: { firstname: review.fluFirst, lastname: review.fluLast },
      },
      order: { orderNumber: review.orderNumber },
    };

    return res.status(200).json(new ApiResponse(200, out, "Review retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving review: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve review"));
  }
};

const getFreelancerReviews: ControllerHandler = async (req, res, next) => {
  try {
    const { freelancerId } = req.params;
    const page = qs(req.query, "page", "1");
    const limit = qs(req.query, "limit", "10");
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);
    const fpId = parseInt(String(freelancerId), 10);

    const whereSql = `r.freelancer_id = $1 AND r."moderationStatus" = 'APPROVED' AND r."deletedAt" IS NULL`;

    const [reviews, total] = await Promise.all([
      sql(
        `SELECT r.*, uc.firstname AS c_fn, uc.lastname AS c_ln, o."orderNumber"
         FROM "Review" r
         JOIN "User" uc ON uc.id = r.client_id
         JOIN "Order" o ON o.id = r.order_id
         WHERE ${whereSql}
         ORDER BY r."createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [fpId, lim, skip]
      ) as Promise<DbRow[]>,
      sqlCount(`SELECT count(*)::int AS count FROM "Review" r WHERE ${whereSql}`, [fpId]),
    ]);

    const mapped = reviews.map((r) => ({
      ...r,
      orderId: r.order_id,
      clientId: r.client_id,
      freelancerId: r.freelancer_id,
      client: anonymizeClient({ firstname: r.c_fn, lastname: r.c_ln }, r.isAnonymous),
      order: { orderNumber: r.orderNumber },
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          reviews: mapped,
          total,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "Freelancer reviews retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving freelancer reviews: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve freelancer reviews"));
  }
};

const respondToReview: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { reviewId } = req.params;
    const body = req.body as Record<string, unknown>;
    const { response } = body;

    if (!response) {
      return next(new ApiError(400, "Response text is required"));
    }

    const review = (await sqlOne(
      `SELECT r.*, fp."user_id" AS "freelancerUserId", fp.id AS "fpId"
       FROM "Review" r
       JOIN "FreelancerProfile" fp ON fp.id = r.freelancer_id
       WHERE r.id = $1 AND r."deletedAt" IS NULL`,
      [parseInt(String(reviewId), 10)]
    )) as (DbRow & { freelancerUserId?: number; fpId?: number }) | null;
    if (!review || review.freelancerUserId !== userId) {
      return next(new ApiError(404, "Review not found or you don't own it"));
    }
    if (review.response) {
      return next(new ApiError(400, "A response already exists for this review"));
    }

    const updatedReview = (await sqlOne(
      `UPDATE "Review"
       SET response = $2, "respondedAt" = now()
       WHERE id = $1
       RETURNING *`,
      [parseInt(String(reviewId), 10), String(response)]
    )) as DbRow;
    const client = (await sqlOne(`SELECT firstname, lastname FROM "User" WHERE id = $1`, [
      review.client_id,
    ])) as DbRow | null;
    const fp = (await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE id = $1`, [
      review.fpId,
    ])) as DbRow | null;
    const user = (await sqlOne(`SELECT id, firstname, lastname, email FROM "User" WHERE id = $1`, [
      userId,
    ])) as DbRow | null;
    const freelancer = { ...fp, user };
    const out = {
      ...updatedReview,
      orderId: updatedReview.order_id,
      clientId: updatedReview.client_id,
      freelancerId: updatedReview.freelancer_id,
      client: anonymizeClient(client, updatedReview.isAnonymous),
      freelancer,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, out, "Response added to review successfully"));
  } catch (error) {
    logger.error("Error responding to review: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to respond to review"));
  }
};

const getCloseoutReviewState: ControllerHandler = async (req, res, next) => {
  try {
    const scopeType = parseCloseoutScopeType(req.params.scopeType);
    const scopeId = parsePositiveInt(req.params.scopeId, "scope id");
    const scope = await loadCloseoutScope(req, scopeType, scopeId);
    const reviews = await getCloseoutReviews(scopeType, scopeId);
    return res
      .status(200)
      .json(new ApiResponse(200, buildCloseoutReviewState(scope, reviews), "Closeout reviews retrieved"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Error retrieving closeout reviews: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve closeout reviews"));
  }
};

const submitCloseoutReview: ControllerHandler = async (req, res, next) => {
  try {
    const scopeType = parseCloseoutScopeType(req.params.scopeType);
    const scopeId = parsePositiveInt(req.params.scopeId, "scope id");
    const scope = await loadCloseoutScope(req, scopeType, scopeId);
    if (!scope.eligible) {
      return next(new ApiError(400, "Reviews unlock only after final delivery is completed"));
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const rating = Number(body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return next(new ApiError(400, "rating must be between 1 and 5"));
    }

    const publicComment = String(body.publicComment || body.comment || "").trim();
    const privateNote = String(body.privateNote || "").trim();
    const criteriaRatings = normalizeCriteria(body.criteriaRatings);
    const tags = normalizeTags(body.tags);
    const wouldWorkAgain = body.wouldWorkAgain == null ? true : Boolean(body.wouldWorkAgain);
    const keyColumn = scopeType === "ORDER" ? "orderId" : "jobId";

    const existing = await sqlOne(
      `SELECT "id" FROM "CounterpartyReview"
        WHERE "scopeType" = $1 AND "${keyColumn}" = $2 AND "reviewerId" = $3 AND "deletedAt" IS NULL`,
      [scopeType, scopeId, scope.reviewerId]
    );
    if (existing) return next(new ApiError(409, "You already submitted a review for this delivery"));

    const review = (await sqlOne(
      `INSERT INTO "CounterpartyReview" (
         "scopeType", "${keyColumn}", "reviewerId", "revieweeId", "reviewerRole", "revieweeRole",
         "rating", "criteriaRatings", "tags", "publicComment", "privateNote", "wouldWorkAgain", "updatedAt"
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, NOW())
       RETURNING *`,
      [
        scopeType,
        scopeId,
        scope.reviewerId,
        scope.revieweeId,
        scope.role,
        scope.revieweeRole,
        Math.round(rating),
        JSON.stringify(criteriaRatings),
        JSON.stringify(tags),
        publicComment || null,
        privateNote || null,
        wouldWorkAgain,
      ]
    )) as DbRow | null;

    const reviews = await getCloseoutReviews(scopeType, scopeId);
    return res
      .status(201)
      .json(new ApiResponse(201, buildCloseoutReviewState(scope, reviews), "Closeout review submitted"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Error submitting closeout review: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to submit closeout review"));
  }
};

export {
  createReview,
  updateReview,
  deleteReview,
  getReview,
  getFreelancerReviews,
  respondToReview,
  getCloseoutReviewState,
  submitCloseoutReview,
};
