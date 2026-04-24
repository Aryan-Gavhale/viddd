import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test-jwt-secret-32chars-minimum!!";
vi.stubEnv("JWT_SECRET", TEST_SECRET);

const mockSqlOne = vi.fn();
const mockCacheGet = vi.fn().mockResolvedValue(null);
const mockCacheSet = vi.fn().mockResolvedValue(undefined);

vi.mock("../db.js", () => ({ sqlOne: mockSqlOne }));
vi.mock("../Utils/cache.js", () => ({
  cacheGet: mockCacheGet,
  cacheSet: mockCacheSet,
}));
vi.mock("../Utils/logger.js", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    cookies: {},
    headers: {},
    method: "GET",
    user: undefined as unknown,
    ...overrides,
  } as any;
}

function makeReply() {
  return {} as any;
}

describe("Auth Middleware", () => {
  let authenticate: typeof import("../Middlewares/auth.middleware.js").authenticate;
  let authenticateWithDB: typeof import("../Middlewares/auth.middleware.js").authenticateWithDB;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../Middlewares/auth.middleware.js");
    authenticate = mod.authenticate;
    authenticateWithDB = mod.authenticateWithDB;
  });

  describe("authenticate", () => {
    it("should reject requests with no token", async () => {
      const req = makeRequest();
      await expect(authenticate(req, makeReply())).rejects.toThrow("No token provided");
    });

    it("should reject expired tokens", async () => {
      const token = jwt.sign(
        { id: 1, email: "a@b.com", role: "CLIENT", type: "access" },
        TEST_SECRET,
        { expiresIn: "0s" }
      );
      const req = makeRequest({ headers: { authorization: `Bearer ${token}` } });
      await new Promise((r) => setTimeout(r, 50));
      await expect(authenticate(req, makeReply())).rejects.toThrow("expired");
    });

    it("should reject refresh tokens used as access tokens", async () => {
      const token = jwt.sign(
        { id: 1, email: "a@b.com", role: "CLIENT", type: "refresh", jti: "x" },
        TEST_SECRET,
        { expiresIn: "1h" }
      );
      const req = makeRequest({ headers: { authorization: `Bearer ${token}` } });
      await expect(authenticate(req, makeReply())).rejects.toThrow("Invalid token type");
    });

    it("should accept a valid access token from Authorization header", async () => {
      mockSqlOne.mockResolvedValue({ isActive: true });
      const token = jwt.sign(
        { id: 1, email: "a@b.com", role: "CLIENT", type: "access" },
        TEST_SECRET,
        { expiresIn: "1h" }
      );
      const req = makeRequest({ headers: { authorization: `Bearer ${token}` } });
      await authenticate(req, makeReply());
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
    });

    it("should reject deactivated users", async () => {
      mockCacheGet.mockResolvedValue("0");
      const token = jwt.sign(
        { id: 1, email: "a@b.com", role: "CLIENT", type: "access" },
        TEST_SECRET,
        { expiresIn: "1h" }
      );
      const req = makeRequest({ headers: { authorization: `Bearer ${token}` } });
      await expect(authenticate(req, makeReply())).rejects.toThrow("deactivated");
    });

    it("should enforce CSRF for non-GET requests using cookies", async () => {
      const token = jwt.sign(
        { id: 1, email: "a@b.com", role: "CLIENT", type: "access" },
        TEST_SECRET,
        { expiresIn: "1h" }
      );
      const req = makeRequest({
        method: "POST",
        cookies: { access_token: token },
        headers: {},
      });
      await expect(authenticate(req, makeReply())).rejects.toThrow("CSRF");
    });

    it("should pass CSRF check when headers match", async () => {
      mockCacheGet.mockResolvedValue("1");
      const token = jwt.sign(
        { id: 1, email: "a@b.com", role: "CLIENT", type: "access" },
        TEST_SECRET,
        { expiresIn: "1h" }
      );
      const csrf = "test-csrf-token";
      const req = makeRequest({
        method: "POST",
        cookies: { access_token: token, csrf_token: csrf },
        headers: { "x-csrf-token": csrf },
      });
      await authenticate(req, makeReply());
      expect(req.user.id).toBe(1);
    });
  });

  describe("authenticateWithDB", () => {
    it("should reject when user doesn't exist in DB", async () => {
      mockCacheGet.mockResolvedValue("1");
      mockSqlOne.mockResolvedValue(null);
      const token = jwt.sign(
        { id: 999, email: "gone@b.com", role: "CLIENT", type: "access" },
        TEST_SECRET,
        { expiresIn: "1h" }
      );
      const req = makeRequest({ headers: { authorization: `Bearer ${token}` } });
      await expect(authenticateWithDB(req, makeReply())).rejects.toThrow("not found");
    });

    it("should reject when user.isActive is false", async () => {
      mockCacheGet.mockResolvedValue("1");
      mockSqlOne.mockResolvedValue({ id: 1, email: "a@b.com", role: "CLIENT", isActive: false });
      const token = jwt.sign(
        { id: 1, email: "a@b.com", role: "CLIENT", type: "access" },
        TEST_SECRET,
        { expiresIn: "1h" }
      );
      const req = makeRequest({ headers: { authorization: `Bearer ${token}` } });
      await expect(authenticateWithDB(req, makeReply())).rejects.toThrow("deactivated");
    });
  });
});
