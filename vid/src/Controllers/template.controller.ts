import { sql, sqlOne, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { PoolClient } from "pg";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const createTemplate: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;
    const template = await sqlOne(
      `INSERT INTO "Template" ("sellerId","title","description","category","software","tags","price","previewVideoUrl","previewImageUrl","fileUrl","fileSize","version","compatibility","status","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'PUBLISHED',NOW(),NOW()) RETURNING *`,
      [req.user.id, String(b.title), b.description || null, String(b.category), String(b.software),
       (b.tags as string[]) || [], Number(b.price || 0), b.previewVideoUrl || null, b.previewImageUrl || null,
       b.fileUrl || null, b.fileSize || null, b.version || "1.0", b.compatibility || null]
    );
    return res.status(201).json(new ApiResponse(201, template, "Template published"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("createTemplate: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to create template"));
  }
};

export const browseTemplates: H = async (req, res, next) => {
  try {
    const q = req.query as Record<string, string>;
    const conditions: string[] = [`t.status='PUBLISHED'`, `t."isActive"=true`];
    const params: unknown[] = [];
    let idx = 1;

    if (q.category) { conditions.push(`t.category=$${idx++}`); params.push(q.category); }
    if (q.software) { conditions.push(`t.software=$${idx++}`); params.push(q.software); }
    if (q.search) { conditions.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx})`); params.push(`%${q.search}%`); idx++; }
    if (q.minPrice) { conditions.push(`t.price >= $${idx++}`); params.push(Number(q.minPrice)); }
    if (q.maxPrice) { conditions.push(`t.price <= $${idx++}`); params.push(Number(q.maxPrice)); }

    const sort = q.sort === "price_asc" ? `t.price ASC` : q.sort === "price_desc" ? `t.price DESC` : q.sort === "popular" ? `t."salesCount" DESC` : `t."createdAt" DESC`;

    const templates = await sql(
      `SELECT t.*, u."firstname" AS "sellerFirst", u."lastname" AS "sellerLast", u."profilePicture" AS "sellerAvatar"
       FROM "Template" t JOIN "User" u ON u.id=t."sellerId"
       WHERE ${conditions.join(" AND ")} ORDER BY ${sort} LIMIT 50`,
      params
    );
    return res.status(200).json(new ApiResponse(200, templates, "Templates retrieved"));
  } catch (e) {
    logger.error("browseTemplates: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to browse templates"));
  }
};

export const getTemplate: H = async (req, res, next) => {
  try {
    const { templateId } = req.params as Record<string, string>;
    const template = await sqlOne(
      `SELECT t.*, u."firstname" AS "sellerFirst", u."lastname" AS "sellerLast", u."profilePicture" AS "sellerAvatar"
       FROM "Template" t JOIN "User" u ON u.id=t."sellerId"
       WHERE t.id=$1 AND t."isActive"=true`, [parseInt(templateId, 10)]
    );
    if (!template) return next(new ApiError(404, "Template not found"));

    const reviews = await sql(
      `SELECT tr.*, u."firstname", u."lastname" FROM "TemplateReview" tr JOIN "User" u ON u.id=tr."userId"
       WHERE tr."templateId"=$1 ORDER BY tr."createdAt" DESC LIMIT 20`,
      [parseInt(templateId, 10)]
    );

    let purchased = false;
    if (req.user?.id) {
      const p = await sqlOne(
        `SELECT id FROM "TemplatePurchase" WHERE "templateId"=$1 AND "buyerId"=$2`,
        [parseInt(templateId, 10), req.user.id]
      );
      purchased = !!p;
    }

    return res.status(200).json(new ApiResponse(200, { ...template, reviews, purchased }, "Template details"));
  } catch (e) {
    logger.error("getTemplate: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get template"));
  }
};

export const purchaseTemplate: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { templateId } = req.params as Record<string, string>;
    const tid = parseInt(templateId, 10);

    const result = await withTransaction(async (client: PoolClient) => {
      const template = (await client.query(`SELECT * FROM "Template" WHERE id=$1 AND "isActive"=true FOR UPDATE`, [tid])).rows[0];
      if (!template) throw new ApiError(404, "Template not found");
      if (template.sellerId === req.user!.id) throw new ApiError(400, "Cannot buy your own template");

      const existing = (await client.query(
        `SELECT id FROM "TemplatePurchase" WHERE "templateId"=$1 AND "buyerId"=$2`, [tid, req.user!.id]
      )).rows[0];
      if (existing) throw new ApiError(409, "Already purchased");

      const commission = Math.round(Number(template.price) * 0.30);
      const sellerPayout = Number(template.price) - commission;

      const purchase = (await client.query(
        `INSERT INTO "TemplatePurchase" ("templateId","buyerId","price","downloadUrl","platformCommission","sellerPayout","purchasedAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
        [tid, req.user!.id, template.price, template.fileUrl, commission, sellerPayout]
      )).rows[0];

      await client.query(`UPDATE "Template" SET "salesCount"="salesCount"+1, "updatedAt"=NOW() WHERE id=$1`, [tid]);

      await client.query(
        `INSERT INTO "PlatformRevenue" ("type","amount","sourceId","sourceType","description","createdAt")
         VALUES ('TEMPLATE_COMMISSION',$1,$2,'TemplatePurchase',$3,NOW())`,
        [commission, purchase.id, `30% commission on template "${template.title}"`]
      );

      return { purchase, downloadUrl: template.fileUrl };
    });

    return res.status(201).json(new ApiResponse(201, result, "Template purchased"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("purchaseTemplate: %s", (e as Error).message);
    return next(new ApiError(500, "Purchase failed"));
  }
};

