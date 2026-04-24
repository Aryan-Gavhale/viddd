import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

const EXP_RANK: Record<string, number> = { ENTRY: 1, INTERMEDIATE: 2, EXPERT: 3 };

function overlapScore(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const matches = a.filter((s) => setB.has(s.toLowerCase())).length;
  return matches / Math.max(a.length, 1);
}

export const findMatches: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const b = req.body as Record<string, unknown>;

    const reqSkills = (b.requiredSkills as string[]) || [];
    const reqSoftware = (b.requiredSoftware as string[]) || [];
    const reqStyle = (b.requiredStyle as string[]) || [];
    const budgetMin = Number(b.budgetMin || 0);
    const budgetMax = Number(b.budgetMax || 999999);
    const reqExp = String(b.experienceLevel || "");

    const matchReq = await sqlOne(
      `INSERT INTO "MatchRequest" ("clientId","jobId","requiredSkills","requiredSoftware","requiredStyle","budgetMin","budgetMax","experienceLevel","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
      [req.user.id, b.jobId || null, reqSkills, reqSoftware, reqStyle, budgetMin, budgetMax, reqExp || null]
    );

    const freelancers = await sql(
      `SELECT fp.*, u.id AS "userId", u."firstname", u."lastname", u."profilePicture",
              COALESCE(oc.cnt, 0) AS "completedOrders",
              COALESCE(rv.avg_rating, 0) AS "avgRating"
       FROM "FreelancerProfile" fp
       JOIN "User" u ON u.id = fp.user_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS cnt FROM "Order" o
         WHERE o."freelancer_id" = fp.id AND o.status = 'COMPLETED'
       ) oc ON true
       LEFT JOIN LATERAL (
         SELECT AVG(r.rating) AS avg_rating FROM "Review" r WHERE r."revieweeId" = u.id
       ) rv ON true
       WHERE fp.availability != 'UNAVAILABLE'
       AND fp."hourlyRate" >= $1 AND fp."hourlyRate" <= $2
       LIMIT 200`,
      [budgetMin, budgetMax]
    );

    const scored = freelancers.map((f: any) => {
      const fSkills = Array.isArray(f.skills) ? f.skills : (typeof f.skills === "object" && f.skills ? Object.keys(f.skills) : []);
      const fSoftware: string[] = Array.isArray(f.softwareExpertise) ? f.softwareExpertise : [];
      const fStyle: string[] = Array.isArray(f.styleTags) ? f.styleTags : [];

      const skillScore = overlapScore(reqSkills, fSkills) * 100;
      const softwareScore = overlapScore(reqSoftware, fSoftware) * 100;
      const styleScore = overlapScore(reqStyle, fStyle) * 100;
      const ratingScore = Math.min((Number(f.avgRating) || 0) * 20, 100);

      let experienceScore = 0;
      if (reqExp) {
        const reqRank = EXP_RANK[reqExp] || 0;
        const fRank = EXP_RANK[f.experienceLevel] || 0;
        experienceScore = fRank >= reqRank ? 100 : (fRank / Math.max(reqRank, 1)) * 100;
      } else {
        experienceScore = (EXP_RANK[f.experienceLevel] || 1) * 33;
      }

      const completedBonus = Math.min(Number(f.completedOrders) * 5, 50);
      const priceScore = f.hourlyRate <= budgetMax * 0.7 ? 100 : f.hourlyRate <= budgetMax ? 60 : 20;

      const overallScore =
        skillScore * 0.30 + softwareScore * 0.20 + styleScore * 0.15 +
        ratingScore * 0.15 + experienceScore * 0.10 + priceScore * 0.05 + completedBonus * 0.05;

      const reasons: string[] = [];
      if (skillScore > 50) reasons.push("Strong skill match");
      if (softwareScore > 50) reasons.push("Software expertise aligns");
      if (styleScore > 50) reasons.push("Similar creative style");
      if (ratingScore > 80) reasons.push("Highly rated");
      if (completedBonus > 25) reasons.push("Proven track record");
      if (priceScore > 80) reasons.push("Within budget");

      return {
        freelancer: {
          userId: f.userId, firstName: f.firstname, lastName: f.lastname,
          profilePicture: f.profilePicture, experienceLevel: f.experienceLevel,
          hourlyRate: f.hourlyRate, rating: Number(f.avgRating) || 0,
          skills: fSkills, softwareExpertise: fSoftware, styleTags: fStyle,
          completedOrders: Number(f.completedOrders),
        },
        scores: {
          overall: Math.round(overallScore * 10) / 10,
          skill: Math.round(skillScore), software: Math.round(softwareScore),
          style: Math.round(styleScore), rating: Math.round(ratingScore),
          experience: Math.round(experienceScore), price: Math.round(priceScore),
        },
        reasons,
      };
    });

    scored.sort((a: any, b: any) => b.scores.overall - a.scores.overall);
    const topResults = scored.slice(0, 20);

    if (topResults.length > 0) {
      const valParts: string[] = [];
      const valParams: unknown[] = [];
      let vi = 1;
      for (let i = 0; i < topResults.length; i++) {
        const r = topResults[i] as any;
        valParts.push(`($${vi},$${vi+1},$${vi+2},$${vi+3},$${vi+4},$${vi+5},$${vi+6},$${vi+7},$${vi+8},$${vi+9},$${vi+10})`);
        valParams.push(matchReq.id, r.freelancer.userId, r.scores.overall, r.scores.skill, r.scores.software,
          r.scores.style, r.scores.rating, r.scores.experience, r.scores.price,
          JSON.stringify(r.reasons), i + 1);
        vi += 11;
      }
      await sql(
        `INSERT INTO "MatchResult" ("requestId","freelancerId","overallScore","skillScore","softwareScore","styleScore","ratingScore","experienceScore","priceScore","matchReasons","rank")
         VALUES ${valParts.join(",")}`,
        valParams
      );
    }

    await sql(`UPDATE "MatchRequest" SET "resultCount"=$2 WHERE id=$1`, [matchReq.id, topResults.length]);

    return res.status(200).json(new ApiResponse(200, {
      requestId: matchReq.id,
      totalCandidates: freelancers.length,
      matches: topResults,
    }, "Matches found"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("findMatches: %s", (e as Error).message);
    return next(new ApiError(500, "Matching failed"));
  }
};

export const getMatchHistory: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const requests = await sql(
      `SELECT * FROM "MatchRequest" WHERE "clientId"=$1 ORDER BY "createdAt" DESC LIMIT 20`, [req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, requests, "Match history"));
  } catch (e) {
    logger.error("getMatchHistory: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get history"));
  }
};

export const getMatchResults: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { requestId } = req.params as Record<string, string>;
    const request = await sqlOne(`SELECT * FROM "MatchRequest" WHERE id=$1 AND "clientId"=$2`, [parseInt(requestId, 10), req.user.id]);
    if (!request) return next(new ApiError(404, "Not found"));

    const results = await sql(
      `SELECT mr.*, u."firstname", u."lastname", u."profilePicture", fp."hourlyRate", fp."experienceLevel",
              fp.skills, fp."softwareExpertise", fp."styleTags"
       FROM "MatchResult" mr
       JOIN "User" u ON u.id=mr."freelancerId"
       LEFT JOIN "FreelancerProfile" fp ON fp.user_id=mr."freelancerId"
       WHERE mr."requestId"=$1 ORDER BY mr.rank`,
      [parseInt(requestId, 10)]
    );
    return res.status(200).json(new ApiResponse(200, { request, results }, "Match results"));
  } catch (e) {
    logger.error("getMatchResults: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get results"));
  }
};
