import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne, withTransaction, txSql, txOne } from "../db.js";
import { hashPassword, comparePasswords } from "../Services/authService.js";
import {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshFamily,
  tokenTtl,
} from "../Utils/tokens.js";
import crypto from "crypto";
import { isFreelancerProfileComplete } from "../Utils/profileUtils.js";
import logger from "../Utils/logger.js";
import redisClient from "../Config/redis.js";
import type {
  ExpressRequest,
  ExpressResponse,
  NextFunction,
  AuthUser,
  DbRow,
} from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

/**
 * FIX M1: Cookies are split into:
 *   - access_token  : 15 min, httpOnly, sent on every request (path /)
 *   - refresh_token : 7 days, httpOnly, restricted to /api/v1/users/refresh
 *   - csrf_token    : non-httpOnly, mirrored in X-CSRF-Token header
 */
const ACCESS_COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const REFRESH_COOKIE_PATH = "/api/v1/users/refresh";

const REFRESH_COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: REFRESH_COOKIE_PATH,
};

const CSRF_COOKIE_BASE = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

type CookieOpts = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge?: number;
};

type ReplyWithCookies = ExpressResponse & {
  setCookie(name: string, value: string, opts: CookieOpts): void;
  clearCookie(name: string, opts?: { path: string }): void;
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 900; // 15 minutes in seconds

// Access cookie maxAge follows the access JWT lifetime (default 15 minutes).
function accessCookieMaxAge(): number {
  // Lazy match the JWT TTL string to seconds; fallback 15min if unparseable.
  const ttl = String(tokenTtl.accessTtlString);
  const m = ttl.match(/^(\d+)\s*([smhd])$/);
  if (!m) return 15 * 60;
  const n = parseInt(m[1]!, 10);
  switch (m[2]) {
    case "s":
      return n;
    case "m":
      return n * 60;
    case "h":
      return n * 60 * 60;
    case "d":
      return n * 24 * 60 * 60;
    default:
      return 15 * 60;
  }
}

async function issueAuthCookies(res: ExpressResponse, user: AuthUser | DbRow): Promise<void> {
  const r = res as ReplyWithCookies;
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, ttlSeconds } = await generateRefreshToken(user);
  const csrfToken = crypto.randomBytes(32).toString("hex");

  r.setCookie("access_token", accessToken, { ...ACCESS_COOKIE_BASE, maxAge: accessCookieMaxAge() });
  r.setCookie("refresh_token", refreshToken, { ...REFRESH_COOKIE_BASE, maxAge: ttlSeconds });
  r.setCookie("csrf_token", csrfToken, { ...CSRF_COOKIE_BASE, maxAge: ttlSeconds });
}

function clearAuthCookies(res: ExpressResponse): void {
  const r = res as ReplyWithCookies;
  r.clearCookie("access_token", { path: "/" });
  r.clearCookie("refresh_token", { path: REFRESH_COOKIE_PATH });
  r.clearCookie("csrf_token", { path: "/" });
}

function mapUserRow(r: DbRow | null): DbRow | null {
  if (!r) return null;
  const row: DbRow = { ...r };
  if (row.applied_jobs_id != null) {
    row.appliedJobsId = row.applied_jobs_id;
  }
  delete row.applied_jobs_id;
  return row;
}

function buildFreelanceWhereClauses({
  search,
  skills,
  location,
  experienceLevel,
}: {
  search?: string;
  skills?: string;
  location?: string;
  experienceLevel?: string;
}) {
  // Only surface freelancers who have actually finished onboarding. We rely
  // on the existing `isProfileComplete` flag (and the presence of a
  // FreelancerProfile row) instead of adding a new column — same source of
  // truth used everywhere else in the app.
  const conditions = [
    `u."role" = 'FREELANCER'`,
    `u."isActive" = true`,
    `u."isProfileComplete" = true`,
    `fp."id" IS NOT NULL`,
    `fp."jobTitle" IS NOT NULL AND fp."jobTitle" <> ''`,
  ];
  const params: unknown[] = [];
  let n = 1;
  if (search) {
    const t = `%${search}%`;
    conditions.push(
      `(u."firstname" ILIKE $${n} OR u."lastname" ILIKE $${n + 1} OR u."bio" ILIKE $${n + 2} OR (fp."jobTitle" IS NOT NULL AND fp."jobTitle" ILIKE $${n + 3}))`
    );
    params.push(t, t, t, t);
    n += 4;
  }
  if (skills) {
    const arr = String(skills)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (arr.length) {
      conditions.push(`fp."id" IS NOT NULL AND fp."skills" && $${n}::text[]`);
      params.push(arr);
      n += 1;
    }
  }
  if (location) {
    const t = `%${location}%`;
    conditions.push(`(u."country" ILIKE $${n} OR (fp."city" IS NOT NULL AND fp."city" ILIKE $${n + 1}))`);
    params.push(t, t);
    n += 2;
  }
  if (experienceLevel) {
    conditions.push(`fp."experienceLevel" = $${n}`);
    params.push(String(experienceLevel).toUpperCase());
    n += 1;
  }
  return { where: conditions.join(" AND "), params, next: n };
}

