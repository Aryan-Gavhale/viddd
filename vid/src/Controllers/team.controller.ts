/**
 * Team management for clients.
 *
 * Members are stored in `TeamMember`. Invites are tokenised emails; on
 * accept we link the invitee's user id to the row. Permission semantics
 * (what each role can do) are intentionally out-of-scope; this controller
 * only manages membership records.
 */
import crypto from "crypto";
import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { queueEmail } from "../Queues/processors.js";
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

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const listTeamMembers: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const rows = await sql(
      `SELECT tm."id", tm."inviteEmail", tm."role", tm."status",
              tm."invitedAt", tm."acceptedAt",
              u."firstname", u."lastname", u."profilePicture", u."email" AS "memberEmail"
         FROM "TeamMember" tm
         LEFT JOIN "User" u ON u."id" = tm."memberUserId"
        WHERE tm."ownerUserId" = $1
        ORDER BY tm."invitedAt" DESC`,
      [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, { members: rows }, "Team members fetched"));
  } catch (err) {
    logger.error("listTeamMembers: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to fetch team"));
  }
};

export const inviteTeamMember: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { email, role } = req.body as { email?: string; role?: string };
    if (!email) return next(new ApiError(400, "email is required"));

    const existingMember = await sqlOne(
      `SELECT * FROM "TeamMember" WHERE "ownerUserId" = $1 AND "inviteEmail" = $2`,
      [req.user.id, email]
    );
    if (existingMember) {
      return next(new ApiError(409, "An invite for that email already exists"));
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const inserted = await sqlOne(
      `INSERT INTO "TeamMember" ("ownerUserId", "inviteEmail", "role", "status", "inviteToken", "inviteExpiry")
       VALUES ($1, $2, $3, 'PENDING', $4, $5)
       RETURNING *`,
      [req.user.id, email, role || "VIEWER", token, expiry]
    );

    const link = `${FRONTEND_URL}/team/accept?token=${token}`;
    try {
      await queueEmail(
        email,
        "You've been invited to a Vidlancing team",
        `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
           <h2 style="color:#7c3aed;">Team invitation</h2>
           <p>You've been invited to join a team on Vidlancing as a <strong>${role || "VIEWER"}</strong>.</p>
           <a href="${link}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">Accept invite</a>
           <p style="color:#6b7280;font-size:13px;">This link expires in 7 days.</p>
         </div>`
      );
    } catch (err) {
      logger.warn("inviteTeamMember: failed to queue email: %s", (err as Error).message);
    }

    return res.status(201).json(new ApiResponse(201, inserted, "Invite sent"));
  } catch (err) {
    logger.error("inviteTeamMember: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to send invite"));
  }
};

export const updateTeamMemberRole: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const id = parseInt(String(req.params.id || ""), 10);
    const { role } = req.body as { role?: string };
    if (!id || !role) return next(new ApiError(400, "id and role are required"));

    const result = await sql(
      `UPDATE "TeamMember" SET "role" = $1, "updatedAt" = NOW()
        WHERE "id" = $2 AND "ownerUserId" = $3 RETURNING "id"`,
      [role, id, req.user.id]
    );
    if (!result.length) return next(new ApiError(404, "Team member not found"));
    return res.status(200).json(new ApiResponse(200, null, "Role updated"));
  } catch (err) {
    logger.error("updateTeamMemberRole: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to update role"));
  }
};

export const removeTeamMember: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const id = parseInt(String(req.params.id || ""), 10);
    if (!id) return next(new ApiError(400, "id is required"));
    const result = await sql(
      `DELETE FROM "TeamMember" WHERE "id" = $1 AND "ownerUserId" = $2 RETURNING "id"`,
      [id, req.user.id]
    );
    if (!result.length) return next(new ApiError(404, "Team member not found"));
    return res.status(200).json(new ApiResponse(200, null, "Member removed"));
  } catch (err) {
    logger.error("removeTeamMember: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to remove member"));
  }
};

export const acceptTeamInvite: Handler = async (req, res, next) => {
  try {
    const q = req.query as Record<string, string | string[] | undefined>;
    const token = Array.isArray(q.token) ? q.token[0] : q.token;
    if (!token) return next(new ApiError(400, "token is required"));

    const invite = (await sqlOne(
      `SELECT * FROM "TeamMember" WHERE "inviteToken" = $1`,
      [token]
    )) as DbRow | null;
    if (!invite) return next(new ApiError(404, "Invalid invite token"));
    if (invite.inviteExpiry && new Date(invite.inviteExpiry as string).getTime() < Date.now()) {
      return next(new ApiError(400, "Invite has expired"));
    }

    if (!req.user?.id) {
      return res.status(200).json(
        new ApiResponse(
          200,
          { needsLogin: true, email: invite.inviteEmail },
          "Sign in or create an account to accept this invite"
        )
      );
    }

    const me = (await sqlOne(`SELECT "id", "email" FROM "User" WHERE "id" = $1`, [req.user.id])) as
      | DbRow
      | null;
    if (!me) return next(new ApiError(404, "User not found"));
    if (String(me.email).toLowerCase() !== String(invite.inviteEmail).toLowerCase()) {
      return next(new ApiError(403, "This invite is for a different email"));
    }

    await sql(
      `UPDATE "TeamMember"
          SET "memberUserId" = $1,
              "status" = 'ACTIVE',
              "acceptedAt" = NOW(),
              "inviteToken" = NULL,
              "inviteExpiry" = NULL,
              "updatedAt" = NOW()
        WHERE "id" = $2`,
      [me.id, invite.id]
    );
    return res.status(200).json(new ApiResponse(200, null, "Invite accepted"));
  } catch (err) {
    logger.error("acceptTeamInvite: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to accept invite"));
  }
};
