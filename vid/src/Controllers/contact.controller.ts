import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { DbRow } from "../types/index.js";
import { sql, sqlOne, sqlCount } from "../db.js";
import sanitizeHtml from "sanitize-html";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import { ApiError } from "../Utils/ApiError.js";

const validCategories = ["TECHNICAL", "BILLING", "ACCOUNT", "FEATURE", "OTHER"];
const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const validContactMethods = ["EMAIL", "PHONE", "ANY"];
const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const validateFormData = (data: Record<string, unknown>): string[] => {
  const errors: string[] = [];
  if (!String(data.firstName ?? "").trim()) errors.push("First name is required");
  if (!String(data.lastName ?? "").trim()) errors.push("Last name is required");
  if (!String(data.email ?? "").trim()) errors.push("Email is required");
  if (!String(data.subject ?? "").trim()) errors.push("Subject is required");
  if (!String(data.message ?? "").trim()) errors.push("Message is required");
  if (data.email && !/^\S+@\S+\.\S+$/.test(String(data.email))) errors.push("Invalid email format");
  if (data.category && !validCategories.includes(String(data.category)))
    errors.push(`Invalid category`);
  if (data.priority && !validPriorities.includes(String(data.priority)))
    errors.push(`Invalid priority`);
  if (data.contactMethod && !validContactMethods.includes(String(data.contactMethod)))
    errors.push(`Invalid contact method`);
  if (data.phone && !/^\+?[\d\s-]{7,15}$/.test(String(data.phone))) errors.push("Invalid phone number format");
  return errors;
};

const validateUpdateData = (data: Record<string, unknown>): string[] => {
  const errors: string[] = [];
  if (data.status && !validStatuses.includes(String(data.status))) errors.push(`Invalid status`);
  if (data.isResolved !== undefined && typeof data.isResolved !== "boolean") errors.push("isResolved must be a boolean");
  if (data.resolutionNotes && typeof data.resolutionNotes !== "string") errors.push("resolutionNotes must be a string");
  return errors;
};

const sanitizeInput = (data: Record<string, unknown>) => ({
  firstName: sanitizeHtml(String(data.firstName ?? "").trim() || ""),
  lastName: sanitizeHtml(String(data.lastName ?? "").trim() || ""),
  email: sanitizeHtml(String(data.email ?? "").trim() || ""),
  phone: data.phone ? sanitizeHtml(String(data.phone).trim()) : null,
  category: sanitizeHtml(String(data.category ?? "").trim() || "OTHER"),
  subject: sanitizeHtml(String(data.subject ?? "").trim() || ""),
  message: sanitizeHtml(String(data.message ?? "").trim() || "", { allowedTags: [], allowedAttributes: {} }),
  priority: sanitizeHtml(String(data.priority ?? "").trim() || "MEDIUM"),
  contactMethod: sanitizeHtml(String(data.contactMethod ?? "").trim() || "EMAIL"),
  description: data.description ? sanitizeHtml(String(data.description).trim()) : null,
  status: data.status ? sanitizeHtml(String(data.status).trim()) : undefined,
  isResolved: data.isResolved !== undefined ? Boolean(data.isResolved) : undefined,
  resolutionNotes: data.resolutionNotes
    ? sanitizeHtml(String(data.resolutionNotes).trim(), { allowedTags: [] })
    : undefined,
  assignedAdminId: data.assignedAdminId
    ? sanitizeHtml(String(data.assignedAdminId).trim())
    : undefined,
  note: data.note ? sanitizeHtml(String(data.note).trim(), { allowedTags: [] }) : undefined,
});

