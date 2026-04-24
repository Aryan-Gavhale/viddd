import { sql, sqlOne, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { PoolClient } from "pg";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

type SlotIn = {
  id?: number;
  dayOfWeek?: number | null;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  timezone?: string;
  note?: string | null;
};

export const setAvailability: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as { slots?: SlotIn[] };
    const slots = b.slots;
    if (!Array.isArray(slots) || slots.length === 0) {
      return next(new ApiError(400, "slots array is required"));
    }

    const uid = req.user.id;

    for (const s of slots) {
      const specDate = s.specificDate && String(s.specificDate).trim() ? String(s.specificDate).slice(0, 10) : null;
      const dow = s.dayOfWeek != null && s.dayOfWeek >= 0 && s.dayOfWeek <= 6 ? s.dayOfWeek : null;
      if (!specDate && dow === null) {
        return next(new ApiError(400, "Each slot must include dayOfWeek (0–6) or specificDate"));
      }
      if (!s.startTime || !s.endTime) {
        return next(new ApiError(400, "Each slot needs startTime and endTime"));
      }
    }

    await withTransaction(async (client: PoolClient) => {
      await client.query(`DELETE FROM "AvailabilitySlot" WHERE "userId" = $1`, [uid]);
      for (const s of slots) {
        const specDate = s.specificDate && String(s.specificDate).trim() ? String(s.specificDate).slice(0, 10) : null;
        const dow = s.dayOfWeek != null && s.dayOfWeek >= 0 && s.dayOfWeek <= 6 ? s.dayOfWeek : null;
        await client.query(
          `INSERT INTO "AvailabilitySlot" (
            "userId", "dayOfWeek", "specificDate", "startTime", "endTime", "isAvailable", "timezone", "note", "createdAt"
          ) VALUES ($1,$2,$3::date,$4::time,$5::time,$6,$7,$8,NOW())`,
          [
            uid,
            specDate ? null : dow,
            specDate,
            s.startTime,
            s.endTime,
            s.isAvailable !== false,
            s.timezone || "UTC",
            s.note ?? null,
          ]
        );
      }
    });

    const rows = await sql(`SELECT * FROM "AvailabilitySlot" WHERE "userId" = $1 ORDER BY "dayOfWeek" NULLS LAST, "specificDate" NULLS LAST, "startTime"`, [uid]);
    return res.status(200).json(new ApiResponse(200, rows, "Availability updated"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("setAvailability: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to set availability"));
  }
};

export const getMyAvailability: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const rows = await sql(
      `SELECT * FROM "AvailabilitySlot" WHERE "userId" = $1 ORDER BY "dayOfWeek" NULLS LAST, "specificDate" NULLS LAST, "startTime"`,
      [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, rows, "Availability retrieved"));
  } catch (e) {
    logger.error("getMyAvailability: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get availability"));
  }
};

export const getFreelancerAvailability: H = async (req, res, next) => {
  try {
    const userId = parseInt((req.params as { userId?: string }).userId || "", 10);
    if (!userId) return next(new ApiError(400, "Invalid user id"));

    const u = await sqlOne(`SELECT "id" FROM "User" WHERE "id" = $1 AND "isActive" = true`, [userId]);
    if (!u) return next(new ApiError(404, "User not found"));

    const rows = await sql(
      `SELECT "id", "userId", "dayOfWeek", "specificDate", "startTime", "endTime", "isAvailable", "timezone", "note", "createdAt"
       FROM "AvailabilitySlot" WHERE "userId" = $1 ORDER BY "dayOfWeek" NULLS LAST, "specificDate" NULLS LAST, "startTime"`,
      [userId]
    );
    return res.status(200).json(new ApiResponse(200, { userId, slots: rows }, "Availability retrieved"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("getFreelancerAvailability: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get availability"));
  }
};

export const deleteSlot: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const slotId = parseInt((req.params as { slotId?: string }).slotId || "", 10);
    if (!slotId) return next(new ApiError(400, "Invalid slot id"));

    const r = await sqlOne(`DELETE FROM "AvailabilitySlot" WHERE "id" = $1 AND "userId" = $2 RETURNING *`, [slotId, req.user.id]);
    if (!r) return next(new ApiError(404, "Slot not found"));

    return res.status(200).json(new ApiResponse(200, r, "Slot deleted"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("deleteSlot: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to delete slot"));
  }
};