export const reviewTemplate: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { templateId } = req.params as Record<string, string>;
    const tid = parseInt(templateId, 10);
    const { rating, comment } = req.body as Record<string, unknown>;

    const purchased = await sqlOne(
      `SELECT id FROM "TemplatePurchase" WHERE "templateId"=$1 AND "buyerId"=$2`, [tid, req.user.id]
    );
    if (!purchased) return next(new ApiError(403, "Must purchase before reviewing"));

    const review = await sqlOne(
      `INSERT INTO "TemplateReview" ("templateId","userId","rating","comment","createdAt")
       VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT ("templateId","userId") DO UPDATE SET rating=$3, comment=$4 RETURNING *`,
      [tid, req.user.id, Number(rating), comment || null]
    );

    const stats = await sqlOne(
      `SELECT AVG(rating) AS avg, COUNT(*) AS cnt FROM "TemplateReview" WHERE "templateId"=$1`, [tid]
    );
    await sql(
      `UPDATE "Template" SET rating=$2, "reviewCount"=$3 WHERE id=$1`,
      [tid, Math.round(Number(stats.avg) * 10) / 10, Number(stats.cnt)]
    );

    return res.status(200).json(new ApiResponse(200, review, "Review submitted"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("reviewTemplate: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to review"));
  }
};

export const getMyTemplates: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const templates = await sql(
      `SELECT * FROM "Template" WHERE "sellerId"=$1 AND "isActive"=true ORDER BY "createdAt" DESC`, [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, templates, "Your templates"));
  } catch (e) {
    logger.error("getMyTemplates: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};

export const getMyPurchases: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const purchases = await sql(
      `SELECT tp.*, t.title, t."previewImageUrl", t.software, t.category, u."firstname" AS "sellerFirst", u."lastname" AS "sellerLast"
       FROM "TemplatePurchase" tp JOIN "Template" t ON t.id=tp."templateId" JOIN "User" u ON u.id=t."sellerId"
       WHERE tp."buyerId"=$1 ORDER BY tp."purchasedAt" DESC`,
      [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, purchases, "Your purchases"));
  } catch (e) {
    logger.error("getMyPurchases: %s", (e as Error).message);
    return next(new ApiError(500, "Failed"));
  }
};
