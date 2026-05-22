/**
 * Combined user preferences controller (appearance + video + privacy).
 *
 * The Settings UI splits these into three tabs but the backend exposes them
 * as a single `{ appearance, video, privacy }` document so the frontend can
 * fetch once and re-use the same payload across tabs. Each section is
 * persisted in its own table; the shape is normalised here.
 */
import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import {
  ensureVideoPreference,
  ensurePrivacyPreference,
} from "../Services/settingsDefaults.service.js";
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

const APPEARANCE_FIELDS = ["theme", "accentColor", "language", "fontSize"] as const;
const VIDEO_FIELDS = [
  "defaultVideoFormat",
  "defaultResolution",
  "watermarkEnabled",
  "watermarkImageUrl",
  "watermarkPosition",
  "watermarkOpacity",
  "publicVideosScope",
  "privateVideoPassword",
  "autoplayPortfolioVideos",
  "loopVideos",
  "showVideoControls",
] as const;
const PRIVACY_FIELDS = [
  "profileVisibleInSearch",
  "showEarningsOnProfile",
  "allowDataSharing",
] as const;

function pickAppearance(user: DbRow): Record<string, unknown> {
  return {
    theme: user.theme || "system",
    accentColor: user.accentColor || "violet",
    language: user.language || "en",
    fontSize: user.fontSize || "medium",
  };
}

export const getCombinedPreferences: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;

    const [user, video, privacy] = await Promise.all([
      sqlOne(
        `SELECT "theme", "accentColor", "language", "fontSize" FROM "User" WHERE "id" = $1`,
        [userId]
      ),
      ensureVideoPreference(userId),
      ensurePrivacyPreference(userId),
    ]);

    if (!user) return next(new ApiError(404, "User not found"));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          appearance: pickAppearance(user as DbRow),
          video,
          privacy,
        },
        "Preferences fetched"
      )
    );
  } catch (err) {
    logger.error("getCombinedPreferences: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to fetch preferences"));
  }
};

export const updateCombinedPreferences: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const userId = req.user.id;
    const body = req.body as {
      appearance?: Record<string, unknown>;
      video?: Record<string, unknown>;
      privacy?: Record<string, unknown>;
    };

    if (body.appearance) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let p = 1;
      for (const k of APPEARANCE_FIELDS) {
        if (k in body.appearance) {
          sets.push(`"${k}" = $${p++}`);
          vals.push(body.appearance[k]);
        }
      }
      if (sets.length) {
        vals.push(userId);
        await sql(
          `UPDATE "User" SET ${sets.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${p}`,
          vals
        );
      }
    }

    if (body.video) {
      await ensureVideoPreference(userId);
      const sets: string[] = [];
      const vals: unknown[] = [];
      let p = 1;
      for (const k of VIDEO_FIELDS) {
        if (k in body.video) {
          sets.push(`"${k}" = $${p++}`);
          vals.push(body.video[k]);
        }
      }
      if (sets.length) {
        vals.push(userId);
        await sql(
          `UPDATE "VideoPreference" SET ${sets.join(", ")}, "updatedAt" = NOW() WHERE "userId" = $${p}`,
          vals
        );
      }
    }

    if (body.privacy) {
      await ensurePrivacyPreference(userId);
      const sets: string[] = [];
      const vals: unknown[] = [];
      let p = 1;
      for (const k of PRIVACY_FIELDS) {
        if (k in body.privacy) {
          sets.push(`"${k}" = $${p++}`);
          vals.push(body.privacy[k]);
        }
      }
      if (sets.length) {
        vals.push(userId);
        await sql(
          `UPDATE "PrivacyPreference" SET ${sets.join(", ")}, "updatedAt" = NOW() WHERE "userId" = $${p}`,
          vals
        );
      }
    }

    const [user, video, privacy] = await Promise.all([
      sqlOne(
        `SELECT "theme", "accentColor", "language", "fontSize" FROM "User" WHERE "id" = $1`,
        [userId]
      ),
      ensureVideoPreference(userId),
      ensurePrivacyPreference(userId),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          appearance: pickAppearance((user || {}) as DbRow),
          video,
          privacy,
        },
        "Preferences updated"
      )
    );
  } catch (err) {
    logger.error("updateCombinedPreferences: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to update preferences"));
  }
};
