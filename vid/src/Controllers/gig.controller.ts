import type { DbRow, ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount, withTransaction, txSql } from "../db.js";
import logger from "../Utils/logger.js";
import { parseCursorPagination } from "../Utils/pagination.js";
import { cursorPaginatedResponse } from "../Utils/dto.js";
import { cacheGet, cacheSet, cacheDel } from "../Utils/cache.js";
import { isFreelancerProfileComplete } from "../Utils/profileUtils.js";

type SampleMedia = { mediaUrl: string; mediaType: string };

type ControllerHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

/**
 * FIX M10: file uploads moved to the shared S3 multer middleware
 * (`uploadFields` from upload.middleware.ts). The route is now responsible
 * for invoking the multer preHandler; here we only consume the resulting
 * `req.files[fieldName][i].location` URLs from S3.
 */
function toMediaType(label: string) {
  if (label === "video") return "VIDEO";
  if (label === "thumbnail") return "THUMBNAIL";
  return "IMAGE";
}

type S3MulterFile = { location?: string; mimetype: string };

function buildSampleMediaFromS3(
  files: Record<string, S3MulterFile[]> | S3MulterFile[] | undefined
): SampleMedia[] {
  const out: SampleMedia[] = [];
  if (!files || Array.isArray(files)) return out;

  const thumb = files.thumbnail?.[0];
  if (thumb?.location) {
    out.push({
      mediaUrl: thumb.location,
      mediaType: toMediaType(thumb.mimetype.split("/")[0] === "video" ? "video" : "thumbnail"),
    });
  }
  for (const f of files.sampleMedia || []) {
    if (f?.location) {
      out.push({
        mediaUrl: f.location,
        mediaType: toMediaType(f.mimetype.split("/")[0] === "video" ? "video" : "image"),
      });
    }
  }
  return out;
}

function gigRowToClientShape(row: DbRow | null) {
  if (!row) return null;
  const { freelancer_id, search_vector, fp_user_id, ...rest } = row;
  return {
    ...rest,
    freelancerId: freelancer_id,
    searchVector: search_vector,
  };
}

function mapSampleMediaRows(rows: DbRow[] | null | undefined) {
  return (rows || []).map((r) => ({
    id: r.id,
    gigId: r.gig_id,
    mediaUrl: r.mediaUrl,
    mediaType: r.mediaType,
    title: r.title,
    description: r.description,
    uploadedAt: r.uploadedAt,
  }));
}

