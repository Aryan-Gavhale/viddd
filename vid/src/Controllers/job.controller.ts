import type { AuthUser, DbRow, ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, sqlCount, withTransaction, txSql } from "../db.js";
import logger from "../Utils/logger.js";
import { uploadFileToS3 } from "../Utils/fileUpload.js";
import { parseCursorPagination } from "../Utils/pagination.js";
import { cursorPaginatedResponse } from "../Utils/dto.js";

type ControllerHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

// Map DB row (snake_case) to API shape (camelCase)
function jobRowToClientShape(row: DbRow | null): (Record<string, unknown> & { postedById?: unknown }) | null {
  if (!row) return null;
  const { posted_by_id, freelancer_id, search_vector, deletedAt, ...rest } = row;
  return {
    ...rest,
    postedById: posted_by_id,
    freelancerId: freelancer_id,
    searchVector: search_vector,
    deletedAt: deletedAt ?? null,
  };
}

// ─── Handlers ───

const applyJob = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }

    const freelancerId = req.user.id;
    const jobId = Number(req.params.jobId);
    const { aboutFreelancer } = req.body;

    if (req.user.role !== "FREELANCER") {
      return next(new ApiError(403, "Only freelancers can apply for jobs"));
    }

    const job = await sqlOne(
      `SELECT * FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [jobId]
    );
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }
    if (job.status !== "OPEN") {
      return next(new ApiError(403, "This job is no longer accepting applications"));
    }

    const freelancer = await sqlOne(
      `SELECT u.*, row_to_json(fp.*) AS "freelancerProfile"
       FROM "User" u
       LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id"
       WHERE u."id" = $1`,
      [freelancerId]
    );
    if (!freelancer || !freelancer.freelancerProfile) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    const existingApplication = await sqlOne(
      `SELECT * FROM "Application" WHERE "jobId" = $1 AND "freelancerId" = $2`,
      [jobId, freelancerId]
    );
    if (existingApplication) {
      return next(new ApiError(400, "You have already applied to this job"));
    }

    const [appliedRow] = await sql(
      `INSERT INTO "Application" ("aboutFreelancer", "jobId", "freelancerId")
       VALUES ($1, $2, $3)
       RETURNING *`,
      [aboutFreelancer, jobId, freelancerId]
    );
    const appliedJob = appliedRow;

    await sql(
      `UPDATE "User" SET applied_jobs_id = array_append(COALESCE(applied_jobs_id, ARRAY[]::int[]), $1::int) WHERE "id" = $2`,
      [jobId, freelancerId]
    );

    return res.status(200).json(
      new ApiResponse(200, { appliedJob }, "Applied to job successfully")
    );
  } catch (error) {
    logger.error("Error applying for job: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to apply for job"));
  }
};

const createJob = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const postedById = req.user.id;

    const {
      title,
      description,
      category,
      budgetMin,
      budgetMax,
      deadline,
      jobDifficulty,
      projectLength,
      keyResponsibilities,
      requiredSkills,
      tools,
      scope,
      name,
      email,
      company,
      note,
      videoFileUrl,
    } = req.body;

    let finalVideoFileUrl = videoFileUrl;
    if (req.files && req.files.videoFile) {
      const file = req.files.videoFile;
      if (!file.mimetype.startsWith("video/")) {
        return next(new ApiError(400, "Invalid file type. Only videos are allowed"));
      }
      finalVideoFileUrl = await uploadFileToS3(file, `jobs/${postedById}/${Date.now()}-${file.name}`);
    }

    const toolsArr = Array.isArray(tools) ? tools : tools ? [tools] : [];

    const [row] = await sql(
      `INSERT INTO "Job" (
        "title", "description", "category", "budgetMin", "budgetMax", "deadline",
        "jobDifficulty", "projectLength", "keyResponsibilities", "requiredSkills", "tools", "scope",
        posted_by_id, "name", "email", "company", "note", "videoFileUrl", "isVerified", "status"
      ) VALUES (
        $1, $2, $3::text[], $4, $5, $6,
        $7::"JobDifficulty", $8::"ProjectLength", $9::text[], $10::text[], $11::text[], $12,
        $13, $14, $15, $16, $17, $18, $19, $20::"JobStatus"
      )
      RETURNING *`,
      [
        title,
        description,
        Array.isArray(category) ? category : [category],
        budgetMin,
        budgetMax,
        new Date(deadline),
        jobDifficulty,
        projectLength,
        Array.isArray(keyResponsibilities) ? keyResponsibilities : keyResponsibilities ? [keyResponsibilities] : [],
        Array.isArray(requiredSkills) ? requiredSkills : [requiredSkills],
        toolsArr,
        scope,
        postedById,
        name,
        email,
        company ?? null,
        note ?? null,
        finalVideoFileUrl ?? null,
        true,
        "OPEN",
      ]
    );

    const postedBy = await sqlOne(
      `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
      [postedById]
    );
    const job = { ...jobRowToClientShape(row), postedBy };

    return res.status(201).json(new ApiResponse(201, job, "Job posted successfully"));
  } catch (error) {
    logger.error("Error creating job: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to post job"));
  }
};

