import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  getMyWorkspaceProjects,
  getWorkspaceSummary,
  markJobMessagesRead,
  updateProjectStatus,
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
  const reviewBase = "/projects/:jobId/files/:fileId/review";
  fastify.get(`${reviewBase}/summary`, { preHandler: auth, handler: wrapHandler(reviewSummary) });
  fastify.get(`${reviewBase}/comments`, { preHandler: auth, handler: wrapHandler(listComments) });
  fastify.post(`${reviewBase}/comments`, { preHandler: auth, handler: wrapHandler(addComment) });
  fastify.patch(`${reviewBase}/comments/:commentId`, {
    preHandler: auth,
    handler: wrapHandler(editComment),
  });
  fastify.post(`${reviewBase}/comments/:commentId/resolve`, {
    preHandler: auth,
    handler: wrapHandler(setResolved),
  });
  fastify.delete(`${reviewBase}/comments/:commentId`, {
    preHandler: auth,
    handler: wrapHandler(deleteComment),
  });
}
