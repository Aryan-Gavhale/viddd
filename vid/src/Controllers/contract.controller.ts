import { sql, sqlOne, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { PoolClient } from "pg";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

function substituteContent(template: string, variables: Record<string, string | number | undefined | null>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = variables[key];
    if (v === undefined || v === null) return `{{${key}}}`;
    return String(v);
  });
}

type OrderForContract = {
  id: number;
  clientId?: number;
  client_id?: number;
  title?: string;
  freelancerId?: number;
  freelancer_id?: number;
  deletedAt?: Date | null;
};

export const getTemplates: H = async (req, res, next) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const t = q.type;
    const params: unknown[] = [];
    let wh = `WHERE "isActive" = true`;
    if (t) {
      wh += ` AND "type" = $1`;
      params.push(t);
    }
    const rows = await sql(`SELECT * FROM "ContractTemplate" ${wh} ORDER BY "name"`, params);
    return res.status(200).json(new ApiResponse(200, rows, "Templates retrieved"));
  } catch (e) {
    logger.error("getTemplates: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to list templates"));
  }
};

export const createContract: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as {
      templateId: number;
      variables?: Record<string, string | number>;
      orderId?: number;
      title?: string;
      expiresAt?: string | null;
    };

    if (b.templateId == null) return next(new ApiError(400, "templateId is required"));
    const tmpl = (await sqlOne(`SELECT * FROM "ContractTemplate" WHERE "id" = $1 AND "isActive" = true`, [b.templateId])) as Record<string, unknown> | null;
    if (!tmpl) return next(new ApiError(404, "Template not found"));

    const vars: Record<string, string | number> = { ...(b.variables || {}) };
    let orderId: number | null = b.orderId ?? null;
    let clientId: number;
    let freelancerId: number;
    let title = b.title && String(b.title).trim() ? String(b.title) : String(tmpl.name);

    if (b.orderId != null) {
      const o = (await sqlOne(
        `SELECT o."id", o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId", o."title", o."deletedAt"
         FROM "Order" o WHERE o."id" = $1`,
        [b.orderId]
      )) as OrderForContract | null;
      if (!o || o.deletedAt) return next(new ApiError(404, "Order not found"));
      const fp = (await sqlOne(`SELECT "user_id" AS "userId" FROM "FreelancerProfile" WHERE "id" = $1`, [o.freelancerId ?? o.freelancer_id])) as { userId: number } | null;
      if (!fp) return next(new ApiError(400, "Order freelancer not found"));
      orderId = o.id;
      clientId = o.clientId ?? (o.client_id as number);
      freelancerId = fp.userId;
      if (!b.title) title = `${tmpl.name} — Order #${o.id}`;

      const uid = req.user.id;
      if (uid !== clientId && uid !== freelancerId) {
        return next(new ApiError(403, "You are not a party to this order"));
      }

      if (vars["clientName"] == null) {
        const cu = (await sqlOne(`SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`, [clientId])) as Record<string, unknown> | null;
        if (cu) vars["clientName"] = `${String(cu.firstname ?? "")} ${String(cu.lastname ?? "")}`.trim();
      }
      if (vars["freelancerName"] == null) {
        const fu = (await sqlOne(`SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`, [freelancerId])) as Record<string, unknown> | null;
        if (fu) vars["freelancerName"] = `${String(fu.firstname ?? "")} ${String(fu.lastname ?? "")}`.trim();
      }
    } else {
      const bRec = b as { clientId?: number; freelancerId?: number };
      const cId = bRec.clientId != null ? Number(bRec.clientId) : null;
      const fId = bRec.freelancerId != null ? Number(bRec.freelancerId) : null;
      if (cId == null || fId == null) {
        return next(new ApiError(400, "orderId is required, or pass clientId and freelancerId in the request body"));
      }
      clientId = cId;
      freelancerId = fId;
      const uid = req.user.id;
      if (uid !== clientId && uid !== freelancerId) {
        return next(new ApiError(403, "You must be the client or freelancer on this contract"));
      }
    }

    const content = substituteContent(String(tmpl.content), vars);
    const exp = b.expiresAt ? new Date(b.expiresAt) : null;
    if (b.expiresAt && exp && isNaN(exp.getTime())) return next(new ApiError(400, "Invalid expiresAt"));

    const con = await withTransaction(async (client: PoolClient) => {
      const ins = await client.query(
        `INSERT INTO "Contract" (
          "templateId", "orderId", "clientId", "freelancerId", "title", "content", "status", "expiresAt", "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,'DRAFT',$7,NOW(),NOW()) RETURNING *`,
        [b.templateId, orderId, clientId, freelancerId, title, content, exp && !isNaN(exp.getTime()) ? exp : null]
      );
      return ins.rows[0];
    });

    return res.status(201).json(new ApiResponse(201, con, "Contract created"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("createContract: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to create contract"));
  }
};