const createGig = async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next(new ApiError(401, "Unauthorized: User not authenticated"));
      }
      const freelancerUserId = req.user.id;

      const {
        title, description, category, pricing, deliveryTime, revisionCount,
        tags, requirements, faqs, packageDetails,
      } = req.body;

      if (!title || !pricing || !deliveryTime) {
        return next(new ApiError(400, "Missing required fields: title, pricing, and deliveryTime are mandatory."));
      }

      const parsedPricing = typeof pricing === "string" ? JSON.parse(pricing) : pricing;
      const parsedTags = tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [];
      const parsedFaqs = faqs ? (typeof faqs === "string" ? JSON.parse(faqs) : faqs) : [];
      const parsedPackageDetails = packageDetails
        ? (typeof packageDetails === "string" ? JSON.parse(packageDetails) : packageDetails)
        : [];

      if (!Array.isArray(parsedPricing) || parsedPricing.length === 0) {
        return next(new ApiError(400, "Pricing must be a non-empty array of objects."));
      }

      const parsedDeliveryTime = parseInt(String(deliveryTime), 10);
      if (isNaN(parsedDeliveryTime) || parsedDeliveryTime <= 0) {
        return next(new ApiError(400, "Delivery time must be a positive integer."));
      }

      const freelancerProfile = await sqlOne(
        `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
        [freelancerUserId]
      );
      if (!freelancerProfile) {
        return next(new ApiError(404, "Freelancer profile not found. Create a profile first."));
      }

      // Block publishing a Gig while onboarding is incomplete. We treat the
      // FreelancerProfile fields as the source of truth (city, state,
      // jobTitle, overview, skills, availability) and also self-heal the
      // User.isProfileComplete flag so it converges with reality. Drafts go
      // through createGigDraft and intentionally skip this gate so a
      // half-finished freelancer can still save work-in-progress.
      const fpRow = freelancerProfile as DbRow;
      const { user_id: _fpUserId, ...fpRest } = fpRow;
      const profileComplete = isFreelancerProfileComplete({ ...fpRest, userId: _fpUserId } as never);
      if (!profileComplete) {
        return next(
          new ApiError(
            403,
            "Complete your freelancer profile (city, state, job title, overview, skills, availability) before publishing a gig. You can still save it as a draft."
          )
        );
      }
      // Self-heal flag drift so future calls (and the frontend's
      // protectedRoutes redirect) see the right state without needing a
      // manual refresh.
      const userRow = await sqlOne(`SELECT "isProfileComplete" FROM "User" WHERE "id" = $1`, [freelancerUserId]);
      if (userRow && (userRow as DbRow).isProfileComplete !== true) {
        await sql(
          `UPDATE "User" SET "isProfileComplete" = true, "updatedAt" = NOW() WHERE "id" = $1`,
          [freelancerUserId]
        );
      }

      const sampleMediaData = buildSampleMediaFromS3(req.files);

      const gig = await withTransaction(async (client) => {
        const q = txSql(client);
        const g = await client.query(
          `INSERT INTO "Gig" (
            freelancer_id, "title", "description", "category", "pricing", "deliveryTime", "revisionCount",
            "tags", "requirements", "faqs", "packageDetails", "status"
          ) VALUES (
            $1, $2, $3, $4, $5::jsonb, $6, $7, $8::text[], $9, $10::jsonb, $11::jsonb, 'ACTIVE'::"GigStatus"
          ) RETURNING *`,
          [
            freelancerProfile.id,
            title,
            description,
            category,
            JSON.stringify(parsedPricing),
            parsedDeliveryTime,
            revisionCount ? parseInt(revisionCount, 10) : null,
            parsedTags,
            requirements ?? null,
            JSON.stringify(parsedFaqs),
            JSON.stringify(parsedPackageDetails),
          ]
        );
        const created = g.rows[0] as DbRow;
        for (const sm of sampleMediaData) {
          await q(
            `INSERT INTO "GigSampleMedia" (gig_id, "mediaUrl", "mediaType")
             VALUES ($1, $2, $3::"MediaType")`,
            [created.id, sm.mediaUrl, sm.mediaType]
          );
        }
        const smRows = await q(
          `SELECT * FROM "GigSampleMedia" WHERE gig_id = $1 ORDER BY "id" ASC`,
          [created.id]
        );
        return { ...gigRowToClientShape(created), sampleMedia: mapSampleMediaRows(smRows as DbRow[]) };
      });

      await cacheDel("gigs:list:*");

      return res.status(201).json(new ApiResponse(201, gig, "Gig created successfully"));
    } catch (error) {
      logger.error("Error creating gig: %s", (error as Error).message);
      return next(new ApiError(500, "Failed to create gig"));
    }
};

const createGigDraft = async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next(new ApiError(401, "Unauthorized: User not authenticated"));
      }
      const freelancerUserId = req.user.id;

      const {
        title, description, category, pricing, deliveryTime, revisionCount,
        tags, requirements, faqs, packageDetails,
      } = req.body;

      if (!title) {
        return next(new ApiError(400, "Title is required for drafts."));
      }

      const freelancerProfile = await sqlOne(
        `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
        [freelancerUserId]
      );
      if (!freelancerProfile) {
        return next(new ApiError(404, "Freelancer profile not found. Create a profile first."));
      }

      const parsedPricing = pricing
        ? (typeof pricing === "string" ? JSON.parse(pricing) : pricing)
        : [];
      const parsedTags = tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [];
      const parsedFaqs = faqs ? (typeof faqs === "string" ? JSON.parse(faqs) : faqs) : [];
      const parsedPackageDetails = packageDetails
        ? (typeof packageDetails === "string" ? JSON.parse(packageDetails) : packageDetails)
        : [];
      const parsedDeliveryTime = deliveryTime ? parseInt(String(deliveryTime), 10) : null;

      const sampleMediaData = buildSampleMediaFromS3(req.files);

      const gig = await withTransaction(async (client) => {
        const q = txSql(client);
        const g = await client.query(
          `INSERT INTO "Gig" (
            freelancer_id, "title", "description", "category", "pricing", "deliveryTime", "revisionCount",
            "status", "tags", "requirements", "faqs", "packageDetails"
          ) VALUES (
            $1, $2, $3, $4, $5::jsonb, $6, $7, 'DRAFT'::"GigStatus", $8::text[], $9, $10::jsonb, $11::jsonb
          ) RETURNING *`,
          [
            freelancerProfile.id,
            title,
            description || null,
            category || null,
            JSON.stringify(parsedPricing.length > 0 ? parsedPricing : []),
            parsedDeliveryTime,
            revisionCount ? parseInt(revisionCount, 10) : null,
            parsedTags,
            requirements || null,
            JSON.stringify(parsedFaqs.length > 0 ? parsedFaqs : []),
            JSON.stringify(parsedPackageDetails.length > 0 ? parsedPackageDetails : []),
          ]
        );
        const created = g.rows[0] as DbRow;
        for (const sm of sampleMediaData) {
          await q(
            `INSERT INTO "GigSampleMedia" (gig_id, "mediaUrl", "mediaType")
             VALUES ($1, $2, $3::"MediaType")`,
            [created.id, sm.mediaUrl, sm.mediaType]
          );
        }
        const smRows = await q(
          `SELECT * FROM "GigSampleMedia" WHERE gig_id = $1 ORDER BY "id" ASC`,
          [created.id]
        );
        return { ...gigRowToClientShape(created), sampleMedia: mapSampleMediaRows(smRows as DbRow[]) };
      });

      return res.status(201).json(new ApiResponse(201, gig, "Gig draft saved successfully"));
    } catch (error) {
      logger.error("Error saving gig draft: %s", (error as Error).message);
      return next(new ApiError(500, "Failed to save gig draft"));
    }
};

