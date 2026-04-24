import { sql, sqlOne } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

type H = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<unknown>;

export const listTests: H = async (req, res, next) => {
  try {
    const { category } = (req.query || {}) as Record<string, string>;
    const where = category ? `WHERE "isActive" = true AND "category" = $1` : `WHERE "isActive" = true`;
    const params = category ? [category] : [];
    const tests = await sql(
      `SELECT id, title, description, category, difficulty, "timeLimitSeconds", "passingScore",
              "badgeTitle", "badgeIcon", "badgeColor", "attemptCount", "passRate", "createdAt"
       FROM "SkillTest" ${where} ORDER BY category, difficulty LIMIT 100`, params
    );
    return res.status(200).json(new ApiResponse(200, tests, "Tests retrieved"));
  } catch (e) {
    logger.error("listTests: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to list tests"));
  }
};

export const getTest: H = async (req, res, next) => {
  try {
    const { testId } = req.params as Record<string, string>;
    const test = await sqlOne(
      `SELECT id, title, description, category, difficulty, "timeLimitSeconds", "passingScore",
              "badgeTitle", "badgeIcon", "badgeColor", "attemptCount", "passRate", "createdAt"
       FROM "SkillTest" WHERE id=$1 AND "isActive"=true`,
      [parseInt(testId, 10)]
    );
    if (!test) return next(new ApiError(404, "Test not found"));

    let userAttempts: unknown[] = [];
    if (req.user?.id) {
      userAttempts = await sql(
        `SELECT id, status, score, passed, "timeSpentSeconds", "submittedAt" FROM "SkillTestAttempt" WHERE "testId"=$1 AND "userId"=$2 ORDER BY "startedAt" DESC`,
        [parseInt(testId, 10), req.user.id]
      );
    }
    return res.status(200).json(new ApiResponse(200, { ...test, userAttempts }, "Test retrieved"));
  } catch (e) {
    logger.error("getTest: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get test"));
  }
};

export const startAttempt: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { testId } = req.params as Record<string, string>;
    const tid = parseInt(testId, 10);

    const test = await sqlOne(`SELECT * FROM "SkillTest" WHERE id=$1 AND "isActive"=true`, [tid]);
    if (!test) return next(new ApiError(404, "Test not found"));

    const existing = await sqlOne(
      `SELECT id FROM "SkillTestAttempt" WHERE "testId"=$1 AND "userId"=$2 AND status='IN_PROGRESS'`,
      [tid, req.user.id]
    );
    if (existing) return next(new ApiError(409, "You already have an active attempt for this test"));

    const attempt = await sqlOne(
      `INSERT INTO "SkillTestAttempt" ("testId","userId","status","startedAt") VALUES ($1,$2,'IN_PROGRESS',NOW()) RETURNING *`,
      [tid, req.user.id]
    );

    await sql(`UPDATE "SkillTest" SET "attemptCount" = "attemptCount" + 1 WHERE id=$1`, [tid]);

    return res.status(201).json(new ApiResponse(201, {
      attempt,
      test: { instructions: test.instructions, sourceFileUrl: test.sourceFileUrl, timeLimitSeconds: test.timeLimitSeconds },
    }, "Test started"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("startAttempt: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to start test"));
  }
};

