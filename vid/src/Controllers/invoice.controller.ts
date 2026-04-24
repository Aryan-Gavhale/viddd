import { sql, sqlOne, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { PoolClient } from "pg";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function nextInvoiceNumber(client: PoolClient, year: number): Promise<string> {
  await client.query("SELECT pg_advisory_xact_lock($1)", [1000000 + (year % 10000)]);

  const { rows } = await client.query(
    `SELECT "invoiceNumber" FROM "InvoiceRecord" WHERE "invoiceNumber" ~ $1`,
    [`^VID-${year}-[0-9]{5}$`]
  );

  let max = 0;
  for (const r of rows) {
    const m = /VID-\d{4}-(\d{5})$/.exec((r as { invoiceNumber: string }).invoiceNumber);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  return `VID-${year}-${String(next).padStart(5, "0")}`;
}

type OrderRow = {
  id: number;
  client_id?: number;
  clientId?: number;
  gig_id?: number;
  gigId?: number;
  freelancer_id?: number;
  freelancerId?: number;
  totalPrice: unknown;
  title?: string;
  package?: string;
  platformFeeAmount?: number | null;
  clientFeeAmount?: number | null;
  currency?: string;
  status?: string;
  deletedAt?: Date | null;
};

export const createInvoice: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as { orderId?: number; notes?: string; dueDate?: string | null; status?: string };
    if (b.orderId == null) return next(new ApiError(400, "orderId is required"));

    const o = (await sqlOne(
      `SELECT o.*, o."client_id" AS "clientId", o."freelancer_id" AS "freelancerId", o."gig_id" AS "gigId"
       FROM "Order" o WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
      [b.orderId]
    )) as OrderRow | null;

    if (!o) return next(new ApiError(404, "Order not found"));

    const clientId = (o.clientId ?? o.client_id) as number;
    const fp = (await sqlOne(`SELECT "user_id" AS "userId" FROM "FreelancerProfile" WHERE "id" = $1`, [
      o.freelancerId ?? o.freelancer_id,
    ])) as { userId: number } | null;
    if (!fp) return next(new ApiError(400, "Order freelancer profile not found"));
    const freelancerUserId = fp.userId;

    const uid = req.user.id;
    if (uid !== clientId && uid !== freelancerUserId) {
      return next(new ApiError(403, "You are not a party to this order"));
    }

    const toUserId = uid === clientId ? freelancerUserId : clientId;

    const subtotal = Math.round(Number(o.totalPrice ?? 0));
    const platformFee = Math.round(Number(o.platformFeeAmount ?? 0));
    const clientFee = Math.round(Number(o.clientFeeAmount ?? 0));
    const tax = 0;
    const total = subtotal + tax + clientFee;

    const items = [
      {
        description: o.title || `Order #${o.id}`,
        package: o.package || null,
        quantity: 1,
        unitAmount: subtotal,
        lineTotal: subtotal,
      },
    ];

    const year = new Date().getFullYear();
    const dueDate = b.dueDate ? new Date(b.dueDate) : null;
    const status = b.status && ["DRAFT", "SENT", "PAID", "CANCELLED"].includes(b.status) ? b.status : "DRAFT";

    const inv = await withTransaction(async (client: PoolClient) => {
      const invoiceNumber = await nextInvoiceNumber(client, year);
      const ins = await client.query(
        `INSERT INTO "InvoiceRecord" (
          "orderId", "fromUserId", "toUserId", "invoiceNumber", "items", "subtotal", "platformFee", "tax", "total",
          "currency", "status", "dueDate", "notes", "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
        RETURNING *`,
        [
          o.id,
          uid,
          toUserId,
          invoiceNumber,
          JSON.stringify(items),
          subtotal,
          platformFee,
          tax,
          total,
          o.currency || "USD",
          status,
          dueDate && !isNaN(dueDate.getTime()) ? dueDate : null,
          b.notes ?? null,
        ]
      );
      return ins.rows[0];
    });

    return res.status(201).json(new ApiResponse(201, inv, "Invoice created"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("createInvoice: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to create invoice"));
  }
};

export const getMyInvoices: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const q = req.query as Record<string, string | undefined>;
    const page = Math.max(1, parseInt(String(q.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(q.limit || "20"), 10) || 20));
    const offset = (page - 1) * limit;
    const uid = req.user.id;

    const rows = await sql(
      `SELECT i.*, 
         uf."firstname" AS "fromFirstName", uf."lastname" AS "fromLastName", uf."email" AS "fromEmail",
         ut."firstname" AS "toFirstName", ut."lastname" AS "toLastName", ut."email" AS "toEmail"
       FROM "InvoiceRecord" i
       JOIN "User" uf ON uf."id" = i."fromUserId"
       JOIN "User" ut ON ut."id" = i."toUserId"
       WHERE i."fromUserId" = $1 OR i."toUserId" = $1
       ORDER BY i."createdAt" DESC
       LIMIT $2 OFFSET $3`,
      [uid, limit, offset]
    );

    const countRow = await sqlOne(
      `SELECT COUNT(*)::int AS c FROM "InvoiceRecord" WHERE "fromUserId" = $1 OR "toUserId" = $1`,
      [uid]
    );
    const total = (countRow as { c: number } | null)?.c ?? 0;

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { items: rows, page, limit, total },
          "Invoices retrieved"
        )
      );
  } catch (e) {
    logger.error("getMyInvoices: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to list invoices"));
  }
};

