import { sql, sqlOne, sqlCount } from "../db.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import logger from "../Utils/logger.js";
import { getIO } from "../socket.js";
import { ROOMS } from "../../../shared/socketEvents.js";
import type { ExpressRequest, ExpressResponse, NextFunction, DbRow } from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

async function assertOrderParticipant(orderId: number, userId: number): Promise<DbRow> {
  const order = await sqlOne(
    `SELECT o.*, o."client_id" AS "clientId", fp."user_id" AS "freelancerUserId"
     FROM "Order" o
     JOIN "FreelancerProfile" fp ON fp."id" = o."freelancer_id"
     WHERE o."id" = $1 AND o."deletedAt" IS NULL`,
    [orderId]
  );
  if (!order) throw new ApiError(404, "Order not found");
  if (order.clientId !== userId && order.freelancerUserId !== userId) {
    throw new ApiError(403, "You are not a participant of this order");
  }
  return order;
}

/**
 * Create a timecoded comment on a video deliverable.
 */
export const createVideoComment: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { orderId } = req.params as Record<string, string>;
    const body = req.body as Record<string, unknown>;
    const { videoUrl, timecode, content, parentId, annotationData, frameSnapshot } = body;

    const oid = parseInt(orderId, 10);
    await assertOrderParticipant(oid, req.user.id);

    if (parentId) {
      const parent = await sqlOne(
        `SELECT id FROM "VideoComment" WHERE id = $1 AND "orderId" = $2`,
        [parseInt(String(parentId), 10), oid]
      );
      if (!parent) return next(new ApiError(404, "Parent comment not found"));
    }

    const comment = await sqlOne(
      `INSERT INTO "VideoComment"
         ("orderId", "userId", "videoUrl", timecode, content, "parentId", "annotationData", "frameSnapshot", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        oid,
        req.user.id,
        String(videoUrl),
        Number(timecode),
        String(content),
        parentId ? parseInt(String(parentId), 10) : null,
        annotationData ? String(annotationData) : null,
        frameSnapshot ? String(frameSnapshot) : null,
      ]
    );

    const user = await sqlOne(
      `SELECT id, firstname, lastname, "profilePicture" FROM "User" WHERE id = $1`,
      [req.user.id]
    );

    const enriched = {
      ...comment,
      user: user ? { id: user.id, name: `${user.firstname} ${user.lastname}`, avatar: user.profilePicture } : null,
      replies: [],
    };

    const io = getIO();
    if (io) {
      io.to(ROOMS.order(oid)).emit("video:comment:new", enriched);
    }

    return res.status(201).json(new ApiResponse(201, enriched, "Comment added"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("createVideoComment: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to add comment"));
  }
};

/**
 * Get all timecoded comments for an order's video, threaded.
 */
export const getVideoComments: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { orderId } = req.params as Record<string, string>;
    const oid = parseInt(orderId, 10);
    const videoUrl = (req.query as Record<string, string>).videoUrl;

    await assertOrderParticipant(oid, req.user.id);

    const whereParts = [`vc."orderId" = $1`, `vc."resolvedAt" IS NULL OR vc."resolvedAt" IS NOT NULL`];
    const params: unknown[] = [oid];
    let p = 2;

    if (videoUrl) {
      whereParts.push(`vc."videoUrl" = $${p}`);
      params.push(videoUrl);
      p++;
    }

    const comments = await sql(
      `SELECT vc.*, u.id AS u_id, u.firstname, u.lastname, u."profilePicture"
       FROM "VideoComment" vc
       JOIN "User" u ON u.id = vc."userId"
       WHERE ${whereParts.join(" AND ")}
       ORDER BY vc.timecode ASC, vc."createdAt" ASC`,
      params
    );

    type CommentNode = DbRow & { user: { id: unknown; name: string; avatar: unknown }; replies: CommentNode[] };
    const map = new Map<number, CommentNode>();
    const roots: CommentNode[] = [];

    for (const c of comments) {
      const node: CommentNode = {
        ...c,
        user: { id: c.u_id, name: `${c.firstname} ${c.lastname}`, avatar: c.profilePicture },
        replies: [],
      };
      delete node.u_id;
      delete node.firstname;
      delete node.lastname;
      delete node.profilePicture;
      map.set(Number(c.id), node);
    }

    for (const node of map.values()) {
      if (node.parentId && map.has(Number(node.parentId))) {
        map.get(Number(node.parentId))!.replies.push(node);
      } else {
        roots.push(node);
      }
    }

    return res.status(200).json(new ApiResponse(200, roots, "Comments retrieved"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("getVideoComments: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to get comments"));
  }
};

/**
 * Update a comment (edit content).
 */
export const updateVideoComment: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { commentId } = req.params as Record<string, string>;
    const { content } = req.body as Record<string, unknown>;

    const comment = await sqlOne(
      `SELECT * FROM "VideoComment" WHERE id = $1`, [parseInt(commentId, 10)]
    );
    if (!comment) return next(new ApiError(404, "Comment not found"));
    if (comment.userId !== req.user.id) return next(new ApiError(403, "Cannot edit another user's comment"));

    const updated = await sqlOne(
      `UPDATE "VideoComment" SET content = $2, "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
      [parseInt(commentId, 10), String(content)]
    );
    return res.status(200).json(new ApiResponse(200, updated, "Comment updated"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("updateVideoComment: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to update comment"));
  }
};

/**
 * Delete a comment.
 */
export const deleteVideoComment: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { commentId } = req.params as Record<string, string>;

    const comment = await sqlOne(
      `SELECT * FROM "VideoComment" WHERE id = $1`, [parseInt(commentId, 10)]
    );
    if (!comment) return next(new ApiError(404, "Comment not found"));
    if (comment.userId !== req.user.id && req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Cannot delete another user's comment"));
    }

    await sql(`DELETE FROM "VideoComment" WHERE "parentId" = $1`, [parseInt(commentId, 10)]);
    await sql(`DELETE FROM "VideoComment" WHERE id = $1`, [parseInt(commentId, 10)]);

    return res.status(200).json(new ApiResponse(200, null, "Comment deleted"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("deleteVideoComment: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to delete comment"));
  }
};

/**
 * Resolve a comment (mark feedback as addressed).
 */
export const resolveVideoComment: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) return next(new ApiError(401, "Unauthorized"));
    const { commentId } = req.params as Record<string, string>;

    const comment = await sqlOne(
      `SELECT vc.*, o."client_id" AS "clientId", fp."user_id" AS "freelancerUserId"
       FROM "VideoComment" vc
       JOIN "Order" o ON o.id = vc."orderId"
       JOIN "FreelancerProfile" fp ON fp.id = o."freelancer_id"
       WHERE vc.id = $1`,
      [parseInt(commentId, 10)]
    );
    if (!comment) return next(new ApiError(404, "Comment not found"));
    if (comment.clientId !== req.user.id && comment.freelancerUserId !== req.user.id) {
      return next(new ApiError(403, "Only order participants can resolve comments"));
    }

    const updated = await sqlOne(
      `UPDATE "VideoComment" SET "resolvedAt" = NOW(), "resolvedBy" = $2 WHERE id = $1 RETURNING *`,
      [parseInt(commentId, 10), req.user.id]
    );
    return res.status(200).json(new ApiResponse(200, updated, "Comment resolved"));
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("resolveVideoComment: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to resolve comment"));
  }
};
