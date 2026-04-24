import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { ApiError } from "./ApiError.js";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const getBucket = (): string | undefined => process.env.AWS_S3_BUCKET;

/** Multer (memory) file shape for S3 upload */
export type UploadFileInput = { buffer: Buffer; mimetype: string };

export const uploadFileToS3 = async (file: UploadFileInput, key: string): Promise<string> => {
  try {
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
  } catch (error) {
    throw new ApiError(500, "Failed to upload file to S3", [(error as Error).message]);
  }
};

export const deleteFileFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    const url = new URL(fileUrl);
    const s3Key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: s3Key,
      })
    );
  } catch (error) {
    throw new ApiError(500, "Failed to delete file from S3", [(error as Error).message]);
  }
};