export const submitAttempt: H = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { attemptId } = req.params as Record<string, string>;
    const { submissionUrl } = req.body as Record<string, unknown>;

    const attempt = await sqlOne(
      `SELECT a.*, t."timeLimitSeconds", t."passingScore", t.id AS "tid", t."badgeTitle", t."badgeIcon", t."badgeColor"
       FROM "SkillTestAttempt" a JOIN "SkillTest" t ON t.id = a."testId"
       WHERE a.id=$1`, [parseInt(attemptId, 10)]
    );
    if (!attempt) return next(new ApiError(404, "Attempt not found"));
    if (attempt.userId !== req.user.id) return next(new ApiError(403, "Forbidden"));
    if (attempt.status !== "IN_PROGRESS") return next(new ApiError(400, "This attempt is already submitted"));

    const startedAt = new Date(attempt.startedAt);
    const timeSpent = Math.round((Date.now() - startedAt.getTime()) / 1000);

    if (timeSpent > attempt.timeLimitSeconds + 60) {
      await sqlOne(
        `UPDATE "SkillTestAttempt" SET status='EXPIRED', "timeSpentSeconds"=$2, "submittedAt"=NOW() WHERE id=$1 RETURNING *`,
        [parseInt(attemptId, 10), timeSpent]
      );
      return next(new ApiError(400, "Time limit exceeded — attempt expired"));
    }

    const updated = await sqlOne(
      `UPDATE "SkillTestAttempt" SET status='SUBMITTED', "submissionUrl"=$2, "timeSpentSeconds"=$3, "submittedAt"=NOW()
       WHERE id=$1 RETURNING *`,
      [parseInt(attemptId, 10), String(submissionUrl || ""), timeSpent]
    );

    return res.status(200).json(new ApiResponse(200, updated, "Submission received — pending review"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("submitAttempt: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to submit"));
  }
};

export const gradeAttempt: H = async (req, res, next) => {
  try {
    if (!req.user?.id || req.user.role !== "ADMIN") return next(new ApiError(403, "Admin only"));
    const { attemptId } = req.params as Record<string, string>;
    const { score, feedback } = req.body as Record<string, unknown>;
    const numScore = Number(score);

    const attempt = await sqlOne(
      `SELECT a.*, t."passingScore", t."badgeTitle", t."badgeIcon", t."badgeColor", t.id AS "tid"
       FROM "SkillTestAttempt" a JOIN "SkillTest" t ON t.id = a."testId"
       WHERE a.id=$1`, [parseInt(attemptId, 10)]
    );
    if (!attempt) return next(new ApiError(404, "Attempt not found"));
    if (attempt.status !== "SUBMITTED") return next(new ApiError(400, "Not in submitted state"));

    const passed = numScore >= attempt.passingScore;

    const graded = await sqlOne(
      `UPDATE "SkillTestAttempt" SET status='GRADED', score=$2, passed=$3, feedback=$4, "gradedAt"=NOW(), "gradedBy"=$5
       WHERE id=$1 RETURNING *`,
      [parseInt(attemptId, 10), numScore, passed, String(feedback || ""), req.user.id]
    );

    if (passed) {
      const existingBadge = await sqlOne(
        `SELECT id FROM "SkillBadge" WHERE "userId"=$1 AND "testId"=$2`, [attempt.userId, attempt.tid]
      );
      if (!existingBadge) {
        await sqlOne(
          `INSERT INTO "SkillBadge" ("userId","testId","attemptId","title","icon","color","score","earnedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
          [attempt.userId, attempt.tid, parseInt(attemptId, 10),
           attempt.badgeTitle || "Verified Skill", attempt.badgeIcon || "award", attempt.badgeColor || "indigo", numScore]
        );
      }

      const stats = await sqlOne(
        `SELECT COUNT(*) FILTER (WHERE passed=true) AS pass, COUNT(*) AS total FROM "SkillTestAttempt" WHERE "testId"=$1 AND status='GRADED'`,
        [attempt.tid]
      );
      if (stats) {
        const rate = Number(stats.total) > 0 ? (Number(stats.pass) / Number(stats.total)) * 100 : 0;
        await sql(`UPDATE "SkillTest" SET "passRate"=$2 WHERE id=$1`, [attempt.tid, rate]);
      }
    }

    return res.status(200).json(new ApiResponse(200, graded, passed ? "Passed — badge awarded!" : "Graded — did not pass"));
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    logger.error("gradeAttempt: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to grade"));
  }
};

export const getUserBadges: H = async (req, res, next) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const badges = await sql(
      `SELECT b.*, t.category, t.difficulty FROM "SkillBadge" b JOIN "SkillTest" t ON t.id=b."testId"
       WHERE b."userId"=$1 ORDER BY b."earnedAt" DESC`,
      [parseInt(userId, 10)]
    );
    return res.status(200).json(new ApiResponse(200, badges, "Badges retrieved"));
  } catch (e) {
    logger.error("getUserBadges: %s", (e as Error).message);
    return next(new ApiError(500, "Failed to get badges"));
  }
};
