import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  getMyWorkspaceProjects,
  getWorkspaceSummary,
  markJobMessagesRead,
  updateProjectStatus,
  getOrderWorkspaceSummary,
  markOrderMessagesRead,
  updateOrderWorkspaceStatus,
} from "../Controllers/workspace.controller.js";
import {
  listProjectFiles,
  createProjectFile,
  setFileStatus,
  deleteProjectFile,
  listPinned,
  togglePin,
} from "../Controllers/projectFile.controller.js";
import {
  listComments,
  addComment,
  editComment,
  setResolved,
  deleteComment,
  reviewSummary,
} from "../Controllers/videoReview.controller.js";

const auth = [authenticateToken];

export default async function workspaceRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // ── Job-scoped routes (custom-job side of the workspace) ─────────────────
  // Sidebar list + center summary
  fastify.get("/projects", { preHandler: auth, handler: wrapHandler(getMyWorkspaceProjects) });
  fastify.get("/projects/:jobId", { preHandler: auth, handler: wrapHandler(getWorkspaceSummary) });
  fastify.post("/projects/:jobId/read", { preHandler: auth, handler: wrapHandler(markJobMessagesRead) });
  fastify.post("/projects/:jobId/status", { preHandler: auth, handler: wrapHandler(updateProjectStatus) });

  // Shared file library with approval workflow
  fastify.get("/projects/:jobId/files", { preHandler: auth, handler: wrapHandler(listProjectFiles) });
  fastify.post("/projects/:jobId/files", { preHandler: auth, handler: wrapHandler(createProjectFile) });
  fastify.patch("/projects/:jobId/files/:fileId", { preHandler: auth, handler: wrapHandler(setFileStatus) });
  fastify.delete("/projects/:jobId/files/:fileId", { preHandler: auth, handler: wrapHandler(deleteProjectFile) });

  // Pinned messages (focus area inside chat)
  fastify.get("/projects/:jobId/pinned", { preHandler: auth, handler: wrapHandler(listPinned) });
  fastify.post("/projects/:jobId/pinned", { preHandler: auth, handler: wrapHandler(togglePin) });

  // Video Review — Frame.io-style timecoded comments + drawings (USP)
  const jobReviewBase = "/projects/:jobId/files/:fileId/review";
  fastify.get(`${jobReviewBase}/summary`, { preHandler: auth, handler: wrapHandler(reviewSummary) });
  fastify.get(`${jobReviewBase}/comments`, { preHandler: auth, handler: wrapHandler(listComments) });
  fastify.post(`${jobReviewBase}/comments`, { preHandler: auth, handler: wrapHandler(addComment) });
  fastify.patch(`${jobReviewBase}/comments/:commentId`, {
    preHandler: auth,
    handler: wrapHandler(editComment),
  });
  fastify.post(`${jobReviewBase}/comments/:commentId/resolve`, {
    preHandler: auth,
    handler: wrapHandler(setResolved),
  });
  fastify.delete(`${jobReviewBase}/comments/:commentId`, {
    preHandler: auth,
    handler: wrapHandler(deleteComment),
  });

  // ── Order-scoped routes (gig-order side of the workspace) ────────────────
  // Mirror the job set so the unified WorkspaceShell can switch endpoints
  // based on the selected project's `kind`. The same controllers are reused
  // and pick up `req.params.orderId` automatically.
  fastify.get("/orders/:orderId", { preHandler: auth, handler: wrapHandler(getOrderWorkspaceSummary) });
  fastify.post("/orders/:orderId/read", { preHandler: auth, handler: wrapHandler(markOrderMessagesRead) });
  fastify.post("/orders/:orderId/status", { preHandler: auth, handler: wrapHandler(updateOrderWorkspaceStatus) });

  fastify.get("/orders/:orderId/files", { preHandler: auth, handler: wrapHandler(listProjectFiles) });
  fastify.post("/orders/:orderId/files", { preHandler: auth, handler: wrapHandler(createProjectFile) });
  fastify.patch("/orders/:orderId/files/:fileId", { preHandler: auth, handler: wrapHandler(setFileStatus) });
  fastify.delete("/orders/:orderId/files/:fileId", { preHandler: auth, handler: wrapHandler(deleteProjectFile) });

  fastify.get("/orders/:orderId/pinned", { preHandler: auth, handler: wrapHandler(listPinned) });
  fastify.post("/orders/:orderId/pinned", { preHandler: auth, handler: wrapHandler(togglePin) });

  const orderReviewBase = "/orders/:orderId/files/:fileId/review";
  fastify.get(`${orderReviewBase}/summary`, { preHandler: auth, handler: wrapHandler(reviewSummary) });
  fastify.get(`${orderReviewBase}/comments`, { preHandler: auth, handler: wrapHandler(listComments) });
  fastify.post(`${orderReviewBase}/comments`, { preHandler: auth, handler: wrapHandler(addComment) });
  fastify.patch(`${orderReviewBase}/comments/:commentId`, {
    preHandler: auth,
    handler: wrapHandler(editComment),
  });
  fastify.post(`${orderReviewBase}/comments/:commentId/resolve`, {
    preHandler: auth,
    handler: wrapHandler(setResolved),
  });
  fastify.delete(`${orderReviewBase}/comments/:commentId`, {
    preHandler: auth,
    handler: wrapHandler(deleteComment),
  });
}
