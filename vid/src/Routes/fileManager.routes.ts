import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { authenticateToken } from "../Middlewares/protect.middleware.js";
import { validateBody, validateQuery } from "../Middlewares/validate.middleware.js";
import { wrapHandler } from "../Utils/wrapHandler.js";
import {
  uploadFile,
  getFiles,
  createFolder,
  deleteFile,
  getFileVersions,
  getDownloadUrl,
  presignUpload,
  listFolderMarkers,
} from "../Controllers/fileManager.controller.js";
import Joi from "joi";

const auth = [authenticateToken];

const presignBody = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  fileName: Joi.string().trim().min(1).max(500).required(),
  mimeType: Joi.string().trim().min(1).max(200).required(),
  fileSize: Joi.number().integer().min(1).optional(),
  folder: Joi.string().max(200).optional(),
});

const uploadRecordBody = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  fileName: Joi.string().trim().min(1).max(500).required(),
  fileKey: Joi.string().trim().min(1).max(500).required(),
  fileSize: Joi.number().integer().min(0).required(),
  mimeType: Joi.string().trim().min(1).max(200).required(),
  folder: Joi.string().max(200).allow("").optional(),
  tags: Joi.array().items(Joi.alternatives(Joi.string(), Joi.number())).optional(),
});

const createFolderBody = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  name: Joi.string().trim().min(1).max(200).required(),
  parentFolder: Joi.string().max(200).optional(),
});

const listQuery = Joi.object({
  folder: Joi.string().max(200).allow("").optional(),
  q: Joi.string().max(200).allow("").optional(),
});

const versionsQuery = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  fileName: Joi.string().trim().min(1).max(500).required(),
  folder: Joi.string().max(200).allow("").optional(),
});

export default async function fileManagerRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  fastify.post("/presign", {
    preHandler: [...auth, validateBody(presignBody)],
    handler: wrapHandler(presignUpload),
  });

  fastify.post("/upload", {
    preHandler: [...auth, validateBody(uploadRecordBody)],
    handler: wrapHandler(uploadFile),
  });

  fastify.post("/folder", {
    preHandler: [...auth, validateBody(createFolderBody)],
    handler: wrapHandler(createFolder),
  });

  fastify.get("/:orderId/folders", {
    preHandler: auth,
    handler: wrapHandler(listFolderMarkers),
  });

  fastify.get("/:orderId/list", {
    preHandler: [...auth, validateQuery(listQuery)],
    handler: wrapHandler(getFiles),
  });

  fastify.delete("/:orderId/file/:fileId", {
    preHandler: auth,
    handler: wrapHandler(deleteFile),
  });

  fastify.get("/versions", {
    preHandler: [...auth, validateQuery(versionsQuery)],
    handler: wrapHandler(getFileVersions),
  });

  fastify.get("/file/:fileId/download", {
    preHandler: auth,
    handler: wrapHandler(getDownloadUrl),
  });
}
