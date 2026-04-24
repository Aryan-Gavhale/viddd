import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { getPresignedPutUrl, getPresignedUrl } from "../Utils/s3.js";
import type { AuthUser, ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

const FOLDER_MIME = "application/x-directory";
const FOLDER_KEY = "__vidlancing_folder__";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

function normalizeFolder(f: string | undefined | null): string {
  if (f == null || f === "") return "/";
  let s = f.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s || "/";
}

function sanitizeName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 250) || "file";
}

async function getOrderPartyUserIds(
  orderId: number
): Promise<{ clientUserId: number; freelancerUserId: number } | null> {
  const o = (await sqlOne(
    `SELECT o."client_id" AS "clientId", fp."user_id" AS "fUserId"
     FROM "Order" o
     JOIN "FreelancerProfile" fp ON fp."id" = o."freelancer_id"
     WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
    [orderId]
  )) as { clientId: number; fUserId: number } | null;

  if (!o) return null;
  return { clientUserId: o.clientId, freelancerUserId: o.fUserId };
}

async function assertOrderAccess(user: AuthUser, orderId: number): Promise<void> {
  if (user.role === "ADMIN") return;
  const p = await getOrderPartyUserIds(orderId);
  if (!p) throw new ApiError(404, "Order not found");
  if (user.id !== p.clientUserId && user.id !== p.freelancerUserId) {
    throw new ApiError(403, "Not allowed to access this order's files");
  }
}

function keyBelongsToUserOrder(key: string, orderId: number, userId: number, role: string): boolean {
  if (role === "ADMIN") return true;
  const expected = new RegExp(`^project-files/${orderId}/${userId}/`);
  return expected.test(key);
}

/** After client upload: register DB entry with versioning */
export const uploadFile: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as {
      orderId: number;
      fileName: string;
      fileKey: string;
      fileSize: number;
      mimeType: string;
      folder?: string;
      tags?: unknown[];
    };
    if (!b.orderId || !b.fileName || !b.fileKey) {
      return next(new ApiError(400, "orderId, fileName, and fileKey are required"));
    }
    if (b.mimeType === FOLDER_MIME) {
      return next(new ApiError(400, "Use create-folder for directories"));
    }

    await assertOrderAccess(req.user, b.orderId);
    if (!keyBelongsToUserOrder(b.fileKey, b.orderId, req.user.id, req.user.role)) {
      return next(new ApiError(400, "fileKey does not match this order and user"));
    }

    const folder = normalizeFolder(b.folder);
    const safeName = sanitizeName(b.fileName);
    const tags = Array.isArray(b.tags) ? b.tags : [];

    const prev = await sqlOne(
      `SELECT MAX("version") AS "max" FROM "ProjectFile"
       WHERE "orderId" = $1 AND "folder" = $2 AND "fileName" = $3 AND "isLatest" = true`,
      [b.orderId, folder, safeName]
    );
    const nextVersion = prev?.max != null ? Number(prev.max) + 1 : 1;

    if (nextVersion > 1) {
      await sql(
        `UPDATE "ProjectFile" SET "isLatest" = false
         WHERE "orderId" = $1 AND "folder" = $2 AND "fileName" = $3 AND "isLatest" = true`,
        [b.orderId, folder, safeName]
      );
    }

    const row = await sqlOne(
      `INSERT INTO "ProjectFile" (
        "orderId", "uploadedBy", "fileName", "fileKey", "fileSize", "mimeType", "folder", "version", "isLatest", "tags", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9::jsonb, NOW())
      RETURNING *`,
      [
        b.orderId,
        req.user.id,
        safeName,
        b.fileKey,
        Number(b.fileSize) || 0,
        b.mimeType || "application/octet-stream",
        folder,
        nextVersion,
        JSON.stringify(tags),
      ]
    );

    return res
      .status(201)
      .json(new ApiResponse(201, { file: mapFileRow(row as Record<string, unknown>) }, "File recorded"));
  } catch (e) {
    return next(e instanceof ApiError ? e : new ApiError(500, (e as Error).message));
  }
};

/** List files and folder entries for an order */
export const getFiles: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const orderId = parseInt(String((req.params as { orderId?: string }).orderId), 10);
    if (Number.isNaN(orderId)) {
      return next(new ApiError(400, "orderId is required"));
    }
    await assertOrderAccess(req.user, orderId);
    const q = req.query as { folder?: string; q?: string };
    const folder = normalizeFolder(q.folder);
    const search = (q.q || "").trim();

    const rows = await sql(
      `SELECT pf.*, u."firstname", u."lastname", u."email"
       FROM "ProjectFile" pf
       JOIN "User" u ON u."id" = pf."uploadedBy"
       WHERE pf."orderId" = $1 AND pf."folder" = $2 AND pf."isLatest" = true
         AND ($3 = '' OR pf."fileName" ILIKE '%' || $3 || '%')
       ORDER BY
         CASE WHEN pf."mimeType" = $4 THEN 0 ELSE 1 END,
         pf."fileName" ASC
       LIMIT 200`,
      [orderId, folder, search, FOLDER_MIME]
    );

    const files = (rows as Record<string, unknown>[]).map((r) => mapFileRowWithUser(r));
    return res.json(new ApiResponse(200, { files, folder }, "OK"));
  } catch (e) {
    return next(e instanceof ApiError ? e : new ApiError(500, (e as Error).message));
  }
};

export const createFolder: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as { orderId: number; name: string; parentFolder?: string };
    if (!b.orderId || !b.name) {
      return next(new ApiError(400, "orderId and name are required"));
    }
    await assertOrderAccess(req.user, b.orderId);
    const parent = normalizeFolder(b.parentFolder);
    const name = sanitizeName(b.name);
    if (!name) return next(new ApiError(400, "Invalid folder name"));

    const row = await sqlOne(
      `INSERT INTO "ProjectFile" (
        "orderId", "uploadedBy", "fileName", "fileKey", "fileSize", "mimeType", "folder", "version", "isLatest", "tags", "createdAt"
      ) VALUES ($1, $2, $3, $4, 0, $5, $6, 1, true, '[]'::jsonb, NOW())
      RETURNING *`,
      [b.orderId, req.user.id, name, FOLDER_KEY, FOLDER_MIME, parent]
    );

    return res
      .status(201)
      .json(new ApiResponse(201, { folder: mapFileRow(row as Record<string, unknown>) }, "Folder created"));
  } catch (e) {
    return next(e instanceof ApiError ? e : new ApiError(500, (e as Error).message));
  }
};

export const deleteFile: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const fileId = parseInt(String((req.params as { fileId: string }).fileId), 10);
    if (Number.isNaN(fileId)) return next(new ApiError(400, "fileId is required"));

    const row = (await sqlOne(`SELECT * FROM "ProjectFile" WHERE "id" = $1`, [fileId])) as
      | Record<string, unknown>
      | null;
    if (!row || row.orderId == null) return next(new ApiError(404, "File not found"));
    const orderId = Number(row.orderId);
    await assertOrderAccess(req.user, orderId);

    await sql(`UPDATE "ProjectFile" SET "isLatest" = false WHERE "id" = $1`, [fileId]);

    const od = row.orderId;
    const fd = String(row.folder || "/");
    const fn = String(row.fileName || "");
    const hasLatest = await sqlOne(
      `SELECT 1 AS x FROM "ProjectFile" WHERE "orderId" = $1 AND "folder" = $2 AND "fileName" = $3 AND "isLatest" = true LIMIT 1`,
      [od, fd, fn]
    );
    if (!hasLatest) {
      const nextLatest = await sqlOne(
        `SELECT "id" FROM "ProjectFile" WHERE "orderId" = $1 AND "folder" = $2 AND "fileName" = $3
         ORDER BY "version" DESC LIMIT 1`,
        [od, fd, fn]
      );
      if (nextLatest) {
        await sql(`UPDATE "ProjectFile" SET "isLatest" = true WHERE "id" = $1`, [nextLatest["id"]]);
      }
    }

    return res.json(new ApiResponse(200, { id: fileId }, "File removed"));
  } catch (e) {
    return next(e instanceof ApiError ? e : new ApiError(500, (e as Error).message));
  }
};

export const getFileVersions: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const orderId = parseInt(String((req.query as { orderId?: string }).orderId), 10);
    const fileName = String((req.query as { fileName?: string }).fileName || "").trim();
    if (Number.isNaN(orderId) || !fileName) {
      return next(new ApiError(400, "orderId and fileName are required"));
    }
    const folder = normalizeFolder((req.query as { folder?: string }).folder);
    await assertOrderAccess(req.user, orderId);

    const rows = await sql(
      `SELECT pf.*, u."firstname", u."lastname"
       FROM "ProjectFile" pf
       JOIN "User" u ON u."id" = pf."uploadedBy"
       WHERE pf."orderId" = $1 AND pf."folder" = $2 AND pf."fileName" = $3
       ORDER BY pf."version" DESC
       LIMIT 50`,
      [orderId, folder, sanitizeName(fileName)]
    );
    return res.json(
      new ApiResponse(200, { versions: (rows as Record<string, unknown>[]).map((r) => mapFileRowWithUser(r)) }, "OK")
    );
  } catch (e) {
    return next(e instanceof ApiError ? e : new ApiError(500, (e as Error).message));
  }
};

export const getDownloadUrl: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const fileId = parseInt(String((req.params as { fileId: string }).fileId), 10);
    if (Number.isNaN(fileId)) return next(new ApiError(400, "fileId is required"));

    const row = (await sqlOne(`SELECT * FROM "ProjectFile" WHERE "id" = $1`, [fileId])) as
      | Record<string, unknown>
      | null;
    if (!row || row.orderId == null) return next(new ApiError(404, "File not found"));
    if (row.mimeType === FOLDER_MIME) return next(new ApiError(400, "Folders cannot be downloaded"));
    const orderId = Number(row.orderId);
    await assertOrderAccess(req.user, orderId);

    const key = String(row.fileKey);
    const url = await getPresignedUrl(key, 3600);
    return res.json(
      new ApiResponse(
        200,
        { url, fileName: row.fileName, mimeType: row.mimeType },
        "Download URL created"
      )
    );
  } catch (e) {
    return next(e instanceof ApiError ? e : new ApiError(500, (e as Error).message));
  }
};

/** All virtual folder rows for sidebar tree */
export const listFolderMarkers: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const orderId = parseInt(String((req.params as { orderId?: string }).orderId), 10);
    if (Number.isNaN(orderId)) return next(new ApiError(400, "orderId is required"));
    await assertOrderAccess(req.user, orderId);

    const rows = await sql(
      `SELECT "id", "folder", "fileName", "createdAt" FROM "ProjectFile"
       WHERE "orderId" = $1 AND "mimeType" = $2 AND "isLatest" = true
       ORDER BY "folder" ASC, "fileName" ASC`,
      [orderId, FOLDER_MIME]
    );
    return res.json(new ApiResponse(200, { markers: rows }, "OK"));
  } catch (e) {
    return next(e instanceof ApiError ? e : new ApiError(500, (e as Error).message));
  }
};

export const presignUpload: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as { orderId: number; fileName: string; mimeType: string; fileSize?: number; folder?: string };
    if (!b.orderId || !b.fileName || !b.mimeType) {
      return next(new ApiError(400, "orderId, fileName, and mimeType are required"));
    }
    if (b.mimeType === FOLDER_MIME) {
      return next(new ApiError(400, "Use create-folder for directories"));
    }
    await assertOrderAccess(req.user, b.orderId);
    const folder = normalizeFolder(b.folder);
    const safe = sanitizeName(b.fileName);
    const uid = req.user.id;
    const key = `project-files/${b.orderId}/${uid}/${Date.now()}-${safe}`;

    const maxBytes = 50 * 1024 * 1024 * 1024;
    if (b.fileSize != null && b.fileSize > maxBytes) {
      return next(new ApiError(400, "File too large"));
    }

    const uploadUrl = await getPresignedPutUrl(key, b.mimeType, 3600);
    return res.json(
      new ApiResponse(
        200,
        { uploadUrl, fileKey: key, method: "PUT" as const, folder, headers: { "Content-Type": b.mimeType } },
        "Presigned URL created"
      )
    );
  } catch (e) {
    return next(e instanceof ApiError ? e : new ApiError(500, (e as Error).message));
  }
};

function mapFileRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    orderId: r.orderId,
    uploadedBy: r.uploadedBy,
    fileName: r.fileName,
    fileKey: r.fileKey,
    fileSize: r.fileSize != null ? String(r.fileSize) : "0",
    mimeType: r.mimeType,
    folder: r.folder,
    version: r.version,
    isLatest: r.isLatest,
    tags: r.tags,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

function mapFileRowWithUser(r: Record<string, unknown>) {
  const base = mapFileRow(r);
  return {
    ...base,
    uploader: {
      firstname: r.firstname,
      lastname: r.lastname,
      email: r.email,
    },
  };
}
