import { S3Client } from "@aws-sdk/client-s3";
import type { Request, Response } from "express";
import type { FastifyReply, FastifyRequest } from "fastify";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import type { Readable } from "stream";
import { ApiError } from "../Utils/ApiError.js";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const s3Storage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_S3_BUCKET!,
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const r = req as { user?: { id?: number } };
    const userId = r.user?.id ?? "anonymous";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileExtension = path.extname(file.originalname);
    cb(null, `${userId}/${file.fieldname}-${uniqueSuffix}${fileExtension}`);
  },
});

const needBytes = 12;

/**
 * Check leading bytes (and ftyp for MP4 at offset 4) against the declared MIME type.
 */
export function validateMagicBytes(buf: Buffer, mimetype: string): boolean {
  if (buf.length < 4) return false;
  if (mimetype === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimetype === "image/png") {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mimetype === "application/pdf") {
    return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
  }
  if (mimetype === "video/mp4") {
    if (buf.length < 8) return false;
    return buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70; // ftyp
  }
  if (mimetype === "video/mpeg") {
    if (buf.length >= 8) {
      if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return true;
    }
    return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01;
  }
  return false;
}

function readStartBytes(
  stream: Readable,
  need: number,
  cb: (err: Error | null, head?: Buffer) => void
): void {
  const chunks: Buffer[] = [];
  let got = 0;
  let finished = false;

  const cleanup = () => {
    stream.removeListener("data", onData);
    stream.removeListener("end", onEnd);
    stream.removeListener("error", onError);
  };

  const doneOnce = (err: Error | null, head?: Buffer) => {
    if (finished) return;
    finished = true;
    cleanup();
    cb(err, head);
  };

  const onData = (chunk: Buffer) => {
    if (finished) return;
    got += chunk.length;
    chunks.push(chunk);
    if (got >= need) {
      const buf = Buffer.concat(chunks);
      const head = buf.subarray(0, need);
      const rest = buf.subarray(need);
      if (rest.length) stream.unshift(rest);
      doneOnce(null, head);
    }
  };

  const onEnd = () => {
    if (finished) return;
    const buf = Buffer.concat(chunks);
    doneOnce(null, buf);
  };

  const onError = (err: Error) => {
    doneOnce(err);
  };

  stream.on("data", onData);
  stream.on("end", onEnd);
  stream.on("error", onError);
}

type FileFilterNext = { (e: Error): void; (e: null, acceptFile: boolean): void };

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterNext): void => {
  const allowedTypes = ["video/mp4", "video/mpeg", "image/jpeg", "image/png", "application/pdf"];
  if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
    return cb(
      new ApiError(400, `Invalid file type. Allowed: ${allowedTypes.join(", ")}`) as Error
    );
  }

  const maybeWithBuffer = file as Express.Multer.File & { buffer?: Buffer };
  if (maybeWithBuffer.buffer && Buffer.isBuffer(maybeWithBuffer.buffer) && maybeWithBuffer.buffer.length >= 4) {
    if (!validateMagicBytes(maybeWithBuffer.buffer, file.mimetype)) {
      return cb(new ApiError(400, "File content does not match declared type") as Error);
    }
    return cb(null, true);
  }

  const stream = (file as { stream?: Readable }).stream;
  if (stream && typeof stream.readable === "boolean") {
    readStartBytes(stream, needBytes, (err, head) => {
      if (err) return cb(err);
      if (!head || !validateMagicBytes(head, file.mimetype)) {
        return cb(new ApiError(400, "File content does not match declared type") as Error);
      }
      cb(null, true);
    });
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage: s3Storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

type MulterFile = Express.Multer.File & { location?: string };

type MulterWithBody = Request & {
  file?: MulterFile;
  files?: MulterFile[] | Record<string, MulterFile[]>;
  body: Record<string, unknown>;
  user?: unknown;
};

/**
 * Wraps multer middleware to work as a Fastify preHandler.
 * Passes the raw Node request to multer, then copies results
 * back to the Fastify request object.
 */
function wrapMulter(
  multerFn: (req: Request, res: Response, next: (err?: unknown) => void) => void
) {
  return function multerPreHandler(request: FastifyRequest, _reply: FastifyReply, done: (err?: Error) => void) {
    const raw = request.raw as unknown as MulterWithBody;
    const user = request.user;
    raw.user = user;
    raw.body = (request.body as Record<string, unknown> | undefined) || {};

    const fakeRes = {
      setHeader() {},
      end() {},
      statusCode: 200,
    } as unknown as Response;

    multerFn(raw, fakeRes, (err) => {
      if (err) return done(err instanceof Error ? err : new Error(String(err)));
      if (raw.file) {
        request.file = raw.file;
        request.fileUrl = raw.file.location;
      }
      if (raw.files) {
        if (Array.isArray(raw.files)) {
          if (raw.files.length > 0) {
            request.files = raw.files;
            request.fileUrls = raw.files
              .map((f) => f.location)
              .filter((u): u is string => u != null && u !== "");
          }
        } else {
          // upload.fields(...) gives an object keyed by field name
          request.files = raw.files;
          const all = Object.values(raw.files).flat();
          request.fileUrls = all
            .map((f) => f.location)
            .filter((u): u is string => u != null && u !== "");
        }
      }
      if (raw.body && typeof raw.body === "object") {
        request.body = { ...(request.body as Record<string, unknown> | undefined), ...raw.body };
      }
      done();
    });
  };
}

const uploadSingle = (fieldName: string) =>
  wrapMulter(upload.single(fieldName) as (req: Request, res: Response, next: (err?: unknown) => void) => void);
const uploadMultiple = (fieldName: string, maxCount: number) =>
  wrapMulter(upload.array(fieldName, maxCount) as (req: Request, res: Response, next: (err?: unknown) => void) => void);

/**
 * FIX M10: Bring gig uploads onto S3 (was multer.diskStorage).
 * Lets a route accept several named fields in one multipart request.
 */
const uploadFields = (fields: { name: string; maxCount: number }[]) =>
  wrapMulter(
    upload.fields(fields) as (req: Request, res: Response, next: (err?: unknown) => void) => void
  );

export { uploadSingle, uploadMultiple, uploadFields };