// Register a new user
const registerUser: Handler = async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const firstname = body.firstname;
    const lastname = body.lastname;
    const email = body.email;
    const password = body.password;
    const country = body.country;
    const role = body.role;
    const company = body.company;
    const companyEmail = body.companyEmail;

    if (
      typeof firstname !== "string" ||
      typeof lastname !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof country !== "string" ||
      typeof role !== "string"
    ) {
      return next(new ApiError(400, "All fields (firstname, lastname, email, password, country, role) are required"));
    }

    const validRoles = ["FREELANCER", "CLIENT"];
    if (!validRoles.includes(role)) {
      return next(new ApiError(400, `Invalid role. Must be one of: ${validRoles.join(", ")}`));
    }

    const existingUser = await sqlOne(`SELECT "id" FROM "User" WHERE "email" = $1`, [email]);
    if (existingUser) {
      return next(new ApiError(400, "A user with this email already exists"));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new ApiError(400, "Invalid email format"));
    }
    if (companyEmail && !emailRegex.test(companyEmail)) {
      return next(new ApiError(400, "Invalid company email format"));
    }

    if (!PASSWORD_REGEX.test(password)) {
      return next(new ApiError(400, "Password must be at least 8 characters with uppercase, lowercase, number, and special character"));
    }

    const hashedPassword = await hashPassword(password);
    const isComplete = role !== "FREELANCER";

    const newUser = await withTransaction(async (client) => {
      const tsql = txSql(client);
      const tone = txOne(client);
      const u = await tone(
        `INSERT INTO "User" (
          "firstname", "lastname", "email", "password", "country", "role",
          "company", "companyEmail", "isProfileComplete"
        ) VALUES ($1, $2, $3, $4, $5, $6::"Role", $7, $8, $9) RETURNING *`,
        [
          firstname,
          lastname,
          email,
          hashedPassword,
          country,
          role,
          typeof company === "string" ? company : null,
          typeof companyEmail === "string" ? companyEmail : null,
          isComplete,
        ]
      );
      const uRow = u as DbRow;
      if (role === "FREELANCER") {
        await tsql(
          `INSERT INTO "FreelancerProfile" (
            "user_id", "totalJobs", "totalHours", "successRate", "rating", "totalEarnings",
            "skills", "languages", "tools", "certifications", "availabilityStatus", "experienceLevel"
          ) VALUES (
            $1, 0, 0, 0, 0, 0.00, ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 'UNAVAILABLE'::"Availability", 'ENTRY'::"ExperienceLevel"
          )`,
          [uRow.id]
        );
      }
      if (role === "FREELANCER") {
        uRow.freelancerProfile = await tone(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [uRow.id]);
      }
      return mapUserRow(uRow);
    });

    if (!newUser) {
      return next(new ApiError(500, "Failed to register user"));
    }
    const nu = newUser as DbRow;
    await issueAuthCookies(res, nu as AuthUser);

    const userResponse = {
      id: nu.id,
      firstname: nu.firstname,
      lastname: nu.lastname,
      email: nu.email,
      country: nu.country,
      role: nu.role,
      company: nu.company,
      companyEmail: nu.companyEmail,
      isProfileComplete: nu.isProfileComplete,
      freelancerProfile: nu.freelancerProfile || null,
    };

    return res.status(201).json(new ApiResponse(201, { user: userResponse }, "User registered successfully"));
  } catch (error) {
    logger.error("Error registering user: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to register user"));
  }
};

// Login an existing user
const loginUser: Handler = async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;

    if (!email || !password) {
      return next(new ApiError(400, "Email and password are required"));
    }

    const lockoutKey = `login_attempts:${email.toLowerCase()}`;
    let redisAvailable = true;
    try {
      const attempts = await redisClient.get(lockoutKey);
      if (attempts && parseInt(attempts) >= MAX_LOGIN_ATTEMPTS) {
        const ttl = await redisClient.ttl(lockoutKey);
        return next(
          new ApiError(429, `Account locked due to too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`)
        );
      }
    } catch {
      redisAvailable = false;
      logger.warn("Redis unavailable during login — skipping lockout check");
    }

    const user = mapUserRow(
      (await sqlOne(`SELECT * FROM "User" WHERE "email" = $1`, [email])) as DbRow | null
    );
    if (!user) {
      return next(new ApiError(401, "Invalid credentials"));
    }
    if (!user.isActive) {
      return next(new ApiError(401, "Invalid credentials"));
    }

    const isPasswordValid = await comparePasswords(password, String(user.password));
    if (!isPasswordValid) {
      if (redisAvailable) {
        try {
          const attempts = await redisClient.incr(lockoutKey);
          if (attempts === 1) await redisClient.expire(lockoutKey, LOCKOUT_DURATION);
        } catch {
          // tracking failure is non-critical; login can proceed
        }
      }
      return next(new ApiError(401, "Invalid credentials"));
    }

    if (redisAvailable) {
      try {
        await redisClient.del(lockoutKey);
      } catch {
        /* non-critical */
      }
    }

    let freelancerProfile = null;
    if (user.role === "FREELANCER") {
      freelancerProfile = await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [user.id]);
      // Self-heal: recompute isProfileComplete from current profile state
      if (freelancerProfile) {
        const fp = freelancerProfile as DbRow;
        const { user_id, ...fprest } = fp;
        const isComplete = !!isFreelancerProfileComplete({ ...fprest, userId: user_id } as never);
        if (isComplete !== user.isProfileComplete) {
          await sql(`UPDATE "User" SET "isProfileComplete" = $1, "updatedAt" = NOW() WHERE "id" = $2`, [isComplete, user.id]);
          user.isProfileComplete = isComplete;
        }
      }
    }

    await issueAuthCookies(res, user as AuthUser);

    const userResponse = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      country: user.country,
      role: user.role,
      company: user.company,
      companyEmail: user.companyEmail,
      isProfileComplete: user.isProfileComplete,
      freelancerProfile: freelancerProfile || null,
    };

    return res.status(200).json(new ApiResponse(200, { user: userResponse }, "Login successful"));
  } catch (error) {
    logger.error("Error logging in user: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to login user"));
  }
};

