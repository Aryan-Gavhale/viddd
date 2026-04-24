import { sql, sqlOne, withTransaction } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { PoolClient } from "pg";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const createTeamProposal: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;
    const members = b.members as Array<{ userId: number; role: string; responsibility?: string; rate?: number }>;

    if (!members || members.length === 0) return next(new ApiError(400, "At least one team member required"));

    const job = await sqlOne(`SELECT id, "userId" FROM "Job" WHERE id=$1`, [Number(b.jobId)]);
    if (!job) return next(new ApiError(404, "Job not found"));

    const result = await withTransaction(async (client: PoolClient) => {
      const totalPrice = members.reduce((s, m) => s + Number(m.rate || 0), 0);

      const proposal = await client.query(
        `INSERT INTO "TeamProposal" ("jobId","leaderId","teamName","coverLetter","totalPrice","estimatedDays","status","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,'PENDING',NOW(),NOW()) RETURNING *`,
        [Number(b.jobId), req.user!.id, String(b.teamName || "Untitled Team"), b.coverLetter || null, totalPrice, Number(b.estimatedDays || 0)]
      );
      const tp = proposal.rows[0];

      for (const m of members) {
        const isSelf = m.userId === req.user!.id;
        await client.query(
          `INSERT INTO "TeamMember" ("proposalId","userId","role","responsibility","rate","status","joinedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [tp.id, m.userId, m.role, m.responsibility || null, m.rate || 0, isSelf ? "ACCEPTED" : "INVITED", isSelf ? new Date() : null]
        );
      }

      const fullMembers = (await client.query(
        `SELECT m.*, u."firstname", u."lastname", u.email FROM "TeamMember" m JOIN "User" u ON u.id=m."userId" WHERE m."proposalId"=$1`,
        [tp.id]
      )).rows;

      return { ...tp, members: fullMembers };
    });

    return res.status(201).json(new ApiResponse(201, result, "Team proposal created"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("createTeamProposal: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to create team proposal"));
  }
};

export const getTeamProposals: H = async (req, res, next) => {
  try {
    const { jobId } = req.params as Record<string, string>;
    const proposals = await sql(
      `SELECT tp.*,
              u."firstname" AS "leaderFirstName", u."lastname" AS "leaderLastName",
              u."profilePicture" AS "leaderAvatar"
       FROM "TeamProposal" tp JOIN "User" u ON u.id=tp."leaderId"
       WHERE tp."jobId"=$1 ORDER BY tp."createdAt" DESC`,
      [parseInt(jobId, 10)]
    );

    const proposalIds = proposals.map((p: any) => p.id as number);
    if (proposalIds.length > 0) {
      const allMembers = await sql(
        `SELECT m.*, u."firstname", u."lastname", u."profilePicture"
         FROM "TeamMember" m JOIN "User" u ON u.id=m."userId"
         WHERE m."proposalId" = ANY($1::int[])`,
        [proposalIds]
      );
      const membersByProposal = new Map<number, Record<string, unknown>[]>();
      for (const m of allMembers) {
        const pid = m.proposalId as number;
        if (!membersByProposal.has(pid)) membersByProposal.set(pid, []);
        membersByProposal.get(pid)!.push(m);
      }
      for (const p of proposals) {
        (p as any).members = membersByProposal.get(p.id as number) || [];
      }
    }
    return res.status(200).json(new ApiResponse(200, proposals, "Team proposals retrieved"));
  } catch (e) {
    logger.error("getTeamProposals: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get proposals"));
  }
};

export const getMyTeamProposals: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const proposals = await sql(
      `SELECT tp.*, j.title AS "jobTitle"
       FROM "TeamProposal" tp JOIN "Job" j ON j.id=tp."jobId"
       WHERE tp."leaderId"=$1 ORDER BY tp."createdAt" DESC`,
      [req.user.id]
    );
    const proposalIdsMy = proposals.map((p: any) => p.id as number);
    if (proposalIdsMy.length > 0) {
      const allMembers = await sql(
        `SELECT m.*, u."firstname", u."lastname"
         FROM "TeamMember" m JOIN "User" u ON u.id=m."userId"
         WHERE m."proposalId" = ANY($1::int[])`,
        [proposalIdsMy]
      );
      const membersByProposal = new Map<number, Record<string, unknown>[]>();
      for (const m of allMembers) {
        const pid = m.proposalId as number;
        if (!membersByProposal.has(pid)) membersByProposal.set(pid, []);
        membersByProposal.get(pid)!.push(m);
      }
      for (const p of proposals) {
        (p as any).members = membersByProposal.get(p.id as number) || [];
      }
    }
    return res.status(200).json(new ApiResponse(200, proposals, "Your team proposals"));
  } catch (e) {
    logger.error("getMyTeamProposals: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get proposals"));
  }
};

export const respondToInvite: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { memberId } = req.params as Record<string, string>;
    const { accept } = req.body as Record<string, unknown>;

    const member = await sqlOne(`SELECT * FROM "TeamMember" WHERE id=$1`, [parseInt(memberId, 10)]);
    if (!member) return next(new ApiError(404, "Invitation not found"));
    if (member.userId !== req.user.id) return next(new ApiError(403, "Not your invitation"));
    if (member.status !== "INVITED") return next(new ApiError(400, "Already responded"));

    const updated = await sqlOne(
      `UPDATE "TeamMember" SET status=$2, "joinedAt"=$3 WHERE id=$1 RETURNING *`,
      [parseInt(memberId, 10), accept ? "ACCEPTED" : "DECLINED", accept ? new Date() : null]
    );

    if (accept) {
      await sql(
        `UPDATE "TeamProposal" SET "updatedAt"=NOW() WHERE id=$1`, [member.proposalId]
      );
    }
    return res.status(200).json(new ApiResponse(200, updated, accept ? "Invitation accepted" : "Invitation declined"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("respondToInvite: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to respond"));
  }
};

export const getMyInvitations: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const invitations = await sql(
      `SELECT m.*, tp."teamName", tp."coverLetter", tp."totalPrice", tp.status AS "proposalStatus",
              j.title AS "jobTitle", j.id AS "jobId",
              u."firstname" AS "leaderFirstName", u."lastname" AS "leaderLastName"
       FROM "TeamMember" m
       JOIN "TeamProposal" tp ON tp.id=m."proposalId"
       JOIN "Job" j ON j.id=tp."jobId"
       JOIN "User" u ON u.id=tp."leaderId"
       WHERE m."userId"=$1 AND m.status='INVITED'
       ORDER BY tp."createdAt" DESC`,
      [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, invitations, "Your invitations"));
  } catch (e) {
    logger.error("getMyInvitations: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get invitations"));
  }
};

export const acceptTeamProposal: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { proposalId } = req.params as Record<string, string>;

    const proposal = await sqlOne(`SELECT tp.*, j."userId" AS "clientId" FROM "TeamProposal" tp JOIN "Job" j ON j.id=tp."jobId" WHERE tp.id=$1`, [parseInt(proposalId, 10)]);
    if (!proposal) return next(new ApiError(404, "Proposal not found"));
    if (proposal.clientId !== req.user.id) return next(new ApiError(403, "Only the job owner can accept"));
    if (proposal.status !== "PENDING") return next(new ApiError(400, "Proposal already handled"));

    const updated = await sqlOne(
      `UPDATE "TeamProposal" SET status='ACCEPTED', "clientNote"=$2, "updatedAt"=NOW() WHERE id=$1 RETURNING *`,
      [parseInt(proposalId, 10), (req.body as Record<string, unknown>).note || null]
    );

    return res.status(200).json(new ApiResponse(200, updated, "Proposal accepted"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("acceptTeamProposal: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to accept"));
  }
};