const updateJob = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { jobId } = req.params;
    const {
      title,
      description,
      category,
      budgetMin,
      budgetMax,
      deadline,
      jobDifficulty,
      projectLength,
      keyResponsibilities,
      requiredSkills,
      tools,
      scope,
      name,
      email,
      company,
      note,
      videoFileUrl,
    } = req.body;

    const job = await sqlOne(
      `SELECT * FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [parseInt(jobId, 10)]
    );
    if (!job || job.posted_by_id !== userId) {
      return next(new ApiError(404, "Job not found or you don't own it"));
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    let p = 1;

    if (title) {
      sets.push(`"title" = $${p++}`);
      vals.push(title);
    }
    if (description) {
      sets.push(`"description" = $${p++}`);
      vals.push(description);
    }
    if (category) {
      sets.push(`"category" = $${p++}::text[]`);
      vals.push(Array.isArray(category) ? category : [category]);
    }
    let effectiveMin = parseFloat(String(job.budgetMin));
    if (budgetMin !== undefined) {
      const minBudget = parseFloat(String(budgetMin));
      if (isNaN(minBudget) || minBudget < 0) {
        return next(new ApiError(400, "Invalid budgetMin value"));
      }
      effectiveMin = minBudget;
      sets.push(`"budgetMin" = $${p++}`);
      vals.push(minBudget);
    }
    if (budgetMax !== undefined) {
      const maxBudget = parseFloat(String(budgetMax));
      if (isNaN(maxBudget) || maxBudget < effectiveMin) {
        return next(new ApiError(400, "Invalid budgetMax value; must be greater than budgetMin"));
      }
      sets.push(`"budgetMax" = $${p++}`);
      vals.push(maxBudget);
    }
    if (deadline) {
      const parsedDeadline = new Date(deadline);
      if (isNaN(parsedDeadline.getTime()) || parsedDeadline < new Date()) {
        return next(new ApiError(400, "Invalid deadline. Please provide a future date"));
      }
      sets.push(`"deadline" = $${p++}`);
      vals.push(parsedDeadline);
    }
    if (jobDifficulty) {
      sets.push(`"jobDifficulty" = $${p++}::"JobDifficulty"`);
      vals.push(jobDifficulty);
    }
    if (projectLength) {
      sets.push(`"projectLength" = $${p++}::"ProjectLength"`);
      vals.push(projectLength);
    }
    if (keyResponsibilities) {
      sets.push(`"keyResponsibilities" = $${p++}::text[]`);
      vals.push(
        Array.isArray(keyResponsibilities) ? keyResponsibilities : keyResponsibilities ? [keyResponsibilities] : []
      );
    }
    if (requiredSkills) {
      sets.push(`"requiredSkills" = $${p++}::text[]`);
      vals.push(Array.isArray(requiredSkills) ? requiredSkills : [requiredSkills]);
    }
    if (tools) {
      sets.push(`"tools" = $${p++}::text[]`);
      vals.push(Array.isArray(tools) ? tools : tools ? [tools] : []);
    }
    if (scope) {
      sets.push(`"scope" = $${p++}`);
      vals.push(scope);
    }
    if (name) {
      sets.push(`"name" = $${p++}`);
      vals.push(name);
    }
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new ApiError(400, "Invalid email format"));
      }
      sets.push(`"email" = $${p++}`);
      vals.push(email);
    }
    if (company !== undefined) {
      sets.push(`"company" = $${p++}`);
      vals.push(company);
    }
    if (note !== undefined) {
      sets.push(`"note" = $${p++}`);
      vals.push(note);
    }
    if (videoFileUrl !== undefined) {
      sets.push(`"videoFileUrl" = $${p++}`);
      vals.push(videoFileUrl);
    }

    if (sets.length === 0) {
      const j = (await sqlOne(
        `SELECT * FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
        [parseInt(jobId, 10)]
      )) as DbRow | null;
      if (!j) {
        return next(new ApiError(404, "Job not found"));
      }
      const postedBy = await sqlOne(
        `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
        [j.posted_by_id]
      );
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { ...jobRowToClientShape(j), postedBy: postedBy ? { firstname: postedBy.firstname, lastname: postedBy.lastname } : null },
            "Job updated successfully"
          )
        );
    }

    sets.push(`"updatedAt" = NOW()`);
    const idParam = p;
    vals.push(parseInt(jobId, 10));

    const [updated] = await sql(
      `UPDATE "Job" SET ${sets.join(", ")} WHERE "id" = $${idParam} AND "deletedAt" IS NULL RETURNING *`,
      vals
    );
    const postedBy = await sqlOne(
      `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
      [updated.posted_by_id]
    );
    const updatedJob = { ...jobRowToClientShape(updated), postedBy };
    return res.status(200).json(new ApiResponse(200, updatedJob, "Job updated successfully"));
  } catch (error) {
    logger.error("Error updating job: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to update job"));
  }
};