// Fetch user profile (own or public)
const getUserProfile: Handler = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user?.id;
    if (!userId) {
      logger.warn("getUserProfile: No user ID from token or params");
      return next(new ApiError(401, "Unauthorized: No user ID provided"));
    }

    const parsedUserId = parseInt(userId, 10);
    const isOwnProfile = req.user && req.user.id === parsedUserId;

    const user = mapUserRow(
      await sqlOne(
        `SELECT
          u."id", u."firstname", u."lastname", u."email", u."country", u."username", u."role", u."profilePicture", u."bio",
          u."isActive", u."isProfileComplete", u."createdAt", u."company", u."companyEmail", u."lastNameChange", u."isVerified",
          u."totalJobs", u."totalHours", u."successRate", u."rating", u."applied_jobs_id" AS "appliedJobsId"
         FROM "User" u
         WHERE u."id" = $1`,
        [parsedUserId]
      )
    );

    logger.debug("getUserProfile: Queried user id=%d", user?.id);

    if (!user || !user.isActive) {
      return next(new ApiError(404, "User not found or account is deactivated"));
    }

    let portfolioVideos = [];
    let gigRows = [];
    let userBadgesWithBadge = [];
    const fp = await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [parsedUserId]);
    // Self-heal isProfileComplete for own profile fetch
    if (fp && isOwnProfile && user.role === "FREELANCER") {
      const { user_id: _uid, ...fprest } = fp;
      const isComplete = !!isFreelancerProfileComplete({ ...fprest, userId: _uid } as never);
      if (isComplete !== user.isProfileComplete) {
        await sql(`UPDATE "User" SET "isProfileComplete" = $1, "updatedAt" = NOW() WHERE "id" = $2`, [isComplete, user.id]);
        user.isProfileComplete = isComplete;
      }
    }
    if (fp) {
      [portfolioVideos, gigRows, userBadgesWithBadge] = await Promise.all([
        sql(
          `SELECT * FROM "PortfolioVideo" WHERE "freelancer_id" = $1 ORDER BY "uploadedAt" DESC LIMIT 50`,
          [fp.id]
        ),
        sql(
          `SELECT * FROM "Gig" WHERE "freelancer_id" = $1 AND "deletedAt" IS NULL LIMIT 50`,
          [fp.id]
        ),
        sql(
          `SELECT ub."id", ub."freelancerId", ub."badgeId", ub."earnedAt", ub."isVisible",
                  b."id" AS "b_id", b."name" AS "b_name", b."icon" AS "b_icon", b."color" AS "b_color", b."description" AS "b_description"
           FROM "UserBadge" ub
           INNER JOIN "Badge" b ON b."id" = ub."badgeId"
           WHERE ub."freelancerId" = $1
           LIMIT 100`,
          [fp.id]
        ),
      ]);
    }

    const userBadgesNested = (userBadgesWithBadge || []).map((r) => ({
      id: r.id,
      freelancerId: r.freelancerId,
      badgeId: r.badgeId,
      earnedAt: r.earnedAt,
      isVisible: r.isVisible,
      badge: {
        id: r.b_id,
        name: r.b_name,
        icon: r.b_icon,
        color: r.b_color,
        description: r.b_description,
      },
    }));

    const { user_id, ...restFp } = fp || {};
    const fpOut = fp
      ? { ...restFp, userId: user_id, portfolioVideos, gigs: gigRows, userBadges: userBadgesNested }
      : null;

    const userResponse = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      country: user.country,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      username: user.username,
      profilePicture: user.profilePicture,
      bio: user.bio,
      isActive: user.isActive,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
      totalJobs: user.totalJobs || 0,
      totalHours: user.totalHours || 0,
      successRate: user.successRate || 0,
      rating: user.rating || 0,
      freelancerProfile: fpOut
        ? {
            ...fpOut,
            totalEarnings: isOwnProfile ? fpOut.totalEarnings : undefined,
            portfolio: portfolioVideos,
            gigs: fpOut.gigs,
          }
        : null,
    };

    if (isOwnProfile) {
      userResponse.email = user.email;
      userResponse.company = user.company;
      userResponse.companyEmail = user.companyEmail;
      userResponse.lastNameChange = user.lastNameChange;
      userResponse.appliedJobsId = user.appliedJobsId;
    }

    return res.status(200).json(new ApiResponse(200, userResponse, "User profile fetched successfully"));
  } catch (error) {
    logger.error("Error fetching user profile: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to fetch user profile"));
  }
};

