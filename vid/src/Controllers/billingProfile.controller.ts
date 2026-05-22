/**
 * Billing profile (tax + billing address) and invoice export.
 *
 * Used by both the client billing tab and the freelancer Tax sub-tab. The
 * row is lazy-created on first read via the settings defaults helper.
 *
 * Invoice export streams PDFs (when available) into a single ZIP via
 * Node's `archiver` … except we don't want to add another dependency for
 * one feature. To stay dependency-light we instead emit a JSON manifest
 * with download URLs to each invoice's PDF; the frontend can iterate them.
 * This is fine for typical client volumes (<100 invoices/year). When real
 * archiving is needed, swap this for `archiver` in a follow-up.
 */
import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { ensureBillingProfile } from "../Services/settingsDefaults.service.js";
import logger from "../Utils/logger.js";
import type {
  ExpressRequest,
  ExpressResponse,
  NextFunction,
  DbRow,
} from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

const FIELDS = ["taxId", "gstNumber", "companyPan", "billingName", "billingAddress"] as const;

export const getBillingProfile: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const row = await ensureBillingProfile(req.user.id);
    return res.status(200).json(new ApiResponse(200, row, "Billing profile fetched"));
  } catch (err) {
    logger.error("getBillingProfile: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to fetch billing profile"));
  }
};

export const updateBillingProfile: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    await ensureBillingProfile(userId);
    const body = (req.body as Record<string, unknown>) || {};
    const sets: string[] = [];
    const vals: unknown[] = [];
    let p = 1;
    for (const k of FIELDS) {
      if (k in body) {
        sets.push(`"${k}" = $${p++}`);
        if (k === "billingAddress" && body[k] !== null) {
          vals.push(JSON.stringify(body[k]));
        } else {
          vals.push(body[k] === "" ? null : body[k]);
        }
      }
    }
    if (sets.length === 0) {
      return next(new ApiError(400, "No fields to update"));
    }
    vals.push(userId);
    await sql(
      `UPDATE "BillingProfile" SET ${sets.join(", ")}, "updatedAt" = NOW() WHERE "userId" = $${p}`,
      vals
    );
    const fresh = await ensureBillingProfile(userId);
    return res.status(200).json(new ApiResponse(200, fresh, "Billing profile updated"));
  } catch (err) {
    logger.error("updateBillingProfile: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to update billing profile"));
  }
};

export const exportInvoices: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const rows = await sql(
      `SELECT "id", "invoiceNumber", "amount", "status", "createdAt", "pdfUrl"
         FROM "Invoice"
        WHERE "clientId" = $1 OR "freelancerId" IN (
          SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1
        )
        ORDER BY "createdAt" DESC`,
      [userId]
    ).catch(() => []);
    return res.status(200).json(
      new ApiResponse(
        200,
        { invoices: rows, count: rows.length },
        "Invoice manifest fetched"
      )
    );
  } catch (err) {
    logger.error("exportInvoices: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to fetch invoices"));
  }
};
