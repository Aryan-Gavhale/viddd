import type { FastifyRequest, FastifyReply } from "fastify";
import type { ObjectSchema } from "joi";
import { ApiError } from "../Utils/ApiError.js";

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function sanitizeObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    clean[key] = typeof value === "object" && value !== null ? sanitizeObject(value) : value;
  }
  return clean;
}

export function validateBody(schema: ObjectSchema) {
  return async function validateBodyHandler(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    let rawBody: Record<string, unknown> = { ...(request.body as Record<string, unknown>) };

    // Strip prototype-pollution keys before any parsing
    rawBody = sanitizeObject(rawBody) as Record<string, unknown>;

    const parsedBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawBody)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      if (typeof value === "string") {
        // Auto-parse only obvious JSON shapes (objects / arrays). Without
        // this guard a numeric-looking string like "506775" (a TOTP code)
        // would JSON.parse to the number 506775 and break Joi.string()
        // validators downstream.
        const trimmed = value.trim();
        const looksLikeJson =
          (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
          (trimmed.startsWith("[") && trimmed.endsWith("]"));
        if (looksLikeJson) {
          try {
            const parsed = JSON.parse(value) as unknown;
            parsedBody[key] = sanitizeObject(parsed) as
              | string
              | Record<string, unknown>
              | unknown[];
          } catch {
            parsedBody[key] = value;
          }
        } else {
          parsedBody[key] = value;
        }
      } else {
        parsedBody[key] = value;
      }
    }
    if (parsedBody.budgetMin) parsedBody.budgetMin = Number(parsedBody.budgetMin);
    if (parsedBody.budgetMax) parsedBody.budgetMax = Number(parsedBody.budgetMax);

    const { error, value } = schema.validate(parsedBody, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      }));
      const err = new ApiError(400, "Validation failed", errorDetails);
      console.error("[validateBody] Validation errors:", JSON.stringify(errorDetails));
      throw err;
    }

    request.body = value;
  };
}

export function validateQuery(schema: ObjectSchema) {
  return async function validateQueryHandler(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const { error, value } = schema.validate(request.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      }));
      throw new ApiError(400, "Query validation failed", errorDetails);
    }

    request.query = value;
  };
}