const deleteJob = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { jobId } = req.params;

    const job = await sqlOne(
      `SELECT * FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [parseInt(jobId, 10)]
    );
    if (!job || job.posted_by_id !== userId) {
      return next(new ApiError(404, "Job not found or you don't own it"));
    }

    await sql(
      `UPDATE "Job" SET "deletedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [parseInt(jobId, 10)]
    );

    return res.status(200).json(new ApiResponse(200, null, "Job deleted successfully"));
  } catch (error) {
    logger.error("Error deleting job: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete job"));
  }
};

const getJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const parsedJobId = parseInt(jobId, 10);
    if (isNaN(parsedJobId) || parsedJobId <= 0) {
      return next(new ApiError(400, "Invalid job ID"));
    }

    const j = await sqlOne(
      `SELECT * FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [parsedJobId]
    );
    if (!j) {
      return next(new ApiError(404, "Job not found"));
    }

    const postedBy = await sqlOne(
      `SELECT "firstname", "lastname", "email" FROM "User" WHERE "id" = $1`,
      [j.posted_by_id]
    );

    let freelancer: {
      firstname: unknown;
      lastname: unknown;
      profilePicture: unknown;
      rating: unknown;
      freelancerProfile: { jobTitle: unknown; skills: unknown; overview: unknown };
    } | null = null;
    if (j.freelancer_id) {
      const fu = await sqlOne(
        `SELECT u."id", u."firstname", u."lastname", u."profilePicture", u."rating",
                fp."jobTitle", fp."skills", fp."overview"
         FROM "User" u
         LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id"
         WHERE u."id" = $1`,
        [j.freelancer_id]
      );
      if (fu) {
        freelancer = {
          firstname: fu.firstname,
          lastname: fu.lastname,
          profilePicture: fu.profilePicture,
          rating: fu.rating,
          freelancerProfile: {
            jobTitle: fu.jobTitle,
            skills: fu.skills,
            overview: fu.overview,
          },
        };
      }
    }

    const applications = await sql(
      `SELECT "status" FROM "Application" WHERE "jobId" = $1`,
      [parsedJobId]
    );

    const hasPendingApplications = applications.some((a) => a.status === "PENDING");
    if (
      j.status !== "OPEN" &&
      !hasPendingApplications &&
      req.user &&
      req.user.id !== j.posted_by_id &&
      req.user.role !== "ADMIN"
    ) {
      return next(new ApiError(403, "This job is no longer accepting applications"));
    }

    const jobData = {
      ...jobRowToClientShape(j),
      postedBy: postedBy
        ? { firstname: postedBy.firstname, lastname: postedBy.lastname, email: postedBy.email }
        : null,
      freelancer,
    };

    if (req.user && req.user.role === "FREELANCER" && req.user.id !== j.posted_by_id) {
      await sql(
        `UPDATE "Job" SET "proposals" = "proposals" + 1, "updatedAt" = NOW() WHERE "id" = $1 AND "deletedAt" IS NULL`,
        [parsedJobId]
      );
    }

    return res.status(200).json(new ApiResponse(200, jobData, "Job retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving job with ID %s: %s", req.params.jobId, (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve job"));
  }
};

const getClientJobs = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const postedById = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const lim = parseInt(limit, 10);
    const off = (parseInt(page, 10) - 1) * lim;

    const [jobs, total] = await Promise.all([
      sql(
        `SELECT j.*,
                pb."firstname" AS pb_fn, pb."lastname" AS pb_ln,
                fu."firstname" AS fu_fn, fu."lastname" AS fu_ln, fu."profilePicture" AS fu_pp, fu."rating" AS fu_rt,
                fp."jobTitle" AS fp_jt, fp."skills" AS fp_sk, fp."overview" AS fp_ov
         FROM "Job" j
         LEFT JOIN "User" pb ON pb."id" = j.posted_by_id
         LEFT JOIN "User" fu ON fu."id" = j.freelancer_id
         LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = j.freelancer_id
         WHERE j.posted_by_id = $1 AND j."deletedAt" IS NULL
         ORDER BY j."createdAt" DESC
         LIMIT $2 OFFSET $3`,
        [postedById, lim, off]
      ),
      sqlCount(
        `SELECT COUNT(*)::int AS count FROM "Job" WHERE posted_by_id = $1 AND "deletedAt" IS NULL`,
        [postedById]
      ),
    ]);

    const out = jobs.map((row) => {
      const { pb_fn, pb_ln, fu_fn, fu_ln, fu_pp, fu_rt, fp_jt, fp_sk, fp_ov, ...jr } = row;
      const fr = fu_fn
        ? {
            firstname: fu_fn,
            lastname: fu_ln,
            profilePicture: fu_pp,
            rating: fu_rt,
            freelancerProfile: { jobTitle: fp_jt, skills: fp_sk, overview: fp_ov },
          }
        : null;
      return { ...jobRowToClientShape(jr as DbRow), postedBy: { firstname: pb_fn, lastname: pb_ln }, freelancer: fr };
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          jobs: out,
          total,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "Client jobs retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving client jobs: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve client jobs"));
  }
};

const getAllJobs = async (req, res, next) => {
  try {
    const { category, search, cursor } = req.query;
    const useCursor = cursor != null;

    const params: unknown[] = [];
    let p = 1;
    const conds = [
      `j."status" = 'OPEN'::"JobStatus"`,
      `j."deletedAt" IS NULL`,
      `NOT EXISTS (
         SELECT 1 FROM "Application" a
         WHERE a."jobId" = j."id" AND a."status" = 'ACCEPTED'
       )`,
    ];
    if (category) {
      conds.push(`$${p} = ANY(j."category")`);
      params.push(category);
      p++;
    }
    if (search) {
      const s = String(Array.isArray(search) ? search[0] : search);
      if (s.trim().length >= 2) {
        conds.push(`j."search_vector" @@ plainto_tsquery('english', $${p})`);
        params.push(s);
      } else {
        conds.push(`(j."title" ILIKE $${p} OR j."description" ILIKE $${p})`);
        params.push(`%${s}%`);
      }
      p++;
    }

    // FIX M8: support cursor-based pagination for deep pages
    if (useCursor) {
      const pag = parseCursorPagination(req.query as Record<string, string | string[] | undefined>);
      if (pag.cursor != null) {
        conds.push(`j."id" < $${p}`);
        params.push(pag.cursor);
        p++;
      }
      const whereSql = conds.join(" AND ");
      const jobs = await sql(
        `SELECT j.*,
                pb."firstname" AS pb_fn, pb."lastname" AS pb_ln, pb."company" AS pb_co,
                (SELECT COUNT(*)::int FROM "Application" WHERE "jobId" = j."id") AS app_count,
                EXISTS(SELECT 1 FROM "Application" WHERE "jobId" = j."id" AND "status" = 'PENDING') AS has_pending
         FROM "Job" j
         LEFT JOIN "User" pb ON pb."id" = j.posted_by_id
         WHERE ${whereSql}
         ORDER BY j."id" DESC
         LIMIT $${p}`,
        [...params, pag.limit + 1]
      );
      const formattedJobs = jobs.map((row) => {
        const { pb_fn, pb_ln, pb_co, app_count, has_pending, ...jr } = row;
        return { ...jobRowToClientShape(jr as DbRow), postedBy: pb_fn ? { firstname: pb_fn, lastname: pb_ln, company: pb_co } : null, applicationCount: Number(app_count) || 0, hasPendingApplications: Boolean(has_pending), createdAt: jr.createdAt, deadline: jr.deadline };
      });
      return res.status(200).json(new ApiResponse(200, cursorPaginatedResponse(formattedJobs as (DbRow & Record<string, unknown>)[], pag.limit), "All jobs retrieved successfully"));
    }

    // Offset fallback for backward compatibility
    const { page = 1, limit = 20 } = req.query;
    const lim = parseInt(String(limit), 10);
    const off = (parseInt(String(page), 10) - 1) * lim;
    const whereSql = conds.join(" AND ");

    const [jobs, total] = await Promise.all([
      sql(
        `SELECT j.*,
                pb."firstname" AS pb_fn, pb."lastname" AS pb_ln, pb."company" AS pb_co,
                (SELECT COUNT(*)::int FROM "Application" WHERE "jobId" = j."id") AS app_count,
                EXISTS(SELECT 1 FROM "Application" WHERE "jobId" = j."id" AND "status" = 'PENDING') AS has_pending
         FROM "Job" j
         LEFT JOIN "User" pb ON pb."id" = j.posted_by_id
         WHERE ${whereSql}
         ORDER BY j."createdAt" DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, lim, off]
      ),
      sqlCount(
        `SELECT COUNT(*)::int AS count FROM "Job" j WHERE ${whereSql}`,
        params
      ),
    ]);

    const formattedJobs = jobs.map((row) => {
      const { pb_fn, pb_ln, pb_co, app_count, has_pending, ...jr } = row;
      const jobData = jobRowToClientShape(jr as DbRow);
      return {
        ...jobData,
        postedBy: pb_fn ? { firstname: pb_fn, lastname: pb_ln, company: pb_co } : null,
        applicationCount: Number(app_count) || 0,
        hasPendingApplications: Boolean(has_pending),
        createdAt: jr.createdAt,
        deadline: jr.deadline,
      };
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          jobs: formattedJobs,
          total,
          page: parseInt(String(page), 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "All jobs retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving all jobs: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve all jobs"));
  }
};

