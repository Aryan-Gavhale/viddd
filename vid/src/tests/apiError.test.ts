import { describe, it, expect } from "vitest";
import { ApiError } from "../Utils/ApiError.js";

describe("ApiError", () => {
  it("should create an error with status and message", () => {
    const err = new ApiError(400, "Bad request");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Bad request");
    expect(err instanceof Error).toBe(true);
  });

  it("should default to non-successful for 4xx/5xx", () => {
    const err = new ApiError(404, "Not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
  });

  it("should preserve stack trace", () => {
    const err = new ApiError(500, "Internal");
    expect(err.stack).toBeTruthy();
    expect(err.stack).toContain("Internal");
  });
});