const updateGigDraft = async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next(new ApiError(401, "Unauthorized: User not authenticated"));
      }
      const freelancerUserId = req.user.id;
      const { gigId } = req.params;
      const id = parseInt(gigId, 10);

      const {
        title, description, category, pricing, deliveryTime, revisionCount,
        tags, requirements, faqs, packageDetails,
      } = req.body;

      const gig = await sqlOne(
        `SELECT g.*, fp."user_id" as "fp_user_id"
         FROM "Gig" g
         JOIN "FreelancerProfile" fp ON fp."id" = g.freelancer_id
         WHERE g."id" = $1 AND g."deletedAt" IS NULL`,
        [id]
      );
      if (!gig) {
        return next(new ApiError(404, "Gig draft not found."));
      }
      if (gig.fp_user_id !== freelancerUserId) {
        return next(new ApiError(403, "Forbidden: You can only update your own gig drafts."));
      }
      if (gig.status !== "DRAFT") {
        return next(new ApiError(400, "This gig is not a draft and cannot be updated as one."));
      }

      if (!title) {
        return next(new ApiError(400, "Title is required for drafts."));
      }

      const parsedPricing = pricing
        ? (typeof pricing === "string" ? JSON.parse(pricing) : pricing)
        : gig.pricing;
      const parsedTags = tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : gig.tags;
      const parsedFaqs = faqs ? (typeof faqs === "string" ? JSON.parse(faqs) : faqs) : gig.faqs;
      const parsedPackageDetails = packageDetails
        ? (typeof packageDetails === "string" ? JSON.parse(packageDetails) : packageDetails)
        : gig.packageDetails;
      const parsedDeliveryTime = deliveryTime ? parseInt(String(deliveryTime), 10) : gig.deliveryTime;

      const sampleMediaData = buildSampleMediaFromS3(req.files);

      const updatedGig = await withTransaction(async (client) => {
        const q = txSql(client);
        const [urow] = await q(
          `UPDATE "Gig" SET
            "title" = $1,
            "description" = $2,
            "category" = $3,
            "pricing" = $4::jsonb,
            "deliveryTime" = $5,
            "revisionCount" = $6,
            "tags" = $7::text[],
            "requirements" = $8,
            "faqs" = $9::jsonb,
            "packageDetails" = $10::jsonb,
            "updatedAt" = NOW()
           WHERE "id" = $11 AND "deletedAt" IS NULL
           RETURNING *`,
          [
            title,
            description !== undefined ? description : gig.description,
            category !== undefined ? category : gig.category,
            JSON.stringify(parsedPricing),
            parsedDeliveryTime,
            revisionCount ? parseInt(revisionCount, 10) : gig.revisionCount,
            parsedTags,
            requirements !== undefined ? requirements : gig.requirements,
            JSON.stringify(parsedFaqs),
            JSON.stringify(parsedPackageDetails),
            id,
          ]
        );
        if (sampleMediaData.length > 0) {
          await q(`DELETE FROM "GigSampleMedia" WHERE gig_id = $1`, [id]);
          for (const sm of sampleMediaData) {
            await q(
              `INSERT INTO "GigSampleMedia" (gig_id, "mediaUrl", "mediaType")
               VALUES ($1, $2, $3::"MediaType")`,
              [id, sm.mediaUrl, sm.mediaType]
            );
          }
        }
        const smRows = await q(
          `SELECT * FROM "GigSampleMedia" WHERE gig_id = $1 ORDER BY "id" ASC`,
          [id]
        );
        return { ...gigRowToClientShape(urow), sampleMedia: mapSampleMediaRows(smRows) };
      });

      return res.status(200).json(new ApiResponse(200, updatedGig, "Gig draft updated successfully"));
    } catch (error) {
      logger.error("Error updating gig draft: %s", (error as Error).message);
      return next(new ApiError(500, "Failed to update gig draft"));
    }
};