// Update user profile
const updateUser: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const b = req.body as Record<string, unknown>;
    const {
      firstname,
      lastname,
      email,
      country,
      password,
      username,
      bio,
      company,
      companyEmail,
      city,
      pinCode,
      state,
      jobTitle,
      overview,
      skills,
      portfolioVideos,
      services,
      gigs,
      userBadges,
      languages,
      socialLinks,
      tools,
      equipmentCameras,
      equipmentLenses,
      equipmentLighting,
      equipmentOther,
      certifications,
      minimumRate,
      maximumRate,
      hourlyRate,
      weeklyHours,
      availabilityStatus,
      experienceLevel,
    } = b;
    const profilePicture = req.fileUrl || b.profilePicture;

    logger.debug("Update payload for user %d", userId);

    const user = mapUserRow((await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [userId])) as DbRow | null);
    const userFp = (await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [userId])) as DbRow | null;
    if (!user || !user.isActive) {
      return next(new ApiError(404, "User not found or account is deactivated"));
    }

    // Name change restriction
    if ((firstname || lastname) && user.lastNameChange) {
      const lastChange = new Date(user.lastNameChange as string | number | Date);
      const now = new Date();
      if ((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24 * 30) < 3) {
        return next(new ApiError(400, "Name can only be changed every 3 months"));
      }
    }

    const userUpdateData: Record<string, unknown> = {};
    if (firstname) userUpdateData.firstname = firstname;
    if (lastname) userUpdateData.lastname = lastname;
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new ApiError(400, "Invalid email format"));
      }
      if (email !== user.email) {
        const other = await sqlOne(`SELECT "id" FROM "User" WHERE "email" = $1 AND "id" <> $2`, [email, userId]);
        if (other) {
          return next(new ApiError(400, "Email is already in use"));
        }
      }
      userUpdateData.email = email;
    }
    if (country) userUpdateData.country = country;
    if (password) userUpdateData.password = await hashPassword(password);
    if (username) {
      if (username !== user.username) {
        const other = await sqlOne(`SELECT "id" FROM "User" WHERE "username" = $1 AND "id" <> $2`, [username, userId]);
        if (other) {
          return next(new ApiError(400, "Username is already in use"));
        }
      }
      userUpdateData.username = username;
    }
    if (bio !== undefined) userUpdateData.bio = bio;
    if (company !== undefined) userUpdateData.company = company;
    if (companyEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (companyEmail && !emailRegex.test(companyEmail)) {
        return next(new ApiError(400, "Invalid company email format"));
      }
      if (companyEmail) {
        if (companyEmail !== user.companyEmail) {
          const other = await sqlOne(`SELECT "id" FROM "User" WHERE "companyEmail" = $1 AND "id" <> $2`, [companyEmail, userId]);
          if (other) {
            return next(new ApiError(400, "Company email is already in use"));
          }
        }
      }
      userUpdateData.companyEmail = companyEmail;
    }
    if (profilePicture !== undefined) userUpdateData.profilePicture = profilePicture;
    if (firstname || lastname) userUpdateData.lastNameChange = new Date();

    const fpBase = userFp;

    const freelancerProfileUpdateData: Record<string, unknown> = {};
    if (user.role === "FREELANCER") {
      Object.assign(freelancerProfileUpdateData, {
        city: city !== undefined ? city : fpBase?.city,
        pinCode: pinCode !== undefined ? pinCode : fpBase?.pinCode,
        state: state !== undefined ? state : fpBase?.state,
        jobTitle: jobTitle !== undefined ? jobTitle : fpBase?.jobTitle,
        overview: overview !== undefined ? overview : fpBase?.overview,
        skills: skills !== undefined ? skills : fpBase?.skills,
        languages: languages !== undefined ? languages : fpBase?.languages,
        socialLinks: socialLinks !== undefined ? socialLinks : fpBase?.socialLinks,
        tools: tools !== undefined ? tools : fpBase?.tools,
        equipmentCameras: equipmentCameras !== undefined ? equipmentCameras : fpBase?.equipmentCameras,
        equipmentLenses: equipmentLenses !== undefined ? equipmentLenses : fpBase?.equipmentLenses,
        equipmentLighting: equipmentLighting !== undefined ? equipmentLighting : fpBase?.equipmentLighting,
        equipmentOther: equipmentOther !== undefined ? equipmentOther : fpBase?.equipmentOther,
        certifications: certifications !== undefined ? certifications : fpBase?.certifications,
        minimumRate: minimumRate !== undefined ? (minimumRate != null ? parseFloat(minimumRate) : null) : fpBase?.minimumRate,
        maximumRate: maximumRate !== undefined ? (maximumRate != null ? parseFloat(maximumRate) : null) : fpBase?.maximumRate,
        hourlyRate: hourlyRate !== undefined ? (hourlyRate != null ? parseFloat(hourlyRate) : null) : fpBase?.hourlyRate,
        weeklyHours: weeklyHours !== undefined ? (weeklyHours != null ? parseInt(weeklyHours, 10) : null) : fpBase?.weeklyHours,
        availabilityStatus: availabilityStatus !== undefined ? availabilityStatus : fpBase?.availabilityStatus,
        experienceLevel: experienceLevel !== undefined ? experienceLevel : fpBase?.experienceLevel,
        services: services !== undefined ? services : fpBase?.services,
      });
    }

    if (Object.keys(userUpdateData).length === 0 && Object.keys(freelancerProfileUpdateData).length === 0) {
      return next(new ApiError(400, "No valid fields provided for update"));
    }

    await withTransaction(async (client) => {
      const tsql = txSql(client);
      const tone = txOne(client);

      if (Object.keys(userUpdateData).length) {
        const usets = [];
        const uvals = [];
        let p = 1;
        for (const [k, v] of Object.entries(userUpdateData)) {
          if (k === "lastNameChange" && v instanceof Date) {
            usets.push(`"${k}" = $${p}`);
            uvals.push(v);
          } else {
            usets.push(`"${k}" = $${p}`);
            uvals.push(v);
          }
          p += 1;
        }
        uvals.push(userId);
        await tsql(
          `UPDATE "User" SET ${usets.join(", ")}, "updatedAt" = NOW() WHERE "id" = $${p}`,
          uvals
        );
      }

      if (user.role === "FREELANCER" && Object.keys(freelancerProfileUpdateData).length > 0) {
        const m = freelancerProfileUpdateData;
        const user_id = userId;
        const toJson = (x: unknown) => (x == null ? null : x);
        await tsql(
          `INSERT INTO "FreelancerProfile" (
            "user_id", "city", "state", "pinCode", "jobTitle", "overview", "skills", "languages", "socialLinks", "tools",
            "equipmentCameras", "equipmentLenses", "equipmentLighting", "equipmentOther", "certifications",
            "minimumRate", "maximumRate", "hourlyRate", "weeklyHours", "availabilityStatus", "experienceLevel", "services"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7::text[], $8::text[], $9::jsonb, $10::text[], $11, $12, $13, $14, $15::text[],
            $16, $17, $18, $19, $20::"Availability", $21::"ExperienceLevel", $22::jsonb
          )
          ON CONFLICT ("user_id") DO UPDATE SET
            "city" = EXCLUDED."city",
            "state" = EXCLUDED."state",
            "pinCode" = EXCLUDED."pinCode",
            "jobTitle" = EXCLUDED."jobTitle",
            "overview" = EXCLUDED."overview",
            "skills" = EXCLUDED."skills",
            "languages" = EXCLUDED."languages",
            "socialLinks" = EXCLUDED."socialLinks",
            "tools" = EXCLUDED."tools",
            "equipmentCameras" = EXCLUDED."equipmentCameras",
            "equipmentLenses" = EXCLUDED."equipmentLenses",
            "equipmentLighting" = EXCLUDED."equipmentLighting",
            "equipmentOther" = EXCLUDED."equipmentOther",
            "certifications" = EXCLUDED."certifications",
            "minimumRate" = EXCLUDED."minimumRate",
            "maximumRate" = EXCLUDED."maximumRate",
            "hourlyRate" = EXCLUDED."hourlyRate",
            "weeklyHours" = EXCLUDED."weeklyHours",
            "availabilityStatus" = EXCLUDED."availabilityStatus",
            "experienceLevel" = EXCLUDED."experienceLevel",
            "services" = EXCLUDED."services",
            "updatedAt" = NOW()`,
          [
            user_id,
            toJson(m.city),
            toJson(m.state),
            toJson(m.pinCode),
            toJson(m.jobTitle),
            toJson(m.overview),
            m.skills || [],
            m.languages || [],
            m.socialLinks == null ? null : JSON.stringify(m.socialLinks),
            m.tools || [],
            m.equipmentCameras,
            m.equipmentLenses,
            m.equipmentLighting,
            m.equipmentOther,
            m.certifications || [],
            m.minimumRate,
            m.maximumRate,
            m.hourlyRate,
            m.weeklyHours,
            m.availabilityStatus,
            m.experienceLevel,
            m.services == null ? null : JSON.stringify(m.services),
          ]
        );

        if (userBadges && Array.isArray(userBadges)) {
          const fpIdRow = await tone(`SELECT "id" FROM "FreelancerProfile" WHERE "user_id" = $1`, [userId]);
          if (fpIdRow) {
            for (const b of userBadges) {
              if (b.id) {
                await tsql(
                  `UPDATE "UserBadge" SET "isVisible" = $1 WHERE "id" = $2 AND "freelancerId" = $3`,
                  [b.isVisible, b.id, fpIdRow.id]
                );
              } else {
                await tsql(
                  `INSERT INTO "UserBadge" ("freelancerId", "badgeId", "isVisible") VALUES ($1, $2, $3)`,
                  [fpIdRow.id, b.badgeId, b.isVisible]
                );
              }
            }
          }
        }
      }
    });

    const updatedUser = mapUserRow(await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [userId]));
    const updatedFp = await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [userId]);

    if (user.role === "FREELANCER" && updatedFp) {
      const { user_id, ...fprest } = updatedFp;
      const isComplete = !!isFreelancerProfileComplete({ ...fprest, userId: user_id });
      if (isComplete !== updatedUser.isProfileComplete) {
        await sql(`UPDATE "User" SET "isProfileComplete" = $1, "updatedAt" = NOW() WHERE "id" = $2`, [isComplete, userId]);
        updatedUser.isProfileComplete = isComplete;
      }
    }

    const { user_id: f_uid, ...fpForResp } = updatedFp || {};
    const userResponse = {
      id: updatedUser.id,
      firstname: updatedUser.firstname,
      lastname: updatedUser.lastname,
      email: updatedUser.email,
      country: updatedUser.country,
      username: updatedUser.username,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
      bio: updatedUser.bio,
      isActive: updatedUser.isActive,
      isProfileComplete: updatedUser.isProfileComplete,
      createdAt: updatedUser.createdAt,
      company: updatedUser.company,
      companyEmail: updatedUser.companyEmail,
      freelancerProfile: updatedFp ? { ...fpForResp, userId: f_uid } : null,
    };

    return res.status(200).json(new ApiResponse(200, userResponse, "User updated successfully"));
  } catch (error) {
    logger.error("Error updating user: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to update user"));
  }
};

