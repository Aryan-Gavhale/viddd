import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPipeline = {
  del: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

const mockStream = {
  on: vi.fn(),
};

const mockRedis = {
  status: "ready",
  get: vi.fn(),
  set: vi.fn().mockResolvedValue("OK"),
  scanStream: vi.fn().mockReturnValue(mockStream),
  pipeline: vi.fn().mockReturnValue(mockPipeline),
};

vi.mock("../Config/redis.js", () => ({ default: mockRedis }));
vi.mock("../Utils/logger.js", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe("Cache utilities", () => {
  let cacheGet: typeof import("../Utils/cache.js").cacheGet;
  let cacheSet: typeof import("../Utils/cache.js").cacheSet;
  let cacheDel: typeof import("../Utils/cache.js").cacheDel;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockStream.on.mockReset();
    const mod = await import("../Utils/cache.js");
    cacheGet = mod.cacheGet;
    cacheSet = mod.cacheSet;
    cacheDel = mod.cacheDel;
  });

  describe("cacheGet", () => {
    it("should return parsed JSON when key exists", async () => {
      mockRedis.get.mockResolvedValue('{"name":"test"}');
      const result = await cacheGet<{ name: string }>("test:key");
      expect(result).toEqual({ name: "test" });
    });

    it("should return null when key doesn't exist", async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await cacheGet("missing:key");
      expect(result).toBeNull();
    });

    it("should return null when Redis is not ready", async () => {
      const origStatus = mockRedis.status;
      mockRedis.status = "connecting";
      const result = await cacheGet("any:key");
      expect(result).toBeNull();
      mockRedis.status = origStatus;
    });
  });

  describe("cacheSet", () => {
    it("should set value with default TTL", async () => {
      await cacheSet("key", { data: 1 });
      expect(mockRedis.set).toHaveBeenCalledWith("key", '{"data":1}', "EX", 120);
    });

    it("should set value with custom TTL", async () => {
      await cacheSet("key", "val", 60);
      expect(mockRedis.set).toHaveBeenCalledWith("key", '"val"', "EX", 60);
    });
  });

  describe("cacheDel", () => {
    it("should use scanStream instead of KEYS", async () => {
      mockStream.on.mockImplementation((event: string, cb: Function) => {
        if (event === "data") cb(["key1", "key2"]);
        if (event === "end") cb();
        return mockStream;
      });
      await cacheDel("test:*");
      expect(mockRedis.scanStream).toHaveBeenCalledWith({ match: "test:*", count: 100 });
      expect(mockPipeline.del).toHaveBeenCalledTimes(2);
    });

    it("should not call exec when no keys found", async () => {
      mockStream.on.mockImplementation((event: string, cb: Function) => {
        if (event === "end") cb();
        return mockStream;
      });
      await cacheDel("empty:*");
      expect(mockPipeline.exec).not.toHaveBeenCalled();
    });
  });
});