const checkApplicationStatus: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const jobId = parseInt(req.params.jobId, 10);
    const userId = req.user.id;

    const application = await sqlOne(
      `SELECT * FROM "Application" WHERE "jobId" = $1 AND "freelancerId" = $2`,
      [jobId, userId]
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          hasApplied: !!application,
          status: application?.status || null,
          applicationId: application?.id || null,
        },
        "Application status retrieved"
      )
    );
  } catch (error) {
    logger.error("Error in checkApplicationStatus: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to check application status"));
  }
};

const getCurrentJobs = async (req, res, next) => {
  const freelancerId = req.user?.id;
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const fid = req.user.id;

    const jobs = await sql(
      `SELECT j.*, u."firstname" as pb_fn, u."lastname" as pb_ln
       FROM "Job" j
       LEFT JOIN "User" u ON u."id" = j.posted_by_id
       WHERE j.freelancer_id = $1 AND j."status"::text = ANY(ARRAY['ACCEPTED','IN_PROGRESS']::text[]) AND j."deletedAt" IS NULL
       ORDER BY j."createdAt" DESC
       LIMIT 100`,
      [fid]
    );

    const formattedJobs = jobs.map((row) => {
      const { pb_fn, pb_ln, ...jr } = row;
      const base = jobRowToClientShape(jr as DbRow)!;
      const deadline = base.deadline ? new Date(base.deadline as string | number | Date) : null;
      const daysLeft = deadline
        ? Math.max(0, Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      return {
        id: base.id,
        title: base.title,
        client: pb_fn
          ? { firstname: pb_fn || "", lastname: pb_ln || "" }
          : { firstname: "Unknown", lastname: "" },
        deadline: deadline?.toISOString() || null,
        progress: base.progress || 0,
        daysLeft,
        totalPrice: base.budgetMax || 0,
      };
    });

    return res.status(200).json(new ApiResponse(200, formattedJobs, "Current jobs retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving current jobs for freelancer %s: %s", freelancerId, (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve current jobs"));
  }
};

const getAppliedJobs = async (req, res, next) => {
  const freelancerId = req.user?.id;
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const fId = req.user.id;

    const applications = await sql(
      `SELECT
         a."id" as "app_id",
         a."status" as "app_status",
         a."createdAt" as "app_created",
         j."id" as "job_id",
         j."title",
         j."deadline",
         j."progress",
         j."budgetMax",
         u."firstname" as "pb_fn",
         u."lastname" as "pb_ln"
       FROM "Application" a
       INNER JOIN "Job" j ON j."id" = a."jobId" AND j."deletedAt" IS NULL
       LEFT JOIN "User" u ON u."id" = j.posted_by_id
       WHERE a."freelancerId" = $1
       ORDER BY a."createdAt" DESC
       LIMIT 100`,
      [fId]
    );

    const formattedJobs = applications.map((row) => {
      const deadline = row.deadline ? new Date(row.deadline as string | number | Date) : null;
      const daysLeft = deadline
        ? Math.max(0, Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      return {
        id: row.job_id,
        title: row.title,
        client: row.pb_fn
          ? { firstname: row.pb_fn || "", lastname: row.pb_ln || "" }
          : { firstname: "Unknown", lastname: "" },
        applicationDate: row.app_created
          ? new Date(row.app_created as string | number | Date).toISOString()
          : new Date().toISOString(),
        applicationStatus: row.app_status || "PENDING",
        deadline: deadline?.toISOString() || null,
        progress: row.progress || 0,
        daysLeft,
        totalPrice: row.budgetMax || 0,
      };
    });

    return res.status(200).json(new ApiResponse(200, formattedJobs, "Applied jobs retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving applied jobs for freelancer %s: %s", freelancerId, (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve applied jobs"));
  }
};

const getCompletedJobs = async (req, res, next) => {
  const freelancerId = req.user?.id;
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const fId = req.user.id;

    const jobs = await sql(
      `SELECT j.*, u."firstname" as pb_fn, u."lastname" as pb_ln
       FROM "Job" j
       LEFT JOIN "User" u ON u."id" = j.posted_by_id
       WHERE j.freelancer_id = $1 AND j."status" = 'COMPLETED'::"JobStatus" AND j."deletedAt" IS NULL
       ORDER BY j."updatedAt" DESC
       LIMIT 100`,
      [fId]
    );

    const formattedJobs = jobs.map((row) => {
      const { pb_fn, pb_ln, ...jr } = row;
      const job = jobRowToClientShape(jr as DbRow)!;
      const deadline = job.deadline ? new Date(job.deadline as string | number | Date) : null;
      const daysLeft = deadline
        ? Math.max(0, Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      return {
        id: job.id,
        title: job.title,
        client: pb_fn
          ? { firstname: pb_fn || "", lastname: pb_ln || "" }
          : { firstname: "Unknown", lastname: "" },
        completedAt: job.updatedAt
          ? new Date(job.updatedAt as string | number | Date).toISOString()
          : new Date().toISOString(),
        deadline: deadline?.toISOString() || null,
        progress: job.progress || 100,
        daysLeft,
        totalPrice: job.budgetMax || 0,
      };
    });

    return res.status(200).json(new ApiResponse(200, formattedJobs, "Completed jobs retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving completed jobs for freelancer %s: %s", freelancerId, (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve completed jobs"));
  }
};

const getJobApplications = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const clientId = req.user.id;
    const { jobId } = req.params;
    const jid = parseInt(jobId, 10);

    const job = await sqlOne(
      `SELECT posted_by_id FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [jid]
    );
    if (!job || job.posted_by_id !== clientId) {
      return next(new ApiError(403, "You are not authorized to view applications for this job"));
    }

    const apps = await sql(
      `SELECT a.*,
              u."id" as f_id, u."firstname" as f_fn, u."lastname" as f_ln, u."profilePicture" as f_pp, u."rating" as f_rt,
              fp."jobTitle" as f_jt, fp."skills" as f_sk, fp."overview" as f_ov
       FROM "Application" a
       JOIN "User" u ON u."id" = a."freelancerId"
       LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id"
       WHERE a."jobId" = $1
       ORDER BY a."createdAt" DESC`,
      [jid]
    );

    const applications = apps.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      freelancerId: r.freelancerId,
      aboutFreelancer: r.aboutFreelancer,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      freelancer: {
        id: r.f_id,
        firstname: r.f_fn,
        lastname: r.f_ln,
        profilePicture: r.f_pp,
        rating: r.f_rt,
        freelancerProfile: {
          jobTitle: r.f_jt,
          skills: r.f_sk,
          overview: r.f_ov,
        },
      },
    }));

    return res.status(200).json(new ApiResponse(200, applications, "Applications retrieved successfully"));
  } catch (error) {
    logger.error("Error fetching applications for job %s: %s", req.params.jobId, (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve applications"));
  }
};

const acceptApplication = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const clientId = req.user.id;
    const { jobId } = req.params;
    const { freelancerId } = req.body;
    const jid = parseInt(jobId, 10);
    const fid = parseInt(freelancerId, 10);

    logger.debug("[acceptApplication] Processing request");

    const job = await sqlOne(
      `SELECT * FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [jid]
    );
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }
    if (job.posted_by_id !== clientId) {
      return next(new ApiError(403, "Unauthorized: You can only accept applications for your own jobs"));
    }
    if (job.status !== "OPEN") {
      return next(new ApiError(400, "Job is not open for applications"));
    }

    const acceptedApp = await sqlOne(
      `SELECT id FROM "Application" WHERE "jobId" = $1 AND "freelancerId" = $2`,
      [jid, fid]
    );
    if (!acceptedApp) {
      return next(new ApiError(404, "No application found for this freelancer on this job"));
    }
    const applicationId = acceptedApp.id as number;

    const rejectNotice = `We regret to inform you that another freelancer has been selected for the job "${job.title}"`;
    const rejectMetadata = JSON.stringify({
      jobId: jid,
      jobTitle: job.title,
      status: "REJECTED",
      rejectedAt: new Date().toISOString(),
    });

    await withTransaction(async (client) => {
      const q = txSql(client);

      await q(
        `UPDATE "Job" SET "status" = 'ACCEPTED'::"JobStatus", freelancer_id = $1, "updatedAt" = NOW() WHERE "id" = $2 AND "deletedAt" IS NULL`,
        [fid, jid]
      );
      await q(
        `UPDATE "Application" SET "status" = 'ACCEPTED', "updatedAt" = NOW() WHERE "jobId" = $1 AND "freelancerId" = $2`,
        [jid, fid]
      );
      await q(
        `UPDATE "User" SET accepted_jobs_id = array_append(COALESCE(accepted_jobs_id, ARRAY[]::int[]), $1::int) WHERE "id" = $2`,
        [jid, fid]
      );

      await q(
        `INSERT INTO "Notification" ("user_id", "type", "content", "entityType", "entityId", "priority", "metadata")
         VALUES ($1, 'SYSTEM'::"NotificationType", $2, $3, $4, $5::"Priority", $6::jsonb)`,
        [
          fid,
          `Congratulations! You have been selected for the job "${job.title}"`,
          "JOB",
          jid,
          "HIGH",
          JSON.stringify({
            jobId: jid,
            jobTitle: job.title,
            status: "ACCEPTED",
            acceptedAt: new Date().toISOString(),
          }),
        ]
      );

      await q(
        `WITH rejected AS (
           UPDATE "Application"
           SET "status" = 'REJECTED'::"ApplicationStatus", "updatedAt" = NOW()
           WHERE "jobId" = $1 AND "id" != $2 AND "status" = 'PENDING'::"ApplicationStatus"
           RETURNING "freelancerId", "id"
         )
         INSERT INTO "Notification" ("user_id", "type", "content", "entityType", "entityId", "priority", "metadata")
         SELECT r."freelancerId", 'SYSTEM'::"NotificationType",
           $3::text, 'JOB', $1::int, 'NORMAL'::"Priority", $4::jsonb
         FROM rejected r`,
        [jid, applicationId, rejectNotice, rejectMetadata]
      );
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { success: true }, "Application accepted and others rejected successfully"));
  } catch (error) {
    logger.error("[acceptApplication] Error: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to accept application"));
  }
};

const rejectApplication = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const clientId = req.user.id;
    const { jobId } = req.params;
    const { freelancerId, message } = req.body;
    const jid = parseInt(jobId, 10);
    const flId = parseInt(freelancerId, 10);

    const application = await sqlOne(
      `SELECT a.*, j."title" as job_title, j.posted_by_id, j."category", j."budgetMin", j."budgetMax"
       FROM "Application" a
       JOIN "Job" j ON j."id" = a."jobId" AND j."deletedAt" IS NULL
       WHERE a."jobId" = $1 AND a."freelancerId" = $2`,
      [jid, flId]
    );

    if (!application) {
      return next(new ApiError(404, "Application not found"));
    }
    if (application.posted_by_id !== clientId) {
      return next(new ApiError(403, "Unauthorized to reject this application"));
    }

    const [updatedApplication] = await sql(
      `UPDATE "Application" SET "status" = 'REJECTED', "updatedAt" = NOW() WHERE "jobId" = $1 AND "freelancerId" = $2 RETURNING *`,
      [jid, flId]
    );

    await sql(
      `UPDATE "User" SET rejected_jobs_id = array_append(COALESCE(rejected_jobs_id, ARRAY[]::int[]), $1::int) WHERE "id" = $2`,
      [jid, flId]
    );

    await sql(
      `INSERT INTO "Notification" ("user_id", "type", "content", "entityType", "entityId", "priority", "metadata")
       VALUES ($1, 'SYSTEM'::"NotificationType", $2, $3, $4, $5::"Priority", $6::jsonb)`,
      [
        flId,
        message || `Sorry to inform you, but your application for "${application.job_title}" has been rejected.`,
        "APPLICATION",
        updatedApplication.id,
        "HIGH",
        JSON.stringify({
          jobId: jid,
          jobTitle: application.job_title,
          jobCategory: application.category,
          budgetRange: `$${application.budgetMin} - $${application.budgetMax}`,
          rejectedAt: new Date().toISOString(),
        }),
      ]
    );

    return res.status(200).json(new ApiResponse(200, null, "Application rejected successfully"));
  } catch (error) {
    logger.error("Error rejecting application: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to reject application"));
  }
};

const getAllJobsAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const { category, search, page = 1, limit = 20 } = req.query;
    const lim = parseInt(String(limit), 10);
    const off = (parseInt(String(page), 10) - 1) * lim;
    const params: unknown[] = [];
    let p = 1;
    const conds = [`j."deletedAt" IS NULL`];
    if (category) {
      conds.push(`$${p} = ANY(j."category")`);
      params.push(category);
      p++;
    }
    if (search) {
      const s = `%${search}%`;
      conds.push(
        `(j."title" ILIKE $${p} OR j."description" ILIKE $${p} OR j."scope" ILIKE $${p})`
      );
      params.push(s);
      p++;
    }
    const whereSql = conds.join(" AND ");

    const jobRows = await sql(
      `SELECT j.* FROM "Job" j WHERE ${whereSql} ORDER BY j."createdAt" DESC LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lim, off]
    );
    const total = await sqlCount(
      `SELECT COUNT(*)::int AS count FROM "Job" j WHERE ${whereSql}`,
      params
    );

    const userIds = new Set<number>();
    for (const row of jobRows) {
      if (row.posted_by_id) userIds.add(row.posted_by_id as number);
      if (row.freelancer_id) userIds.add(row.freelancer_id as number);
    }
    const uidArr = [...userIds];
    const allUsers =
      uidArr.length > 0
        ? await sql(
            `SELECT u."id", u."firstname", u."lastname", u."email", u."profilePicture", u."rating",
                    fp."jobTitle", fp."skills", fp."overview"
             FROM "User" u
             LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id"
             WHERE u."id" = ANY($1::int[])`,
            [uidArr]
          )
        : [];
    const userMap = new Map<number, Record<string, unknown>>();
    for (const u of allUsers) userMap.set(u.id as number, u);

    const jobs: Record<string, unknown>[] = [];
    for (const row of jobRows) {
      const poster = userMap.get(row.posted_by_id as number);
      const postedBy = poster
        ? { firstname: poster.firstname, lastname: poster.lastname, email: poster.email }
        : null;
      let fr: Record<string, unknown> | null = null;
      if (row.freelancer_id) {
        const fu = userMap.get(row.freelancer_id as number);
        if (fu) {
          fr = {
            firstname: fu.firstname,
            lastname: fu.lastname,
            profilePicture: fu.profilePicture,
            rating: fu.rating,
            freelancerProfile: { jobTitle: fu.jobTitle, skills: fu.skills, overview: fu.overview },
          };
        }
      }
      jobs.push({ ...jobRowToClientShape(row), postedBy, freelancer: fr });
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        { jobs, total, page: parseInt(page, 10), limit: lim, totalPages: Math.ceil(total / lim) },
        "All jobs retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving all jobs for admin: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve all jobs"));
  }
};

const verifyJob = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const { jobId } = req.params;
    const jid = parseInt(jobId, 10);

    const job = await sqlOne(
      `SELECT * FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [jid]
    );
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    const [updated] = await sql(
      `UPDATE "Job" SET "isVerified" = true, "updatedAt" = NOW() WHERE "id" = $1 AND "deletedAt" IS NULL RETURNING *`,
      [jid]
    );
    const postedBy = await sqlOne(
      `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
      [updated.posted_by_id]
    );
    const updatedJob = { ...jobRowToClientShape(updated), postedBy };
    return res.status(200).json(new ApiResponse(200, updatedJob, "Job verified successfully"));
  } catch (error) {
    logger.error("Error verifying job %s: %s", req.params.jobId, (error as Error).message);
    return next(new ApiError(500, "Failed to verify job"));
  }
};

const unverifyJob = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const { jobId } = req.params;
    const jid = parseInt(jobId, 10);

    const job = await sqlOne(
      `SELECT * FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [jid]
    );
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    const [updated] = await sql(
      `UPDATE "Job" SET "isVerified" = false, "updatedAt" = NOW() WHERE "id" = $1 AND "deletedAt" IS NULL RETURNING *`,
      [jid]
    );
    const postedBy = await sqlOne(
      `SELECT "firstname", "lastname" FROM "User" WHERE "id" = $1`,
      [updated.posted_by_id]
    );
    return res
      .status(200)
      .json(new ApiResponse(200, { ...jobRowToClientShape(updated), postedBy }, "Job unverified successfully"));
  } catch (error) {
    logger.error("Error unverifying job %s: %s", req.params.jobId, (error as Error).message);
    return next(new ApiError(500, "Failed to unverify job"));
  }
};

const deleteJobAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const { jobId } = req.params;
    const jid = parseInt(jobId, 10);

    const job = await sqlOne(
      `SELECT * FROM "Job" WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [jid]
    );
    if (!job) {
      return next(new ApiError(404, "Job not found"));
    }

    await sql(
      `UPDATE "Job" SET "deletedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1 AND "deletedAt" IS NULL`,
      [jid]
    );

    return res.status(200).json(new ApiResponse(200, null, "Job deleted successfully"));
  } catch (error) {
    logger.error("Error deleting job %s: %s", req.params.jobId, (error as Error).message);
    return next(new ApiError(500, "Failed to delete job"));
  }
};

const getAllApplicationsAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const { page = 1, limit = 20 } = req.query;
    const lim = parseInt(limit, 10);
    const off = (parseInt(page, 10) - 1) * lim;

    const applications = await sql(
      `SELECT a.*, j."title" as j_title, j.posted_by_id,
              u."firstname" as f_fn, u."lastname" as f_ln, u."profilePicture" as f_pp, u."rating" as f_rt,
              fp."jobTitle" as f_jt, fp."skills" as f_sk, fp."overview" as f_ov
       FROM "Application" a
       JOIN "Job" j ON j."id" = a."jobId" AND j."deletedAt" IS NULL
       JOIN "User" u ON u."id" = a."freelancerId"
       LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id"
       ORDER BY a."createdAt" DESC
       LIMIT $1 OFFSET $2`,
      [lim, off]
    );
    const total = await sqlCount(`SELECT COUNT(*)::int AS count FROM "Application"`, []);

    const out = applications.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      freelancerId: r.freelancerId,
      aboutFreelancer: r.aboutFreelancer,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      job: { title: r.j_title, postedById: r.posted_by_id },
      freelancer: {
        firstname: r.f_fn,
        lastname: r.f_ln,
        profilePicture: r.f_pp,
        rating: r.f_rt,
        freelancerProfile: { jobTitle: r.f_jt, skills: r.f_sk, overview: r.f_ov },
      },
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          applications: out,
          total,
          page: parseInt(page, 10),
          limit: lim,
          totalPages: Math.ceil(total / lim),
        },
        "All applications retrieved successfully"
      )
    );
  } catch (error) {
    logger.error("Error retrieving all applications for admin: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve applications"));
  }
};