const deleteGigDraft = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const freelancerUserId = req.user.id;
    const { gigId } = req.params;
    const id = parseInt(gigId, 10);

    const gig = await sqlOne(
      `SELECT g.*, fp."user_id" as "fp_user_id"
       FROM "Gig" g
       JOIN "FreelancerProfile" fp ON fp."id" = g.freelancer_id
       WHERE g."id" = $1 AND g."deletedAt" IS NULL`,
      [id]
    );
    if (!gig) {
      return next(new ApiError(404, "Gig draft not found."));
    }
    if (gig.fp_user_id !== freelancerUserId) {
      return next(new ApiError(403, "Forbidden: You can only delete your own gig drafts."));
    }
    if (gig.status !== "DRAFT") {
      return next(new ApiError(400, "This gig is not a draft and cannot be deleted as one."));
    }

    await sql(`DELETE FROM "Gig" WHERE "id" = $1`, [id]);

    return res.status(200).json(new ApiResponse(200, null, "Gig draft deleted successfully"));
  } catch (error) {
    logger.error("Error deleting gig draft: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete gig draft"));
  }
};

const updateGig = async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next(new ApiError(401, "Unauthorized: User not authenticated"));
      }
      const freelancerUserId = req.user.id;
      const { gigId } = req.params;
      const id = parseInt(gigId, 10);

      const {
        title, description, category, pricing, deliveryTime, revisionCount,
        tags, requirements, faqs, packageDetails,
      } = req.body;

      const gig = await sqlOne(
        `SELECT g.*, fp."user_id" as "fp_user_id"
         FROM "Gig" g
         JOIN "FreelancerProfile" fp ON fp."id" = g.freelancer_id
         WHERE g."id" = $1 AND g."deletedAt" IS NULL`,
        [id]
      );
      if (!gig) {
        return next(new ApiError(404, "Gig not found."));
      }
      if (gig.fp_user_id !== freelancerUserId) {
        return next(new ApiError(403, "Forbidden: You can only update your own gigs."));
      }

      const parsedPricing = pricing
        ? (typeof pricing === "string" ? JSON.parse(pricing) : pricing)
        : gig.pricing;
      const parsedTags = tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : gig.tags;
      const parsedFaqs = faqs ? (typeof faqs === "string" ? JSON.parse(faqs) : faqs) : gig.faqs;
      const parsedPackageDetails = packageDetails
        ? (typeof packageDetails === "string" ? JSON.parse(packageDetails) : packageDetails)
        : gig.packageDetails;
      const parsedDeliveryTime: number | null =
        deliveryTime != null && String(deliveryTime) !== ""
          ? parseInt(String(deliveryTime), 10)
          : gig.deliveryTime != null
            ? Number(gig.deliveryTime)
            : null;

      if (parsedPricing && (!Array.isArray(parsedPricing) || parsedPricing.length === 0)) {
        return next(new ApiError(400, "Pricing must be a non-empty array of objects."));
      }
      if (
        parsedDeliveryTime != null &&
        (isNaN(Number(parsedDeliveryTime)) || Number(parsedDeliveryTime) <= 0)
      ) {
        return next(new ApiError(400, "Delivery time must be a positive integer."));
      }

      const sampleMediaData = buildSampleMediaFromS3(req.files);

      const updatedGig = await withTransaction(async (client) => {
        const q = txSql(client);
        const [urow] = await q(
          `UPDATE "Gig" SET
            "title" = $1,
            "description" = $2,
            "category" = $3,
            "pricing" = $4::jsonb,
            "deliveryTime" = $5,
            "revisionCount" = $6,
            "tags" = $7::text[],
            "requirements" = $8,
            "faqs" = $9::jsonb,
            "packageDetails" = $10::jsonb,
            "updatedAt" = NOW()
           WHERE "id" = $11 AND "deletedAt" IS NULL
           RETURNING *`,
          [
            title !== undefined ? title : gig.title,
            description !== undefined ? description : gig.description,
            category !== undefined ? category : gig.category,
            JSON.stringify(parsedPricing),
            parsedDeliveryTime,
            revisionCount ? parseInt(revisionCount, 10) : gig.revisionCount,
            parsedTags,
            requirements !== undefined ? requirements : gig.requirements,
            JSON.stringify(parsedFaqs),
            JSON.stringify(parsedPackageDetails),
            id,
          ]
        );

        if (sampleMediaData.length > 0) {
          await q(`DELETE FROM "GigSampleMedia" WHERE gig_id = $1`, [id]);
          for (const sm of sampleMediaData) {
            await q(
              `INSERT INTO "GigSampleMedia" (gig_id, "mediaUrl", "mediaType")
               VALUES ($1, $2, $3::"MediaType")`,
              [id, sm.mediaUrl, sm.mediaType]
            );
          }
        }

        const smRows = await q(
          `SELECT * FROM "GigSampleMedia" WHERE gig_id = $1 ORDER BY "id" ASC`,
          [id]
        );
        return { ...gigRowToClientShape(urow), sampleMedia: mapSampleMediaRows(smRows) };
      });

      await cacheDel("gigs:list:*");

      return res.status(200).json(new ApiResponse(200, updatedGig, "Gig updated successfully"));
    } catch (error) {
      logger.error("Error updating gig: %s", (error as Error).message);
      return next(new ApiError(500, "Failed to update gig"));
    }
};