export const getMyContracts: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const uid = req.user.id;
    const rows = await sql(
      `SELECT c.*, t."name" AS "templateName", t."type" AS "templateType"
       FROM "Contract" c
       LEFT JOIN "ContractTemplate" t ON t."id" = c."templateId"
       WHERE c."clientId" = $1 OR c."freelancerId" = $1
       ORDER BY c."createdAt" DESC`,
      [uid]
    );
    return res.status(200).json(new ApiResponse(200, rows, "Contracts retrieved"));
  } catch (e) {
    logger.error("getMyContracts: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to list contracts"));
  }
};

export const getContract: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const id = parseInt((req.params as { id?: string }).id || "", 10);
    if (!id) return next(new ApiError(400, "Invalid contract id"));

    const c = (await sqlOne(
      `SELECT c.*, t."name" AS "templateName", t."type" AS "templateType"
       FROM "Contract" c
       LEFT JOIN "ContractTemplate" t ON t."id" = c."templateId"
       WHERE c."id" = $1`,
      [id]
    )) as Record<string, unknown> | null;

    if (!c) return next(new ApiError(404, "Contract not found"));
    if (c.clientId !== req.user.id && c.freelancerId !== req.user.id) {
      return next(new ApiError(403, "Forbidden"));
    }
    return res.status(200).json(new ApiResponse(200, c, "Contract retrieved"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("getContract: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get contract"));
  }
};

export const signContract: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const id = parseInt((req.params as { id?: string }).id || "", 10);
    if (!id) return next(new ApiError(400, "Invalid contract id"));
    const role = (req.body as { role?: string }).role;
    if (role !== "CLIENT" && role !== "FREELANCER") {
      return next(new ApiError(400, "role must be CLIENT or FREELANCER"));
    }

    const c = (await sqlOne(`SELECT * FROM "Contract" WHERE "id" = $1`, [id])) as Record<string, unknown> | null;
    if (!c) return next(new ApiError(404, "Contract not found"));
    if (c.status === "CANCELLED") return next(new ApiError(400, "Contract is cancelled"));

    const uid = req.user.id;
    if (role === "CLIENT" && c.clientId !== uid) return next(new ApiError(403, "Not the client on this contract"));
    if (role === "FREELANCER" && c.freelancerId !== uid) return next(new ApiError(403, "Not the freelancer on this contract"));

    const up = (await sqlOne(
      `UPDATE "Contract" AS c
       SET
         "clientSignedAt" = COALESCE(
           CASE WHEN $1 = 'CLIENT' THEN NOW()::timestamptz END,
           c."clientSignedAt"
         ),
         "freelancerSignedAt" = COALESCE(
           CASE WHEN $1 = 'FREELANCER' THEN NOW()::timestamptz END,
           c."freelancerSignedAt"
         ),
         "status" = CASE
           WHEN
             COALESCE(
               CASE WHEN $1 = 'CLIENT' THEN NOW()::timestamptz END,
               c."clientSignedAt"
             ) IS NOT NULL
             AND COALESCE(
               CASE WHEN $1 = 'FREELANCER' THEN NOW()::timestamptz END,
               c."freelancerSignedAt"
             ) IS NOT NULL
           THEN 'SIGNED'
           ELSE 'PARTIALLY_SIGNED'
         END,
         "updatedAt" = NOW()
       WHERE c."id" = $2
       RETURNING *`,
      [role, id]
    )) as Record<string, unknown> | null;

    return res.status(200).json(new ApiResponse(200, up, "Contract signed"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("signContract: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to sign contract"));
  }
};
