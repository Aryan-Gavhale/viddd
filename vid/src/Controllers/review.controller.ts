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

export { createReview, updateReview, deleteReview, getReview, getFreelancerReviews, respondToReview };