const deleteGig = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const freelancerUserId = req.user.id;
    const { gigId } = req.params;
    const id = parseInt(gigId, 10);

    const gig = await sqlOne(
      `SELECT g.*, fp."user_id" as "fp_user_id"
       FROM "Gig" g
       JOIN "FreelancerProfile" fp ON fp."id" = g.freelancer_id
       WHERE g."id" = $1 AND g."deletedAt" IS NULL`,
      [id]
    );
    if (!gig) {
      return next(new ApiError(404, "Gig not found."));
    }
    if (gig.fp_user_id !== freelancerUserId) {
      return next(new ApiError(403, "Forbidden: You can only delete your own gigs."));
    }

    await sql(
      `UPDATE "Gig" SET "deletedAt" = NOW(), "status" = 'DELETED'::"GigStatus", "updatedAt" = NOW() WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [id]
    );

    return res.status(200).json(new ApiResponse(200, null, "Gig deleted successfully"));
  } catch (error) {
    logger.error("Error deleting gig: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete gig"));
  }
};

const getGig = async (req, res, next) => {
  try {
    const { gigId } = req.params;
    if (!gigId || isNaN(parseInt(gigId, 10))) {
      return next(new ApiError(400, "Valid gigId is required"));
    }
    const id = parseInt(gigId, 10);

    const g = await sqlOne(
      `SELECT g.*, u."firstname" as "u_fn", u."lastname" as "u_ln", u."profilePicture" as "u_pp"
       FROM "Gig" g
       JOIN "FreelancerProfile" fp ON fp."id" = g.freelancer_id
       JOIN "User" u ON u."id" = fp."user_id"
       WHERE g."id" = $1 AND g."deletedAt" IS NULL AND g."status" != 'DRAFT'::"GigStatus"`,
      [id]
    );
    if (!g) {
      return next(new ApiError(404, "Gig not found."));
    }

    const { u_fn, u_ln, u_pp, ...gigRow } = g;
    const base = gigRowToClientShape(gigRow as DbRow)!;
    const sampleMediaRows = await sql(`SELECT * FROM "GigSampleMedia" WHERE gig_id = $1 ORDER BY "id" ASC`, [id]);
    const sampleMedia = mapSampleMediaRows(sampleMediaRows);

    const orderRows = await sql(
      `SELECT o."id", o."createdAt", o."totalPrice", o."status", u."firstname" as cfn, u."lastname" as cln
       FROM "Order" o
       JOIN "User" u ON u."id" = o.client_id
       WHERE o.gig_id = $1 AND o."status"::text != 'REJECTED' AND o."deletedAt" IS NULL
       ORDER BY o."createdAt" DESC
       LIMIT 5`,
      [id]
    );
    const orders = orderRows.map((o) => ({
      id: o.id,
      client: { firstname: o.cfn, lastname: o.cln },
      createdAt: o.createdAt,
      totalPrice: o.totalPrice,
      status: o.status,
    }));

    const reviewRows = await sql(
      `SELECT r."rating", r."comment", r."createdAt", u."firstname" as cfn, u."lastname" as cln
       FROM "Review" r
       JOIN "User" u ON u."id" = r.client_id
       WHERE r.gig_id = $1 AND r."deletedAt" IS NULL
       ORDER BY r."createdAt" DESC
       LIMIT 5`,
      [id]
    );
    const reviews = reviewRows.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      client: { firstname: r.cfn, lastname: r.cln },
    }));

    await sql(
      `UPDATE "Gig" SET "views" = "views" + 1, "updatedAt" = NOW() WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [id]
    );
    const views = (Number((base as Record<string, unknown>).views) || 0) + 1;

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length
        : 0;

    const gig = {
      ...base,
      views,
      sampleMedia,
      freelancer: { user: { firstname: u_fn, lastname: u_ln, profilePicture: u_pp } },
      orders,
      reviews,
    };

    return res.status(200).json(new ApiResponse(200, { ...gig, averageRating }, "Gig retrieved successfully"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    const e = error as Error;
    logger.error(`Error retrieving gig: ${e.message}\n${e.stack}`);
    return next(new ApiError(500, `Failed to retrieve gig: ${e.message}`));
  }
};

