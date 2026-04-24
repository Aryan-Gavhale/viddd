import type { FastifyReply, FastifyRequest } from "fastify";
import { sqlOne } from "../db.js";
import type { DbRow } from "../types/index.js";
import { ApiError } from "../Utils/ApiError.js";

export function checkOwnership(resourceType: string, idParam: string, ownerField: string) {
  return async function ownershipHandler(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.user?.id) throw new ApiError(401, "Unauthorized: User not authenticated");

    const userId = request.user.id;
    const params = request.params as Record<string, string | undefined>;
    const resourceId = parseInt(String(params[idParam]), 10);

    let resource: DbRow | null = null;
    switch (resourceType.toLowerCase()) {
      case "gig": {
        resource = await sqlOne(
          `SELECT g.*, fp.user_id AS "freelancerUserId"
           FROM "Gig" g
           JOIN "FreelancerProfile" fp ON fp."id" = g.freelancer_id
           WHERE g."id" = $1`,
          [resourceId]
        );
        if (resource && (resource as { freelancerUserId?: number }).freelancerUserId !== userId) {
          throw new ApiError(403, "Forbidden: You can only modify your own gigs");
        }
        break;
      }
      case "order": {
        resource = await sqlOne(
          `SELECT o.*, fp.user_id AS "freelancerUserId"
           FROM "Order" o
           LEFT JOIN "FreelancerProfile" fp ON fp."id" = o.freelancer_id
           WHERE o."id" = $1`,
          [resourceId]
        );
        if (
          resource &&
          (resource[ownerField] as number) !== userId &&
          (resource as { freelancerUserId?: number | null }).freelancerUserId !== userId
        ) {
          throw new ApiError(403, "Forbidden: You can only modify your own orders");
        }
        break;
      }
      default:
        throw new ApiError(400, `Unsupported resource type: ${resourceType}`);
    }

    if (!resource) throw new ApiError(404, `${resourceType} not found`);
    request.resource = resource;
  };
}