const getActiveJobs = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const freelancerId = req.user.id;

    const jobs = await sql(
      `SELECT j.*, u."id" as pb_id, u."firstname" as pb_fn, u."lastname" as pb_ln, u."email" as pb_em
       FROM "Job" j
       JOIN "User" u ON u."id" = j.posted_by_id
       WHERE j.freelancer_id = $1 AND j."status"::text = ANY(ARRAY['ACCEPTED','IN_PROGRESS']::text[]) AND j."deletedAt" IS NULL
       ORDER BY j."createdAt" DESC
       LIMIT 100`,
      [freelancerId]
    );

    const activeJobs = jobs.map((row) => {
      const { pb_id, pb_fn, pb_ln, pb_em, ...jr } = row;
      const job = jobRowToClientShape(jr as DbRow)!;
      const deadline = job.deadline ? new Date(job.deadline as string | Date) : null;
      const daysLeft = deadline
        ? Math.max(0, Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      return {
        id: job.id,
        title: job.title,
        deadline: deadline?.toISOString() || null,
        progress: job.progress || 0,
        daysLeft,
        totalPrice: job.budgetMax || 0,
        postedBy: {
          id: pb_id,
          firstname: pb_fn || "Unknown",
          lastname: pb_ln || "",
          email: pb_em,
        },
      };
    });

    return res.status(200).json(new ApiResponse(200, activeJobs, "Active jobs fetched successfully"));
  } catch (error) {
    logger.error("[getActiveJobs] Error: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to fetch active jobs"));
  }
};

export {
  createJob,
  updateJob,
  deleteJob,
  getJob,
  getClientJobs,
  getAllJobs,
  applyJob,
  checkApplicationStatus,
  getCurrentJobs,
  getAppliedJobs,
  getCompletedJobs,
  getJobApplications,
  acceptApplication,
  rejectApplication,
  getAllJobsAdmin,
  verifyJob,
  unverifyJob,
  deleteJobAdmin,
  getAllApplicationsAdmin,
  getActiveJobs,
};
