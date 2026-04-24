import "fastify";
import type { AuthUser } from "./index.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser | null;
    file?: Express.Multer.File & { location?: string };
    files?:
      | (Express.Multer.File & { location?: string })[]
      | Record<string, (Express.Multer.File & { location?: string })[]>;
    fileUrl?: string | null;
    fileUrls?: string[] | null;
    resource?: unknown;
  }
}