export const createContactSubmission = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { body, files = [] } = req as ExpressRequest & {
      body: Record<string, unknown>;
      files?: Express.Multer.File[];
    };
    const sanitizedData = sanitizeInput(body);
    const validationErrors = validateFormData(sanitizedData);
    if (validationErrors.length > 0) {
      return res.status(400).json(new ApiResponse(400, { errors: validationErrors }, "Validation failed"));
    }

    const contactSubmission = (await sqlOne(
      `INSERT INTO "ContactSubmission" ("firstName", "lastName", "email", "phone", "category", "subject", "message", "priority", "contactMethod", "status", "isResolved", "lastActionAt", "createdBy", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', false, NOW(), $10, NOW())
       RETURNING *`,
      [sanitizedData.firstName, sanitizedData.lastName, sanitizedData.email, sanitizedData.phone, sanitizedData.category, sanitizedData.subject, sanitizedData.message, sanitizedData.priority, sanitizedData.contactMethod, req.user?.id || null]
    )) as DbRow | null;
    if (!contactSubmission) {
      return res.status(500).json(new ApiResponse(500, null, "Failed to create submission"));
    }

    const fileRecords: DbRow[] = [];
    if (files.length > 0) {
      for (const file of files) {
        const fileRecord = (await sqlOne(
          `INSERT INTO "ContactFile" ("contactSubmissionId", "fileName", "fileUrl", "fileType", "fileSize", "description")
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [contactSubmission.id, file.originalname, `/uploads/contact/${file.filename}`, file.mimetype, file.size, sanitizedData.description || null]
        )) as DbRow;
        fileRecords.push(fileRecord);
      }
    }

    return res.status(201).json(new ApiResponse(201, { contactSubmission, files: fileRecords }, "Contact submission created successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
};

export const getContactSubmissions = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { status, priority, category, isResolved, email, page = 1, limit = 20, sort } = req.query as Record<
      string,
      string | string[] | undefined
    >;
    const skip = (Number(page) - 1) * Number(limit);
    const lim = Number(limit);

    const whereParts: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (status) { whereParts.push(`"status" = $${p}`); params.push(status); p++; }
    if (priority) { whereParts.push(`"priority" = $${p}`); params.push(priority); p++; }
    if (category) { whereParts.push(`"category" = $${p}`); params.push(category); p++; }
    if (isResolved) { whereParts.push(`"isResolved" = $${p}`); params.push(isResolved === "true"); p++; }
    if (email) { whereParts.push(`"email" ILIKE $${p}`); params.push(`%${email}%`); p++; }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
    const sortParam = sort === undefined ? undefined : Array.isArray(sort) ? sort[0] : sort;
    const ALLOWED_SORT_FIELDS: Record<string, string> = {
      createdAt: '"createdAt"',
      updatedAt: '"updatedAt"',
      email: '"email"',
      status: '"status"',
      priority: '"priority"',
      category: '"category"',
    };
    const rawField = sortParam ? String(sortParam).replace(/^-/, "") : "createdAt";
    const sortColumn = ALLOWED_SORT_FIELDS[rawField] || ALLOWED_SORT_FIELDS["createdAt"];
    const sortDir = sortParam?.toString().startsWith("-") ? "DESC" : "ASC";

    const countParams = [...params];
    params.push(lim, skip);

    const [submissions, total] = await Promise.all([
      sql(`SELECT * FROM "ContactSubmission" ${whereClause} ORDER BY ${sortColumn} ${sortDir} LIMIT $${p} OFFSET $${p + 1}`, params),
      sqlCount(`SELECT COUNT(*)::int AS count FROM "ContactSubmission" ${whereClause}`, countParams),
    ]);

    return res.status(200).json(new ApiResponse(200, { submissions, total, page: Number(page), limit: lim }, "Submissions retrieved successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
};

export const getContactSubmissionById = async (req, res) => {
  try {
    const submission = await sqlOne(`SELECT * FROM "ContactSubmission" WHERE "id" = $1`, [req.params.id]);
    if (!submission) return res.status(404).json(new ApiResponse(404, null, "Submission not found"));

    const files = await sql(`SELECT * FROM "ContactFile" WHERE "contactSubmissionId" = $1`, [req.params.id]);
    submission.files = files;

    return res.status(200).json(new ApiResponse(200, { submission }, "Submission retrieved successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
};

export const updateContactSubmission = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const sanitizedData = sanitizeInput(req.body as Record<string, unknown>);
    const validationErrors = validateUpdateData(sanitizedData);
    if (validationErrors.length > 0) return res.status(400).json(new ApiResponse(400, { errors: validationErrors }, "Validation failed"));

    const submission = await sqlOne(`SELECT * FROM "ContactSubmission" WHERE "id" = $1`, [req.params.id]);
    if (!submission) return res.status(404).json(new ApiResponse(404, null, "Submission not found"));

    const setClauses: string[] = [`"lastActionAt" = NOW()`, `"updatedBy" = $1`];
    const params: unknown[] = [req.user?.id || null];
    let p = 2;

    if (sanitizedData.status !== undefined) { setClauses.push(`"status" = $${p}`); params.push(sanitizedData.status); p++; }
    if (sanitizedData.isResolved !== undefined) { setClauses.push(`"isResolved" = $${p}`); params.push(sanitizedData.isResolved); p++; }
    if (sanitizedData.resolutionNotes !== undefined) { setClauses.push(`"resolutionNotes" = $${p}`); params.push(sanitizedData.resolutionNotes); p++; }

    params.push(req.params.id);
    const updated = (await sqlOne(`UPDATE "ContactSubmission" SET ${setClauses.join(", ")} WHERE "id" = $${p} RETURNING *`, params)) as (DbRow & { files?: unknown }) | null;
    if (!updated) return res.status(500).json(new ApiResponse(500, null, "Update failed"));
    const files = await sql(`SELECT * FROM "ContactFile" WHERE "contactSubmissionId" = $1`, [req.params.id]);
    updated.files = files;

    return res.status(200).json(new ApiResponse(200, { submission: updated }, "Submission updated successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
};

export const deleteContactSubmission = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const submission = await sqlOne(`SELECT * FROM "ContactSubmission" WHERE "id" = $1`, [req.params.id]);
    if (!submission) return res.status(404).json(new ApiResponse(404, null, "Submission not found"));

    await sql(`DELETE FROM "ContactFile" WHERE "contactSubmissionId" = $1`, [req.params.id]);
    await sql(`DELETE FROM "ContactSubmission" WHERE "id" = $1`, [req.params.id]);

    return res.status(204).json(new ApiResponse(204, null, "Submission deleted successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
};

export const assignAdminToSubmission = async (req, res) => {
  try {
    const { adminId } = req.body;
    if (!adminId) return res.status(400).json(new ApiResponse(400, null, "Admin ID is required"));

    const submission = await sqlOne(`SELECT * FROM "ContactSubmission" WHERE "id" = $1`, [req.params.id]);
    if (!submission) return res.status(404).json(new ApiResponse(404, null, "Submission not found"));

    const newStatus = submission.status === "PENDING" ? "IN_PROGRESS" : submission.status;
    const updated = (await sqlOne(
      `UPDATE "ContactSubmission" SET "assignedAdminId" = $1, "status" = $2, "lastActionAt" = NOW(), "updatedBy" = $3 WHERE "id" = $4 RETURNING *`,
      [adminId, newStatus, req.user?.id || null, req.params.id]
    )) as (DbRow & { files?: unknown }) | null;
    if (!updated) {
      return res.status(500).json(new ApiResponse(500, null, "Update failed"));
    }
    const files = await sql(`SELECT * FROM "ContactFile" WHERE "contactSubmissionId" = $1`, [req.params.id]);
    updated.files = files;

    return res.status(200).json(new ApiResponse(200, { submission: updated }, "Admin assigned successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
};

export const addResolutionNote = async (req, res) => {
  try {
    const { note } = req.body;
    const sanitizedData = sanitizeInput({ note });
    if (!sanitizedData.note) return res.status(400).json(new ApiResponse(400, null, "Note is required"));

    const submission = await sqlOne(`SELECT * FROM "ContactSubmission" WHERE "id" = $1`, [req.params.id]);
    if (!submission) return res.status(404).json(new ApiResponse(404, null, "Submission not found"));

    const newNotes = submission.resolutionNotes
      ? `${submission.resolutionNotes}\n${new Date().toISOString()}: ${sanitizedData.note}`
      : `${new Date().toISOString()}: ${sanitizedData.note}`;

    const updated = (await sqlOne(
      `UPDATE "ContactSubmission" SET "resolutionNotes" = $1, "lastActionAt" = NOW(), "updatedBy" = $2 WHERE "id" = $3 RETURNING *`,
      [newNotes, req.user?.id || null, req.params.id]
    )) as (DbRow & { files?: unknown }) | null;
    if (!updated) {
      return res.status(500).json(new ApiResponse(500, null, "Update failed"));
    }
    const files = await sql(`SELECT * FROM "ContactFile" WHERE "contactSubmissionId" = $1`, [req.params.id]);
    updated.files = files;

    return res.status(200).json(new ApiResponse(200, { submission: updated }, "Note added successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
};

export const getSubmissionFiles = async (req, res) => {
  try {
    const submission = await sqlOne(`SELECT "id" FROM "ContactSubmission" WHERE "id" = $1`, [req.params.id]);
    if (!submission) return res.status(404).json(new ApiResponse(404, null, "Submission not found"));

    const files = await sql(`SELECT * FROM "ContactFile" WHERE "contactSubmissionId" = $1`, [req.params.id]);
    return res.status(200).json(new ApiResponse(200, { files }, "Files retrieved successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
};

export const deleteSubmissionFile = async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const file = await sqlOne(`SELECT * FROM "ContactFile" WHERE "id" = $1 AND "contactSubmissionId" = $2`, [req.params.fileId, req.params.id]);
    if (!file) return res.status(404).json(new ApiResponse(404, null, "File not found"));

    await sql(`DELETE FROM "ContactFile" WHERE "id" = $1`, [req.params.fileId]);
    await sql(`UPDATE "ContactSubmission" SET "lastActionAt" = NOW(), "updatedBy" = $1 WHERE "id" = $2`, [req.user?.id || null, req.params.id]);

    return res.status(204).json(new ApiResponse(204, null, "File deleted successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return res.status(500).json(new ApiResponse(500, null, "Internal server error"));
  }
};

export const submitContact = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    const { firstName, lastName, email, subject, message, category, priority, contactMethod } = req.body as Record<string, string>;
    const phone = (req.body as Record<string, string>).phone || null;
    if (!firstName || !lastName || !email || !subject || !message) return next(new ApiError(400, "Missing required fields"));

    const contact = (await sqlOne(
      `INSERT INTO "Contact" ("firstName", "lastName", "email", "phone", "category", "subject", "message", "priority", "contactMethod", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5::"ContactCategory", $6, $7, $8::"ContactPriority", $9::"ContactMethod", 'PENDING'::"ContactStatus", NOW(), NOW()) RETURNING *`,
      [firstName, lastName, email, phone, category || "OTHER", subject, message, priority || "MEDIUM", contactMethod || "EMAIL"]
    )) as DbRow | null;
    if (!contact || contact.id == null) {
      return next(new ApiError(500, "Failed to create contact"));
    }

    return res.status(201).json(new ApiResponse(201, contact, "Contact form submitted successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return next(new ApiError(500, "Failed to submit contact form"));
  }
};

export const getAllContacts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereParts: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (req.query.status) { whereParts.push(`"status" = $${p}`); params.push(req.query.status); p++; }
    if (req.query.category) { whereParts.push(`"category" = $${p}`); params.push(req.query.category); p++; }
    if (req.query.priority) { whereParts.push(`"priority" = $${p}`); params.push(req.query.priority); p++; }
    const where = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const countParams = [...params];
    params.push(limit, skip);
    const [contacts, totalCount] = await Promise.all([
      sql(`SELECT * FROM "Contact" ${where} ORDER BY "createdAt" DESC LIMIT $${p} OFFSET $${p + 1}`, params),
      sqlCount(`SELECT COUNT(*)::int AS count FROM "Contact" ${where}`, countParams),
    ]);

    return res.status(200).json(new ApiResponse(200, { contacts, pagination: { total: totalCount, page, limit, pages: Math.ceil(totalCount / limit) } }, "Contacts retrieved successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return next(new ApiError(500, "Failed to retrieve contacts"));
  }
};

export const getContactById = async (req, res, next) => {
  try {
    const contact = await sqlOne(`SELECT * FROM "Contact" WHERE "id" = $1`, [parseInt(req.params.id)]);
    if (!contact) return next(new ApiError(404, "Contact not found"));
    const files = await sql(`SELECT * FROM "ContactFile" WHERE "contactId" = $1`, [contact.id]);
    contact.files = files;
    return res.status(200).json(new ApiResponse(200, contact, "Contact retrieved successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return next(new ApiError(500, "Failed to retrieve contact"));
  }
};

export const updateContactStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !validStatuses.includes(status)) return next(new ApiError(400, "Invalid status"));
    const contact = await sqlOne(`UPDATE "Contact" SET "status" = $1 WHERE "id" = $2 RETURNING *`, [status, parseInt(req.params.id)]);
    if (!contact) return next(new ApiError(404, "Contact not found"));
    return res.status(200).json(new ApiResponse(200, contact, "Contact status updated successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return next(new ApiError(500, "Failed to update contact status"));
  }
};

export const deleteContact = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    await sql(`DELETE FROM "ContactFile" WHERE "contactId" = $1`, [id]);
    await sql(`DELETE FROM "Contact" WHERE "id" = $1`, [id]);
    return res.status(200).json(new ApiResponse(200, null, "Contact deleted successfully"));
  } catch (error) {
    logger.error((error as Error).message);
    return next(new ApiError(500, "Failed to delete contact"));
  }
};