const getGigAnalytics = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const freelancerUserId = req.user.id;
    const { gigId } = req.params;
    const id = parseInt(gigId, 10);

    const g = await sqlOne(
      `SELECT g.*, fp."user_id" as "fp_user_id"
       FROM "Gig" g
       JOIN "FreelancerProfile" fp ON fp."id" = g.freelancer_id
       WHERE g."id" = $1 AND g."deletedAt" IS NULL`,
      [id]
    );
    if (!g) {
      return next(new ApiError(404, "Gig not found."));
    }
    if (g.fp_user_id !== freelancerUserId) {
      return next(new ApiError(403, "Forbidden: You can only view analytics for your own gigs."));
    }

    const orderList = await sql(
      `SELECT "id", "createdAt", "totalPrice" FROM "Order"
       WHERE gig_id = $1 AND "status"::text != 'REJECTED' AND "deletedAt" IS NULL`,
      [id]
    );
    const reviewRatings = await sql(
      `SELECT "rating" FROM "Review" WHERE gig_id = $1 AND "deletedAt" IS NULL`,
      [id]
    );

    const totalViews = Number((g as DbRow).views) || 0;
    const totalInquiries = 0;
    const totalPurchases = orderList.length;
    const averageRating =
      reviewRatings.length > 0
        ? reviewRatings.reduce((s, r) => s + Number((r as DbRow).rating), 0) / reviewRatings.length
        : 0;

    const repeatRow = await sqlOne(
      `SELECT COUNT(*)::int AS c FROM (
         SELECT client_id FROM "Order"
         WHERE gig_id = $1 AND "status"::text != 'REJECTED' AND "deletedAt" IS NULL
         GROUP BY client_id
         HAVING COUNT(*) > 1
       ) t`,
      [id]
    );
    const repeatClients = repeatRow ? repeatRow.c : 0;
    const conversionRate = totalViews > 0 ? (totalPurchases / totalViews) * 100 : 0;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalViews,
          totalInquiries,
          totalPurchases,
          averageRating,
          repeatClients,
          conversionRate: parseFloat(conversionRate.toFixed(1)),
          revenue: g.revenue,
          responseTime: g.responseTime,
          completionRate: g.completionRate,
        },
        "Gig analytics retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving gig analytics: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve gig analytics"));
  }
};

