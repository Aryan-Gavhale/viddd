import { emailQueue, notificationQueue, paymentQueue, fileCleanupQueue } from "./index.js";
import nodemailer from "nodemailer";
import { sql, sqlOne, withTransaction } from "../db.js";
import { deleteFileFromS3 } from "../Utils/s3.js";
import logger from "../Utils/logger.js";
import type { PoolClient } from "pg";

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface DirectNotificationJobData {
  userId: number;
  type?: string;
  content: string;
  entityType?: string | null;
  entityId?: number | null;
  priority?: string;
  metadata?: Record<string, unknown> | null;
}

interface OrderNotificationJobData {
  orderId: number;
  clientId: number;
  freelancerId: number;
  orderNumber: string;
  status: string;
  type: string;
}

type NotificationJobData = DirectNotificationJobData | OrderNotificationJobData;

interface PaymentJobData {
  action: string;
  transactionId?: number;
  orderId?: number;
}

interface FileCleanupJobData {
  fileUrls: string[];
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function queueEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  await emailQueue.add({ to, subject, html, text });
}

export async function queueNotification(data: DirectNotificationJobData): Promise<void> {
  await notificationQueue.add(data);
}

/**
 * FIX M11: a single shared Bull queue replaces the legacy
 * `Utils/notificationService.ts` queue (which spun up its own Redis client).
 */
export async function queueOrderNotification(data: Omit<OrderNotificationJobData, "type">): Promise<void> {
  await notificationQueue.add({
    ...data,
    type: data.status ? "ORDER_STATUS_UPDATE" : "ORDER_CREATED",
  });
}

export async function queuePayment(action: string, data: Omit<PaymentJobData, "action">): Promise<void> {
  await paymentQueue.add({ action, ...data });
}

export async function queueFileCleanup(fileUrls: string[] | undefined): Promise<void> {
  if (fileUrls?.length) await fileCleanupQueue.add({ fileUrls });
}

export function startProcessors(): void {
  if (process.env.DISABLE_WORKERS === "true") {
    logger.info("Bull workers disabled (DISABLE_WORKERS=true). Run a dedicated worker process.");
    return;
  }

  emailQueue.process(5, async (job) => {
    const { to, subject, html, text } = job.data as EmailJobData;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to,
      subject,
      html,
      text,
    });
    logger.info("Email sent to %s: %s", to, subject);
  });

  notificationQueue.process(10, async (job) => {
    const data = job.data as NotificationJobData;

    if ("orderId" in data && "orderNumber" in data) {
      const { orderId, clientId, freelancerId, orderNumber, status } = data as OrderNotificationJobData;
      const statusLabel = status === "CANCELLED" ? "cancelled" : status === "COMPLETED" ? "completed" : `updated to ${status}`;

      await sql(
        `INSERT INTO "Notification" ("user_id", "type", "content", "entityType", "entityId", "priority", "createdAt")
         VALUES ($1, 'ORDER_UPDATE'::"NotificationType", $2, 'ORDER', $3, 'HIGH'::"Priority", NOW()),
                ($4, 'ORDER_UPDATE'::"NotificationType", $5, 'ORDER', $6, 'HIGH'::"Priority", NOW())`,
        [
          clientId, `Order #${orderNumber} has been ${statusLabel}.`, orderId,
          freelancerId, `Order #${orderNumber} has been ${statusLabel}.`, orderId,
        ]
      );
      logger.debug("Order notification created for client %d and freelancer %d: order %s", clientId, freelancerId, orderNumber);
      return;
    }

    const { userId, type, content, entityType, entityId, priority, metadata } = data as DirectNotificationJobData;
    await sql(
      `INSERT INTO "Notification" ("user_id", "type", "content", "entityType", "entityId", "priority", "metadata", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())`,
      [userId, type || "SYSTEM", content, entityType || null, entityId || null, priority || "NORMAL", metadata ? JSON.stringify(metadata) : null]
    );
    logger.debug("Notification created for user %d: %s", userId, type);
  });

  paymentQueue.process(3, async (job) => {
    const { action, transactionId, orderId } = job.data as PaymentJobData;

    if (action === "capture" && transactionId) {
      await sql(
        `UPDATE "Transaction" SET "status" = 'COMPLETED' WHERE "id" = $1`,
        [transactionId]
      );
      logger.info("Payment captured for transaction %d", transactionId);
    }

    if (action === "release_escrow" && orderId) {
      const order = await sqlOne(
        `SELECT * FROM "Order" WHERE "id" = $1 AND "deletedAt" IS NULL`,
        [orderId]
      );
      if (order && order.escrowStatus === "HELD") {
        await withTransaction(async (client: PoolClient) => {
          await client.query(
            `UPDATE "Order" SET "escrowStatus" = 'RELEASED' WHERE "id" = $1`,
            [orderId]
          );
          await client.query(
            `UPDATE "Transaction" SET "status" = 'COMPLETED' WHERE order_id = $1 AND "status" = 'PENDING'`,
            [orderId]
          );
        });
        logger.info("Escrow released for order %d", orderId);
      }
    }
  });

  fileCleanupQueue.process(3, async (job) => {
    const { fileUrls } = job.data as FileCleanupJobData;
    for (const url of fileUrls) {
      try {
        await deleteFileFromS3(url);
        logger.debug("Cleaned up S3 file: %s", url);
      } catch (err) {
        logger.error("Failed to clean up file %s: %s", url, (err as Error).message);
      }
    }
  });

  logger.info("Bull queue processors started: emails, notifications, payments, file-cleanup");
}
