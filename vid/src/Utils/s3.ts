import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError } from "./ApiError.js";
import type { CompletedPart } from "@aws-sdk/client-s3";
import logger from "./logger.js";

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
if (!accessKeyId || !secretAccessKey) {
  logger.warn("AWS credentials not configured. S3 operations will fail.");
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials:
    accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
        }
      : undefined,
});

const getBucket = (): string | undefined => process.env.AWS_S3_BUCKET;

/**
 * Extract the S3 key from a full S3 URL or return it unchanged if already a key.
 */
export function extractS3Key(urlOrKey: string | null | undefined): string | null {
  if (!urlOrKey) return null;
  try {
    const url = new URL(urlOrKey);
    return url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  } catch {
    return urlOrKey;
  }
}

/**
 * Generate a presigned GET URL for an S3 object.
 * @param keyOrUrl - S3 key or full URL
 * @param expiresIn - Expiry in seconds (default 1 hour)
 */
export async function getPresignedUrl(keyOrUrl: string, expiresIn: number = 3600): Promise<string> {
  const key = extractS3Key(keyOrUrl);
  if (!key) throw new ApiError(400, "Invalid file reference");

  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Presigned PUT for direct browser uploads (e.g. project files).
 */
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const bucket = getBucket();
  if (!bucket) throw new ApiError(500, "S3 bucket is not configured");

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

type S3FileLike = { buffer: Buffer; mimetype: string };

export async function uploadFileToS3(file: S3FileLike, key: string): Promise<string> {
  if (file.buffer && file.buffer.length > 25 * 1024 * 1024) {
    throw new Error("File too large for direct upload. Use multipart upload instead.");
  }
  const bucket = getBucket();
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );
  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function deleteFileFromS3(fileUrl: string): Promise<void> {
  const key = extractS3Key(fileUrl);
  if (!key) return;
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
}

// ─── Multipart uploads (5–50GB video files) ───

const MULTIPART_PRESIGN_EXPIRES = 3600;

/**
 * @returns S3 response upload id and the object key
 */
export async function initiateMultipartUpload(
  key: string,
  contentType: string
): Promise<{ uploadId: string; key: string }> {
  const bucket = getBucket();
  if (!bucket) throw new ApiError(500, "S3 bucket is not configured");

  const res = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })
  );
  if (!res.UploadId) throw new ApiError(500, "S3 did not return an upload id");
  return { uploadId: res.UploadId, key };
}

export async function getUploadPartPresignedUrl(key: string, uploadId: string, partNumber: number): Promise<string> {
  const bucket = getBucket();
  if (!bucket) throw new ApiError(500, "S3 bucket is not configured");
  if (partNumber < 1 || partNumber > 10_000) {
    throw new ApiError(400, "Part number must be between 1 and 10000");
  }

  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return getSignedUrl(s3Client, command, { expiresIn: MULTIPART_PRESIGN_EXPIRES });
}

export type MultipartPartTag = { PartNumber: number; ETag: string };

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: MultipartPartTag[]
): Promise<string> {
  const bucket = getBucket();
  if (!bucket) throw new ApiError(500, "S3 bucket is not configured");
  if (!parts.length) throw new ApiError(400, "At least one part is required to complete a multipart upload");

  const completed: CompletedPart[] = [...parts]
    .sort((a, b) => a.PartNumber - b.PartNumber)
    .map((p) => ({
      PartNumber: p.PartNumber,
      ETag: p.ETag,
    }));

  const res = await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: completed },
    })
  );

  if (res.Location) return res.Location;
  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const bucket = getBucket();
  if (!bucket) throw new ApiError(500, "S3 bucket is not configured");
  await s3Client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    })
  );
}

export type ListedUploadPart = { PartNumber: number; ETag: string; Size?: number };

/**
 * All uploaded parts in this multipart session (for resume / progress)
 */
export async function listUploadParts(key: string, uploadId: string): Promise<ListedUploadPart[]> {
  const bucket = getBucket();
  if (!bucket) throw new ApiError(500, "S3 bucket is not configured");

  const out: ListedUploadPart[] = [];
  let partNumberMarker: string | undefined;

  for (;;) {
    const res = await s3Client.send(
      new ListPartsCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumberMarker: partNumberMarker,
        MaxParts: 1000,
      })
    );
    for (const p of res.Parts || []) {
      if (p.PartNumber != null && p.ETag) {
        out.push({ PartNumber: p.PartNumber, ETag: p.ETag, Size: p.Size });
      }
    }
    if (res.IsTruncated && res.NextPartNumberMarker) {
      partNumberMarker = res.NextPartNumberMarker;
    } else {
      break;
    }
  }
  return out.sort((a, b) => a.PartNumber - b.PartNumber);
}