const getFreelancerGigs = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;

    const fp = await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    );
    if (!fp) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    const gigs = await sql(
      `SELECT * FROM "Gig" WHERE freelancer_id = $1 AND "deletedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 100`,
      [fp.id]
    );
    type FreelancerGigItem = NonNullable<ReturnType<typeof gigRowToClientShape>> & {
      sampleMedia: ReturnType<typeof mapSampleMediaRows>;
    };
    const gigIds = gigs.map((g: DbRow) => g.id as number);
    const allMedia =
      gigIds.length > 0
        ? await sql(
            `SELECT * FROM "GigSampleMedia" WHERE gig_id = ANY($1::int[]) ORDER BY gig_id, "id" ASC`,
            [gigIds]
          )
        : [];
    const mediaMap = new Map<number, Record<string, unknown>[]>();
    for (const m of allMedia) {
      const gid = m.gig_id as number;
      if (!mediaMap.has(gid)) mediaMap.set(gid, []);
      mediaMap.get(gid)!.push(m);
    }
    const out: FreelancerGigItem[] = [];
    for (const row of gigs) {
      const base = gigRowToClientShape(row);
      if (base) {
        out.push({ ...base, sampleMedia: mapSampleMediaRows(mediaMap.get(row.id as number) || []) });
      }
    }

    return res.status(200).json(new ApiResponse(200, out, "Freelancer gigs retrieved successfully"));
  } catch (error) {
    logger.error("Error fetching freelancer gigs: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to fetch freelancer gigs"));
  }
};

