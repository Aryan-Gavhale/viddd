import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test-jwt-secret-32chars-minimum!!";
const TEST_REFRESH_SECRET = "test-refresh-secret-32chars-min!!";

vi.stubEnv("JWT_SECRET", TEST_SECRET);
vi.stubEnv("JWT_REFRESH_SECRET", TEST_REFRESH_SECRET);
vi.stubEnv("JWT_ACCESS_TTL", "15m");
vi.stubEnv("JWT_REFRESH_TTL", "7d");

const mockRedis = {
  set: vi.fn().mockResolvedValue("OK"),
  get: vi.fn(),
  del: vi.fn().mockResolvedValue(1),
  status: "ready",
};

vi.mock("../Config/redis.js", () => ({ default: mockRedis }));
vi.mock("./logger.js", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe("Token utilities", () => {
  let generateAccessToken: typeof import("../Utils/tokens.js").generateAccessToken;
  let generateRefreshToken: typeof import("../Utils/tokens.js").generateRefreshToken;
  let rotateRefreshToken: typeof import("../Utils/tokens.js").rotateRefreshToken;
  let revokeRefreshFamily: typeof import("../Utils/tokens.js").revokeRefreshFamily;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../Utils/tokens.js");
    generateAccessToken = mod.generateAccessToken;
    generateRefreshToken = mod.generateRefreshToken;
    rotateRefreshToken = mod.rotateRefreshToken;
    revokeRefreshFamily = mod.revokeRefreshFamily;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const testUser = { id: 1, email: "test@example.com", role: "FREELANCER" as const };

  describe("generateAccessToken", () => {
    it("should generate a valid JWT with type=access", () => {
      const token = generateAccessToken(testUser);
      const decoded = jwt.verify(token, TEST_SECRET) as Record<string, unknown>;
      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe("test@example.com");
      expect(decoded.role).toBe("FREELANCER");
      expect(decoded.type).toBe("access");
    });

    it("should expire within the configured TTL", () => {
      const token = generateAccessToken(testUser);
      const decoded = jwt.decode(token) as Record<string, unknown>;
      const exp = decoded.exp as number;
      const iat = decoded.iat as number;
      expect(exp - iat).toBe(15 * 60);
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a refresh JWT with type=refresh and jti", async () => {
      const result = await generateRefreshToken(testUser);
      const decoded = jwt.verify(result.token, TEST_REFRESH_SECRET) as Record<string, unknown>;
      expect(decoded.type).toBe("refresh");
      expect(decoded.jti).toBeTruthy();
      expect(typeof decoded.jti).toBe("string");
    });

    it("should store the jti in Redis", async () => {
      const result = await generateRefreshToken(testUser);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `auth:refresh:1`,
        result.jti,
        "EX",
        expect.any(Number)
      );
    });
  });

  describe("rotateRefreshToken", () => {
    it("should reject a token with wrong secret", async () => {
      const badToken = jwt.sign(
        { id: 1, email: "test@example.com", role: "FREELANCER", type: "refresh", jti: "abc" },
        "wrong-secret"
      );
      await expect(rotateRefreshToken(badToken)).rejects.toThrow();
    });

    it("should reject a reused jti (token theft detection)", async () => {
      const jti = "old-jti";
      const token = jwt.sign(
        { id: 1, email: "test@example.com", role: "FREELANCER", type: "refresh", jti },
        TEST_REFRESH_SECRET
      );
      mockRedis.get.mockResolvedValue("newer-jti");
      await expect(rotateRefreshToken(token)).rejects.toThrow("reuse detected");
      expect(mockRedis.del).toHaveBeenCalledWith("auth:refresh:1");
    });

    it("should rotate successfully with valid current jti", async () => {
      const jti = "current-jti";
      const token = jwt.sign(
        { id: 1, email: "test@example.com", role: "FREELANCER", type: "refresh", jti },
        TEST_REFRESH_SECRET
      );
      mockRedis.get.mockResolvedValue(jti);
      const result = await rotateRefreshToken(token);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.id).toBe(1);
    });
  });

  describe("revokeRefreshFamily", () => {
    it("should delete the Redis key for the user", async () => {
      await revokeRefreshFamily(42);
      expect(mockRedis.del).toHaveBeenCalledWith("auth:refresh:42");
    });
  });
});