export const getInvoice: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const id = parseInt((req.params as { id?: string }).id || "", 10);
    if (!id) return next(new ApiError(400, "Invalid invoice id"));

    const inv = (await sqlOne(
      `SELECT i.*, 
         uf."firstname" AS "fromFirstName", uf."lastname" AS "fromLastName", uf."email" AS "fromEmail",
         ut."firstname" AS "toFirstName", ut."lastname" AS "toLastName", ut."email" AS "toEmail"
       FROM "InvoiceRecord" i
       JOIN "User" uf ON uf."id" = i."fromUserId"
       JOIN "User" ut ON ut."id" = i."toUserId"
       WHERE i."id" = $1`,
      [id]
    )) as Record<string, unknown> | null;

    if (!inv) return next(new ApiError(404, "Invoice not found"));
    if (inv.fromUserId !== req.user.id && inv.toUserId !== req.user.id) {
      return next(new ApiError(403, "Forbidden"));
    }

    return res.status(200).json(new ApiResponse(200, inv, "Invoice retrieved"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("getInvoice: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get invoice"));
  }
};

export const generateInvoicePDF: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const id = parseInt((req.params as { id?: string }).id || "", 10);
    if (!id) return next(new ApiError(400, "Invalid invoice id"));

    const inv = (await sqlOne(
      `SELECT i.*, 
         uf."firstname" AS "fromFirstName", uf."lastname" AS "fromLastName", uf."email" AS "fromEmail",
         ut."firstname" AS "toFirstName", ut."lastname" AS "toLastName", ut."email" AS "toEmail"
       FROM "InvoiceRecord" i
       JOIN "User" uf ON uf."id" = i."fromUserId"
       JOIN "User" ut ON ut."id" = i."toUserId"
       WHERE i."id" = $1`,
      [id]
    )) as Record<string, unknown> | null;

    if (!inv) return next(new ApiError(404, "Invoice not found"));
    if (inv.fromUserId !== req.user.id && inv.toUserId !== req.user.id) {
      return next(new ApiError(403, "Forbidden"));
    }

    const fromName = `${String(inv.fromFirstName ?? "")} ${String(inv.fromLastName ?? "")}`.trim();
    const toName = `${String(inv.toFirstName ?? "")} ${String(inv.toLastName ?? "")}`.trim();
    const items = (Array.isArray(inv.items) ? inv.items : JSON.parse(String(inv.items || "[]"))) as Array<Record<string, unknown>>;

    const lineRowsHtml = items
      .map((it) => {
        const desc = escapeHtml(String(it.description ?? ""));
        const qty = escapeHtml(String(it.quantity ?? 1));
        const lineTotal = escapeHtml(String(it.lineTotal ?? it.unitAmount ?? ""));
        return `<tr><td>${desc}</td><td style="text-align:right">${qty}</td><td style="text-align:right">${lineTotal} ${String(inv.currency)}</td></tr>`;
      })
      .join("");

    const subtotal = Number(inv.subtotal ?? 0);
    const platformFee = Number(inv.platformFee ?? 0);
    const tax = Number(inv.tax ?? 0);
    const total = Number(inv.total ?? 0);

    const issueDate = inv.createdAt ? new Date(String(inv.createdAt)).toISOString().slice(0, 10) : "";
    const due = inv.dueDate ? new Date(String(inv.dueDate)).toISOString().slice(0, 10) : null;

    const headerHtml = `<header><h1>Invoice ${escapeHtml(String(inv.invoiceNumber))}</h1>
      <p>Issue date: ${escapeHtml(issueDate)}${due ? ` &middot; Due: ${escapeHtml(due)}` : ""}</p></header>`;

    const partiesHtml = `<section class="parties">
      <div><strong>From</strong><br/>${escapeHtml(fromName)}<br/>${escapeHtml(String(inv.fromEmail))}</div>
      <div><strong>To</strong><br/>${escapeHtml(toName)}<br/>${escapeHtml(String(inv.toEmail))}</div>
    </section>`;

    const tableHtml = `<table class="line-items" border="1" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse">
      <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${lineRowsHtml}</tbody>
    </table>`;

    const totalsHtml = `<section class="totals">
      <p>Subtotal: ${subtotal} ${String(inv.currency)}</p>
      <p>Platform fee: ${platformFee} ${String(inv.currency)}</p>
      <p>Tax: ${tax} ${String(inv.currency)}</p>
      <p><strong>Total: ${total} ${String(inv.currency)}</strong></p>
    </section>`;

    const notes = inv.notes ? `<section class="notes"><p>${escapeHtml(String(inv.notes))}</p></section>` : "";

    const fullDocumentHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(String(inv.invoiceNumber))}</title></head>
      <body>${headerHtml}${partiesHtml}${tableHtml}${totalsHtml}${notes}</body></html>`;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          kind: "invoice_pdf_data",
          invoice: {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            orderId: inv.orderId,
            status: inv.status,
            currency: inv.currency,
            subtotal: inv.subtotal,
            platformFee: inv.platformFee,
            tax: inv.tax,
            total: inv.total,
            dueDate: inv.dueDate,
            paidAt: inv.paidAt,
            createdAt: inv.createdAt,
          },
          from: { name: fromName, email: inv.fromEmail },
          to: { name: toName, email: inv.toEmail },
          lineItems: items,
          html: {
            header: headerHtml,
            parties: partiesHtml,
            lineItemsTable: tableHtml,
            totals: totalsHtml,
            notes: notes || null,
            fullDocument: fullDocumentHtml,
          },
        },
        "PDF render data"
      )
    );
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("generateInvoicePDF: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to build invoice document"));
  }
};
