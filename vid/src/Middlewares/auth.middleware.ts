import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { sqlOne } from "../db.js";
import { cacheGet, cacheSet } from "../Utils/cache.js";
import type { AuthUser, JwtPayload, Role } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";

function isJwtPayload(decoded: unknown): decoded is JwtPayload {
  if (!decoded || typeof decoded !== "object") return false;
  const o = decoded as Record<string, unknown>;
  return typeof o.id === "number" && typeof o.email === "string" && typeof o.role === "string";
}

const USER_STATUS_TTL = 60;

async function checkUserActive(userId: number): Promise<void> {
  const cacheKey = `user:active:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached === "0") throw new ApiError(401, "Account deactivated");
  if (cached === "1") return;

  const row = await sqlOne(
    `SELECT "isActive" FROM "User" WHERE "id" = $1`,
    [userId]
  );
  if (!row) throw new ApiError(401, "User not found");
  const active = row.isActive !== false;
  await cacheSet(cacheKey, active ? "1" : "0", USER_STATUS_TTL);
  if (!active) throw new ApiError(401, "Account deactivated");
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  let token: string | undefined;
  let fromCookie = false;

  const cookieToken = request.cookies?.access_token;
  if (cookieToken) {
    token = cookieToken;
    fromCookie = true;
  } else {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    throw new ApiError(401, "Access denied. No token provided.");
  }

  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "Server configuration error");
  }

  if (fromCookie && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const csrfHeader = request.headers["x-csrf-token"];
    const csrfCookie = request.cookies?.csrf_token;
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      throw new ApiError(403, "Invalid or missing CSRF token");
    }
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!isJwtPayload(decoded)) {
      throw new ApiError(401, "Invalid token payload.");
    }

    const tokenType = (decoded as Record<string, unknown>).type;
    if (tokenType !== "access") {
      throw new ApiError(401, "Invalid token type.");
    }

    await checkUserActive(decoded.id);

    const user: AuthUser = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role as AuthUser["role"],
    };
    request.user = user;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const e = error as { name?: string };
    if (e.name === "TokenExpiredError") {
      throw new ApiError(401, "Token expired. Please log in again.");
    }
    if (e.name === "JsonWebTokenError") {
      throw new ApiError(401, "Invalid token.");
    }
    throw new ApiError(401, "Authentication failed.");
  }
}

export async function authenticateWithDB(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authenticate(request, reply);

  const userRow = await sqlOne(
    `SELECT "id", "email", "role", "isActive" FROM "User" WHERE "id" = $1`,
    [request.user!.id]
  );

  if (!userRow) throw new ApiError(401, "User not found");
  const isActive = userRow.isActive as boolean;
  if (!isActive) throw new ApiError(401, "Account deactivated");

  const user: AuthUser = {
    id: userRow.id as number,
    email: String(userRow.email),
    role: userRow.role as AuthUser["role"],
    isActive,
  };
  request.user = user;
}

export function restrictTo(...roles: (Role | Role[] | string)[]) {
  const flatRoles = (Array.prototype.flat.call(roles, Infinity) as string[])
    .filter((r) => typeof r === "string" && r.trim())
    .map((r) => r.trim().toUpperCase());

  return async function restrictHandler(request: FastifyRequest, _reply: FastifyReply) {
    if (!request.user) throw new ApiError(401, "Unauthorized: User not authenticated");

    const userRole = request.user.role?.trim().toUpperCase();
    if (!userRole) throw new ApiError(401, "Unauthorized: User role missing");

    if (!flatRoles.includes(userRole)) {
      throw new ApiError(
        403,
        `Forbidden: Role '${String(request.user.role)}' not allowed. Required: ${flatRoles.join(", ")}`
      );
    }
  };
}

export function restrictToAny(roleSets: (string | string[])[]) {
  return async function restrictAnyHandler(request: FastifyRequest, _reply: FastifyReply) {
    if (!request.user) throw new ApiError(401, "Unauthorized: User not authenticated");

    const userRole = request.user.role?.trim().toUpperCase();
    const normalizedSets = roleSets.map((set) => (Array.isArray(set) ? set : [set]).map((r) => r.trim().toUpperCase()));

    if (!userRole || !normalizedSets.some((set) => set.includes(userRole))) {
      throw new ApiError(403, `Forbidden: Role '${String(request.user.role)}' not in any allowed set`);
    }
  };
}

export async function isAdmin(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.user) throw new ApiError(401, "Authentication required");
  if (request.user.role !== "ADMIN") throw new ApiError(403, "Admin access required");
}

export { authenticate as authenticateToken };
export { authenticateWithDB as protect };