// Delete specific item (portfolio, services, gigs)
const deleteItem: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { type, id } = req.params;

    const validTypes = ["portfolio", "services", "gigs"];
    if (!validTypes.includes(type)) {
      return next(new ApiError(400, "Invalid type. Must be portfolio, services, or gigs"));
    }

    const urow = mapUserRow(await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [userId]));
    const fp = await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [userId]);
    if (!urow || !urow.isActive) {
      return next(new ApiError(404, "User not found or account is deactivated"));
    }
    if (!fp) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    if (type === "portfolio") {
      const del = await sql(
        `DELETE FROM "PortfolioVideo" WHERE "id" = $1 AND "freelancer_id" = $2 RETURNING "id"`,
        [parseInt(id, 10), fp.id]
      );
      if (!del.length) {
        return next(new ApiError(404, "Portfolio item not found"));
      }
    } else if (type === "services") {
      const currentServices = fp.services;
      const parsed = Array.isArray(currentServices) ? currentServices : currentServices || [];
      const updatedServices = parsed.filter((item) => item.id !== id);
      await sql(`UPDATE "FreelancerProfile" SET "services" = $1::jsonb, "updatedAt" = NOW() WHERE "id" = $2`, [
        JSON.stringify(updatedServices),
        fp.id,
      ]);
    } else if (type === "gigs") {
      const del = await sql(
        `DELETE FROM "Gig" WHERE "id" = $1 AND "freelancer_id" = $2 RETURNING "id"`,
        [parseInt(id, 10), fp.id]
      );
      if (!del.length) {
        return next(new ApiError(404, "Gig not found"));
      }
    }

    const updatedUser = mapUserRow(await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [userId]));
    const fpn = await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "user_id" = $1`, [userId]);
    const portfolioVideos = await sql(`SELECT * FROM "PortfolioVideo" WHERE "freelancer_id" = $1`, [fpn.id]);
    const gigRows = await sql(
      `SELECT * FROM "Gig" WHERE "freelancer_id" = $1 AND "deletedAt" IS NULL`,
      [fpn.id]
    );

    const { user_id, ...rrest } = fpn;
    const userResponse = {
      id: updatedUser.id,
      firstname: updatedUser.firstname,
      lastname: updatedUser.lastname,
      email: updatedUser.email,
      country: updatedUser.country,
      username: updatedUser.username,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
      bio: updatedUser.bio,
      isActive: updatedUser.isActive,
      isProfileComplete: updatedUser.isProfileComplete,
      createdAt: updatedUser.createdAt,
      company: updatedUser.company,
      companyEmail: updatedUser.companyEmail,
      freelancerProfile: fpn
        ? {
            ...rrest,
            userId: user_id,
            portfolio: portfolioVideos,
            gigs: gigRows,
          }
        : null,
    };

    return res.status(200).json(new ApiResponse(200, userResponse, `${type} item deleted successfully`));
  } catch (error) {
    logger.error("Error deleting item: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete item"));
  }
};

// Deactivate user account
const deleteUser: Handler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;

    const user = await sqlOne(`SELECT * FROM "User" WHERE "id" = $1`, [userId]);
    if (!user || !user.isActive) {
      return next(new ApiError(404, "User not found or already deactivated"));
    }

    await sql(`UPDATE "User" SET "isActive" = false, "updatedAt" = NOW() WHERE "id" = $1`, [userId]);

    logger.info("User %d deactivated", userId);
    return res.status(200).json(new ApiResponse(200, null, "User account deactivated successfully"));
  } catch (error) {
    logger.error("Error deleting user: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete user"));
  }
};

// Fetch all available badges
const getAllBadges: Handler = async (req, res, next) => {
  try {
    const badges = await sql(
      `SELECT "id", "name", "icon", "color", "description" FROM "Badge" ORDER BY "name" ASC`
    );
    return res.status(200).json(new ApiResponse(200, badges, "Badges fetched successfully"));
  } catch (error) {
    logger.error("Error fetching badges: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to fetch badges"));
  }
};

const getAllFreelancers: Handler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }

    const q = req.query as Record<string, string | string[] | undefined>;
    const page = String((Array.isArray(q.page) ? q.page[0] : q.page) ?? "1");
    const limit = String((Array.isArray(q.limit) ? q.limit[0] : q.limit) ?? "10");
    const search = Array.isArray(q.search) ? q.search[0] : q.search;
    const skills = Array.isArray(q.skills) ? q.skills[0] : q.skills;
    const location = Array.isArray(q.location) ? q.location[0] : q.location;
    const experienceLevel = Array.isArray(q.experienceLevel) ? q.experienceLevel[0] : q.experienceLevel;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { where, params: baseParams } = buildFreelanceWhereClauses({ search, skills, location, experienceLevel });
    const countSql = `SELECT COUNT(*)::int AS count FROM "User" u LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id" WHERE ${where}`;

    const limitIdx = baseParams.length + 1;
    const offsetIdx = baseParams.length + 2;
    const idSql = `SELECT u."id" FROM "User" u LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id" WHERE ${where} ORDER BY u."createdAt" DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    const [countRow, idRows] = await Promise.all([
      sqlOne(countSql, baseParams),
      sql(idSql, [...baseParams, parseInt(limit, 10), skip]),
    ]);
    const total = (countRow as DbRow | null)?.count ?? 0;
    const ids = idRows.map((r) => (r as DbRow).id as number);
    if (ids.length === 0) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            freelancers: [],
            total: 0,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            totalPages: 0,
          },
          "Freelancers retrieved successfully"
        )
      );
    }

    const listPlace = ids.map((_, i) => `$${i + 1}`).join(", ");
    const dataRows = await sql(
      `SELECT
        u."id", u."firstname", u."lastname", u."username", u."bio", u."country", u."profilePicture", u."createdAt", u."updatedAt",
        fp."id" AS "fp_id",
        fp."city" AS "fp_city",
        fp."jobTitle" AS "fp_jobTitle",
        fp."overview" AS "fp_overview",
        fp."skills" AS "fp_skills",
        fp."languages" AS "fp_languages",
        fp."tools" AS "fp_tools",
        fp."certifications" AS "fp_certifications",
        fp."minimumRate" AS "fp_minimumRate",
        fp."maximumRate" AS "fp_maximumRate",
        fp."hourlyRate" AS "fp_hourlyRate",
        fp."weeklyHours" AS "fp_weeklyHours",
        fp."availabilityStatus" AS "fp_availabilityStatus",
        fp."experienceLevel" AS "fp_experienceLevel",
        fp."socialLinks" AS "fp_socialLinks",
        fp."equipmentCameras" AS "fp_equipmentCameras",
        fp."equipmentLenses" AS "fp_equipmentLenses",
        fp."equipmentLighting" AS "fp_equipmentLighting",
        fp."equipmentOther" AS "fp_equipmentOther",
        fp."totalEarnings" AS "fp_totalEarnings",
        fp."rating" AS "fp_rating",
        fp."totalJobs" AS "fp_totalJobs",
        fp."totalHours" AS "fp_totalHours",
        fp."successRate" AS "fp_successRate"
      FROM "User" u
      LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id"
      WHERE u."id" IN (${listPlace})`,
      ids
    );
    const orderMap = new Map(ids.map((id, idx) => [id, idx]));
    dataRows.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    const fpIds = dataRows.map((r) => (r as DbRow).fp_id).filter(Boolean) as number[];
    const softwareByFp: Record<number, DbRow[]> = {};
    const portfolioByFp: Record<number, DbRow[]> = {};
    const gigByFp: Record<number, DbRow[]> = {};
    const badgeByFp: Record<number, DbRow[]> = {};
    if (fpIds.length) {
      const fplace = fpIds.map((_, i) => `$${i + 1}`).join(", ");
      const [sRows, pRows, gRows, ubRows] = await Promise.all([
        sql(
          `SELECT * FROM "FreelancerSoftware" WHERE "freelancer_id" IN (${fplace})`,
          fpIds
        ),
        sql(
          `SELECT * FROM "PortfolioVideo" WHERE "freelancer_id" IN (${fplace})`,
          fpIds
        ),
        sql(
          `SELECT * FROM "Gig" WHERE "freelancer_id" IN (${fplace}) AND "deletedAt" IS NULL`,
          fpIds
        ),
        sql(
          `SELECT * FROM "UserBadge" WHERE "freelancerId" IN (${fplace})`,
          fpIds
        ),
      ]);
      for (const s of sRows) {
        const k = s.freelancer_id;
        if (!softwareByFp[k]) softwareByFp[k] = [];
        softwareByFp[k].push({ id: s.id, name: s.name, icon: s.icon, level: s.level });
      }
      for (const p of pRows) {
        const k = p.freelancer_id;
        if (!portfolioByFp[k]) portfolioByFp[k] = [];
        portfolioByFp[k].push(p);
      }
      for (const g of gRows) {
        const k = g.freelancer_id;
        if (!gigByFp[k]) gigByFp[k] = [];
        gigByFp[k].push(g);
      }
      for (const ub of ubRows) {
        const k = ub.freelancerId;
        if (!badgeByFp[k]) badgeByFp[k] = [];
        badgeByFp[k].push(ub);
      }
    }

    const formattedFreelancers = dataRows.map((freelancer) => {
      const fpId = freelancer.fp_id;
      const fprof = {
        city: freelancer.fp_city,
        jobTitle: freelancer.fp_jobTitle,
        overview: freelancer.fp_overview,
        skills: freelancer.fp_skills,
        languages: freelancer.fp_languages,
        tools: freelancer.fp_tools,
        certifications: freelancer.fp_certifications,
        minimumRate: freelancer.fp_minimumRate,
        maximumRate: freelancer.fp_maximumRate,
        hourlyRate: freelancer.fp_hourlyRate,
        weeklyHours: freelancer.fp_weeklyHours,
        availabilityStatus: freelancer.fp_availabilityStatus,
        experienceLevel: freelancer.fp_experienceLevel,
        socialLinks: freelancer.fp_socialLinks,
        equipmentCameras: freelancer.fp_equipmentCameras,
        equipmentLenses: freelancer.fp_equipmentLenses,
        equipmentLighting: freelancer.fp_equipmentLighting,
        equipmentOther: freelancer.fp_equipmentOther,
        rating: freelancer.fp_rating,
        totalJobs: freelancer.fp_totalJobs,
        totalHours: freelancer.fp_totalHours,
        successRate: freelancer.fp_successRate,
        userBadges: fpId ? badgeByFp[fpId] || [] : [],
        software: fpId ? softwareByFp[fpId] || [] : [],
        portfolioVideos: fpId ? portfolioByFp[fpId] || [] : [],
        gigs: fpId ? gigByFp[fpId] || [] : [],
      };
      return {
        id: freelancer.id,
        name: `${freelancer.firstname || ""} ${freelancer.lastname || ""}`.trim() || "Unnamed Freelancer",
        username: freelancer.username || null,
        bio: freelancer.bio || "",
        country: freelancer.country || "",
        city: fprof.city || "",
        profilePicture: freelancer.profilePicture || "",
        jobTitle: fprof.jobTitle || "",
        overview: fprof.overview || "",
        skills: fprof.skills || [],
        languages: fprof.languages || [],
        tools: fprof.tools || [],
        certifications: fprof.certifications || [],
        minimumRate: fprof.minimumRate || null,
        maximumRate: fprof.maximumRate || null,
        hourlyRate: fprof.hourlyRate || null,
        weeklyHours: fprof.weeklyHours || null,
        availabilityStatus: fprof.availabilityStatus || "UNAVAILABLE",
        experienceLevel: fprof.experienceLevel || "ENTRY",
        socialLinks: fprof.socialLinks || {},
        equipmentCameras: fprof.equipmentCameras || "",
        equipmentLenses: fprof.equipmentLenses || "",
        equipmentLighting: fprof.equipmentLighting || "",
        equipmentOther: fprof.equipmentOther || "",
        rating: fprof.rating || 0,
        createdAt: freelancer.createdAt,
        updatedAt: freelancer.updatedAt,
        software: fprof.software,
        portfolio: fprof.portfolioVideos || [],
        gigs: fprof.gigs || [],
        badges: fprof.userBadges?.filter((badge) => badge.isVisible) || [],
      };
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          freelancers: formattedFreelancers,
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        },
        "Freelancers retrieved successfully"
      )
    );
  } catch (error) {
    const e = error as Error;
    logger.error(`Error retrieving freelancers: ${e.message}\n${e.stack}`);
    return next(new ApiError(500, `Failed to retrieve freelancers: ${e.message}`));
  }
};

// Updated: Get freelancer by ID
const getFreelancerById: Handler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }

    const { freelancerId } = req.params;
    const userId = parseInt(freelancerId, 10);

    const freelancer = mapUserRow(
      await sqlOne(
        `SELECT u."id", u."firstname", u."lastname", u."username", u."bio", u."country", u."profilePicture",
                u."createdAt", u."updatedAt", u."rating" AS "user_rating",
                u."isProfileComplete" AS "user_isProfileComplete",
                fp."id" AS "fp_id"
         FROM "User" u
         LEFT JOIN "FreelancerProfile" fp ON fp."user_id" = u."id"
         WHERE u."id" = $1 AND u."role" = 'FREELANCER' AND u."isActive" = true`,
        [userId]
      )
    );

    if (!freelancer) {
      return next(new ApiError(404, "Freelancer not found"));
    }
    if (!freelancer.fp_id || freelancer.user_isProfileComplete !== true) {
      return next(new ApiError(404, "Freelancer profile not yet published"));
    }

    const fpId = freelancer.fp_id;
    const fRow = await sqlOne(`SELECT * FROM "FreelancerProfile" WHERE "id" = $1`, [fpId]);
    const [sRows, pRows, gRows, ubRows] = await Promise.all([
      sql(`SELECT "id", "name", "icon", "level" FROM "FreelancerSoftware" WHERE "freelancer_id" = $1`, [fpId]),
      sql(
        `SELECT "id", "title", "videoUrl", "description", "category", "uploadedAt" FROM "PortfolioVideo" WHERE "freelancer_id" = $1`,
        [fpId]
      ),
      sql(
        `SELECT "id", "title", "description", "pricing", "deliveryTime", "thumbnailUrl", "category", "status" FROM "Gig" WHERE "freelancer_id" = $1 AND "deletedAt" IS NULL`,
        [fpId]
      ),
      sql(
        `SELECT "id", "badgeId", "isVisible" FROM "UserBadge" WHERE "freelancerId" = $1`,
        [fpId]
      ),
    ]);

    const { user_rating, fp_id, ...fUser } = freelancer;

    const formattedFreelancer = {
      id: fUser.id,
      name: `${fUser.firstname || ""} ${fUser.lastname || ""}`.trim() || "Unnamed Freelancer",
      username: fUser.username || null,
      bio: fUser.bio || "",
      country: fUser.country || "",
      city: fRow?.city || "",
      profilePicture: fUser.profilePicture || "",
      jobTitle: fRow?.jobTitle || "",
      overview: fRow?.overview || "",
      skills: fRow?.skills || [],
      languages: fRow?.languages || [],
      tools: fRow?.tools || [],
      certifications: fRow?.certifications || [],
      minimumRate: fRow?.minimumRate || null,
      maximumRate: fRow?.maximumRate || null,
      hourlyRate: fRow?.hourlyRate || null,
      weeklyHours: fRow?.weeklyHours || null,
      availabilityStatus: fRow?.availabilityStatus || "UNAVAILABLE",
      experienceLevel: fRow?.experienceLevel || "ENTRY",
      socialLinks: fRow?.socialLinks || {},
      equipmentCameras: fRow?.equipmentCameras || "",
      equipmentLenses: fRow?.equipmentLenses || "",
      equipmentLighting: fRow?.equipmentLighting || "",
      equipmentOther: fRow?.equipmentOther || "",
      rating: (fRow?.rating ?? user_rating) ?? 0,
      createdAt: fUser.createdAt,
      updatedAt: fUser.updatedAt,
      software: sRows,
      portfolio: pRows,
      gigs: gRows,
      badges: ubRows?.filter((badge) => badge.isVisible) || [],
    };

    return res.status(200).json(new ApiResponse(200, formattedFreelancer, "Freelancer retrieved successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    const e = error as Error;
    logger.error(`Error retrieving freelancer: ${e.message}\n${e.stack}`);
    return next(new ApiError(500, `Failed to retrieve freelancer: ${e.message}`));
  }
};

// Logout - clear auth cookies + revoke refresh token family
const logoutUser: Handler = async (req, res, next) => {
  try {
    const userId = (req.user as AuthUser | undefined)?.id;
    if (userId) {
      try {
        await revokeRefreshFamily(Number(userId));
      } catch (e) {
        logger.warn("Failed to revoke refresh family on logout: %s", (e as Error).message);
      }
    }
    clearAuthCookies(res);
    return res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
  } catch (error) {
    logger.error("Error logging out: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to logout"));
  }
};

/**
 * FIX M1: Rotate the refresh token and mint a new short-lived access token.
 * Public endpoint (no authenticate middleware) — auth comes from the refresh
 * token cookie itself. CSRF check still applies because the cookie is sent.
 */
const refreshAccessToken: Handler = async (req, res, next) => {
  try {
    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const csrfCookie = (req as ExpressRequest & { cookies?: Record<string, string> }).cookies?.csrf_token;
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return next(new ApiError(403, "Invalid or missing CSRF token"));
    }

    const cookies = (req as ExpressRequest & { cookies?: Record<string, string> }).cookies;
    const presented = cookies?.refresh_token;
    if (!presented) {
      return next(new ApiError(401, "No refresh token provided"));
    }

    let result;
    try {
      result = await rotateRefreshToken(presented);
    } catch (e) {
      // On any verify/reuse/revocation failure, blow away cookies so the
      // client is forced back through /login.
      clearAuthCookies(res);
      logger.warn("Refresh token failure: %s", (e as Error).message);
      return next(new ApiError(401, "Session expired. Please log in again."));
    }

    const r = res as ReplyWithCookies;
    const csrfToken = crypto.randomBytes(32).toString("hex");

    r.setCookie("access_token", result.accessToken, {
      ...ACCESS_COOKIE_BASE,
      maxAge: accessCookieMaxAge(),
    });
    r.setCookie("refresh_token", result.refreshToken, {
      ...REFRESH_COOKIE_BASE,
      maxAge: result.refreshTtlSeconds,
    });
    r.setCookie("csrf_token", csrfToken, {
      ...CSRF_COOKIE_BASE,
      maxAge: result.refreshTtlSeconds,
    });

    return res.status(200).json(new ApiResponse(200, { user: result.user }, "Token refreshed"));
  } catch (error) {
    logger.error("Error refreshing token: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to refresh token"));
  }
};

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getUserProfile,
  updateUser,
  deleteItem,
  deleteUser,
  getAllBadges,
  getAllFreelancers,
  getFreelancerById,
};