const getAllGigs = async (req, res, next) => {
  try {
    const { category, search, cursor } = req.query;
    const useCursor = cursor != null;
    const { page: pageQ = 1, limit: limitQ = 10 } = req.query;
    const cacheKey = useCursor
      ? (() => {
          const p = parseCursorPagination(req.query as Record<string, string | string[] | undefined>);
          return `gigs:list:${category || "all"}:${search || ""}:cur:${p.cursor ?? "start"}:lim:${p.limit}:dir:${p.direction}`;
        })()
      : `gigs:list:${category || "all"}:${search || ""}:page:${String(pageQ)}:lim:${String(limitQ)}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return res.status(200).json(new ApiResponse(200, cached, "Gigs retrieved (cached)"));

    const params: unknown[] = [];
    let p = 1;
    const conds = [`g."status" = 'ACTIVE'::"GigStatus"`, `g."deletedAt" IS NULL`];
    if (category) {
      conds.push(`g."category" = $${p}`);
      params.push(category);
      p++;
    }
    if (search) {
      const s = `%${search}%`;
      conds.push(
        `(g."title" ILIKE $${p} OR g."description" ILIKE $${p} OR $${p + 1} = ANY(g."tags"))`
      );
      params.push(s, search);
      p += 2;
    }

    const enrichGigRows = async (rows: DbRow[]) => {
      if (rows.length === 0) return [];
      const gigIds = rows.map((r) => r.id as number);
      const fpIds = rows.map((r) => r.freelancer_id as number);

      const [freelancerRows, mediaRows] = await Promise.all([
        sql(
          `SELECT fp.id AS fp_id, u."firstname", u."lastname"
           FROM "FreelancerProfile" fp
           JOIN "User" u ON u."id" = fp."user_id"
           WHERE fp."id" = ANY($1::int[])`,
          [fpIds]
        ),
        sql(
          `SELECT * FROM "GigSampleMedia" WHERE gig_id = ANY($1::int[]) ORDER BY gig_id, "id" ASC`,
          [gigIds]
        ),
      ]);

      const fpMap = new Map<number, Record<string, unknown>>();
      for (const f of freelancerRows) fpMap.set(f.fp_id as number, f);

      const mediaMap = new Map<number, Record<string, unknown>[]>();
      for (const m of mediaRows) {
        const gid = m.gig_id as number;
        if (!mediaMap.has(gid)) mediaMap.set(gid, []);
        mediaMap.get(gid)!.push(m);
      }

      return rows.map((row) => {
        const fp = fpMap.get(row.freelancer_id as number);
        return {
          ...gigRowToClientShape(row),
          sampleMedia: mapSampleMediaRows(mediaMap.get(row.id as number) || []),
          freelancer: { user: { firstname: fp?.firstname, lastname: fp?.lastname } },
        };
      });
    };

    // FIX M8: support cursor-based pagination for deep pages
    if (useCursor) {
      const pag = parseCursorPagination(req.query as Record<string, string | string[] | undefined>);
      if (pag.cursor != null) {
        conds.push(`g."id" < $${p}`);
        params.push(pag.cursor);
        p++;
      }
      const whereSql = conds.join(" AND ");
      const gigRows = await sql(
        `SELECT g.* FROM "Gig" g WHERE ${whereSql} ORDER BY g."id" DESC LIMIT $${p}`,
        [...params, pag.limit + 1]
      );
      const gigs = await enrichGigRows(gigRows);
      const cursorPayload = cursorPaginatedResponse(gigs as (DbRow & Record<string, unknown>)[], pag.limit);
      await cacheSet(cacheKey, cursorPayload);
      return res.status(200).json(new ApiResponse(200, cursorPayload, "All gigs retrieved successfully"));
    }

    // Offset fallback for backward compatibility. Prefer cursor pagination for large catalogs (see above).
    // Count is capped (subquery LIMIT) to avoid full-table COUNT(*) scans.
    const { page = 1, limit = 10 } = req.query;
    const lim = parseInt(String(limit), 10);
    const off = (parseInt(String(page), 10) - 1) * lim;
    const whereSql = conds.join(" AND ");

    const gigRows = await sql(
      `SELECT g.* FROM "Gig" g WHERE ${whereSql} ORDER BY g."createdAt" DESC LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lim, off]
    );
    const total = await sqlCount(
      `SELECT COUNT(*)::int AS count FROM (SELECT 1 FROM "Gig" g WHERE ${whereSql} LIMIT 10001) sub`,
      params
    );
    const gigs = await enrichGigRows(gigRows);

    const offsetPayload = {
      gigs,
      total,
      page: parseInt(String(page), 10),
      limit: lim,
      totalPages: Math.ceil(total / lim),
    };
    await cacheSet(cacheKey, offsetPayload);
    return res.status(200).json(new ApiResponse(200, offsetPayload, "All gigs retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving all gigs: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve all gigs"));
  }
};

const pauseGig: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const { gigId } = req.params;
    const id = parseInt(String(gigId), 10);
    const g = await sqlOne(
      `SELECT g.*, fp."user_id" as "fp_user_id"
       FROM "Gig" g
       JOIN "FreelancerProfile" fp ON fp."id" = g.freelancer_id
       WHERE g."id" = $1 AND g."deletedAt" IS NULL`,
      [id]
    );

    if (!g) return next(new ApiError(404, "Gig not found"));

    const freelancerProfile = await sqlOne(
      `SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [req.user.id]
    );

    if (!freelancerProfile || g.freelancer_id !== freelancerProfile.id) {
      return next(new ApiError(403, "Forbidden: You can only update your own gigs"));
    }

    const newStatus = g.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    const [updated] = await sql(
      `UPDATE "Gig" SET "status" = $1::"GigStatus", "updatedAt" = NOW() WHERE "id" = $2 AND "deletedAt" IS NULL RETURNING *`,
      [newStatus, id]
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          gigRowToClientShape(updated),
          `Gig ${newStatus === "PAUSED" ? "paused" : "activated"} successfully`
        )
      );
  } catch (err) {
    logger.error("Error in pauseGig: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to update gig status"));
  }
};

export {
  createGig,
  createGigDraft,
  updateGig,
  updateGigDraft,
  deleteGig,
  deleteGigDraft,
  getGig,
  getGigAnalytics,
  getFreelancerGigs,
  getAllGigs,
  pauseGig,
};
