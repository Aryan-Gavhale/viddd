import Fastify, { FastifyRequest, FastifyReply, FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import Redis from "ioredis";
import path from "path";
import { fileURLToPath } from "url";
import winstonLogger from "./Utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp(opts: Record<string, unknown> = {}) {
  // FIX M2: disable Fastify's built-in pino — Winston is the single logging pipeline.
  // Request-level logging is added below as an onResponse hook.
  const app = Fastify({
    logger: false,
    bodyLimit: 1 * 1024 * 1024,
    ...opts,
  });

  app.decorateRequest("user", null);
  app.decorateRequest("fileUrl", null);
  app.decorateRequest("fileUrls", null);
  app.decorateRequest("resource", null);

  // FIX M2: request logging via Winston instead of pino
  app.addHook("onResponse", (request, reply, done) => {
    const ms = reply.elapsedTime?.toFixed(0) ?? "?";
    winstonLogger.info(`${request.method} ${request.url} → ${reply.statusCode} (${ms}ms)`);
    done();
  });

  app.removeContentTypeParser("multipart/form-data");
  app.addContentTypeParser("multipart/form-data", (_request: FastifyRequest, _payload: unknown, done: (err: null, body?: undefined) => void) => {
    done(null);
  });

  // Global error handler — must be registered before routes
  const { ApiError } = await import("./Utils/ApiError.js");
  const multerPkg = await import("multer");
  const { captureException } = await import("./Utils/sentry.js");

  app.setErrorHandler((error: FastifyError & { isJoi?: boolean; details?: Array<{ message: string }>; constraint?: string; errors?: unknown[] }, request: FastifyRequest, reply: FastifyReply) => {
    if (error.isJoi) {
      return reply.code(400).send({
        statusCode: 400,
        message: "Validation error",
        errors: error.details?.map((d) => d.message) || [error.message],
        success: false,
      });
    }

    if (error instanceof ApiError || error.errors) {
      const sc = error.statusCode || 500;
      if (sc >= 500) {
        winstonLogger.error(`${request.method} ${request.url} → ${sc}: ${error.message}`);
        captureException(error, { method: request.method, url: request.url });
      }
      return reply.code(sc).send({
        statusCode: sc,
        message: error.message,
        errors: error.errors || [],
        success: false,
      });
    }

    if (error instanceof multerPkg.default.MulterError) {
      const codeMap: Record<string, number> = { LIMIT_FILE_SIZE: 413, LIMIT_FILE_COUNT: 400, LIMIT_UNEXPECTED_FILE: 400 };
      const status = codeMap[error.code] || 400;
      return reply.code(status).send({
        statusCode: status,
        message: `File upload error: ${error.message}`,
        errors: [{ code: error.code, field: error.field }],
        success: false,
      });
    }

    if (error.statusCode === 429) {
      return reply.code(429).send({ statusCode: 429, message: "Too many requests — please slow down", success: false });
    }

    if (error.code === "23505") {
      return reply.code(409).send({ statusCode: 409, message: "A record with that value already exists", errors: [], success: false });
    }
    if (error.code === "23503") {
      return reply.code(400).send({ statusCode: 400, message: "Referenced record does not exist", success: false });
    }

    captureException(error, { method: request.method, url: request.url, ip: request.ip });
    winstonLogger.error(`Unhandled error on ${request.method} ${request.url}: ${error.message}`);
    const statusCode = error.statusCode || 500;
    return reply.code(statusCode).send({
      statusCode,
      message: process.env.NODE_ENV === "production" ? "Internal Server Error" : error.message || "Internal Server Error",
      errors: [],
      success: false,
    });
  });

  // FIX #20: Enable CSP with sensible defaults
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://*.amazonaws.com"],
        connectSrc: ["'self'", ...(process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) || [])],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  });

  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    // Let TS infer; explicit cb typing can mis-resolve the union (OriginFunction vs AsyncOriginFunction)
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, false);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  });

  // FIX #24: Require dedicated COOKIE_SECRET, never fall back to JWT_SECRET
  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret) {
    throw new Error("COOKIE_SECRET env var is required. Do not reuse JWT_SECRET for cookies.");
  }
  await app.register(cookie, { secret: cookieSecret });

  const rateLimitOpts: Parameters<typeof rateLimit>[0] = {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (request: FastifyRequest) => `ip:${request.ip}`,
  };
  const redisUrl = process.env.REDIS_URL;
  let rateLimitRedis: InstanceType<typeof Redis> | null = null;
  if (redisUrl) {
    try {
      rateLimitRedis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: () => null as unknown as number,
      });
      rateLimitRedis.on("error", () => {});
      await rateLimitRedis.connect();
      (rateLimitOpts as Record<string, unknown>).redis = rateLimitRedis;
    } catch {
      if (rateLimitRedis) { try { rateLimitRedis.disconnect(); } catch {} }
      rateLimitRedis = null;
    }
  }
  (app as unknown as Record<string, unknown>)._rateLimitRedis = rateLimitRedis;
  await app.register(rateLimit, rateLimitOpts);

  await app.register(fastifyStatic, {
    root: path.join(__dirname, "..", "public"),
    prefix: "/",
    decorateReply: false,
  });

  // Health: runs the same internal checks; response body is only status (no component names/details).
  app.get("/health", async (_request, reply) => {
    try {
      const checks: boolean[] = [];
      try {
        const { pool } = await import("./db.js");
        await pool.query("SELECT 1");
        checks.push(true);
      } catch {
        checks.push(false);
      }
      try {
        const { redisClient } = await import("./Config/redis.js");
        if (redisClient?.status === "ready") {
          await redisClient.ping();
          checks.push(true);
        } else {
          checks.push(false);
        }
      } catch {
        checks.push(false);
      }
      try {
        const { emailQueue } = await import("./Queues/index.js");
        await emailQueue.isReady();
        checks.push(true);
      } catch {
        checks.push(false);
      }
      try {
        const { socketIoRedisAdapterOk } = await import("./socket.js");
        checks.push(socketIoRedisAdapterOk);
      } catch {
        checks.push(false);
      }
      const allOk = checks.every(Boolean);
      return reply.code(allOk ? 200 : 503).send({ status: allOk ? "ok" : "degraded" });
    } catch {
      return reply.code(503).send({ status: "error" });
    }
  });

  const { default: userRoutes } = await import("./Routes/user.routes.js");
  const { default: jobRoutes } = await import("./Routes/job.routes.js");
  const { default: profileRoutes } = await import("./Routes/profile.routes.js");
  const { default: gigRoutes } = await import("./Routes/gig.routes.js");
  const { default: orderRoutes } = await import("./Routes/order.routes.js");
  const { default: transactionRoutes } = await import("./Routes/transaction.routes.js");
  const { default: reviewRoutes } = await import("./Routes/review.routes.js");
  const { default: messageRoutes } = await import("./Routes/message.routes.js");
  const { default: notificationRoutes } = await import("./Routes/notification.routes.js");
  const { default: disputeRoutes } = await import("./Routes/dispute.routes.js");
  const { default: searchRoutes } = await import("./Routes/search.routes.js");
  const { default: adminRoutes } = await import("./Routes/admin.routes.js");
  const { default: analyticsRoutes } = await import("./Routes/analytics.routes.js");
  const { default: referralRoutes } = await import("./Routes/referral.routes.js");
  const { default: promotionRoutes } = await import("./Routes/promotion.routes.js");
  const { default: freelancerRoutes } = await import("./Routes/freelancer.routes.js");
  const { default: portfolioRoutes } = await import("./Routes/portfolio.routes.js");
  const { default: contactRoutes } = await import("./Routes/contact.routes.js");
  const { default: timelineRoutes } = await import("./Routes/timeline.routes.js");
  const { default: applicationRoutes } = await import("./Routes/applications.routes.js");
  const { default: filesRoutes } = await import("./Routes/files.routes.js");
  const { default: webhookRoutes } = await import("./Routes/webhook.routes.js");
  const { default: escrowRoutes } = await import("./Routes/escrow.routes.js");
  const { default: milestoneRoutes } = await import("./Routes/milestone.routes.js");
  const { default: briefRoutes } = await import("./Routes/brief.routes.js");
  const { default: renderFarmRoutes } = await import("./Routes/renderFarm.routes.js");
  const { default: skillTestRoutes } = await import("./Routes/skillTest.routes.js");
  const { default: teamProposalRoutes } = await import("./Routes/teamProposal.routes.js");
  const { default: matchingRoutes } = await import("./Routes/matching.routes.js");
  const { default: demoReelRoutes } = await import("./Routes/demoReel.routes.js");
  const { default: templateRoutes } = await import("./Routes/template.routes.js");
  const { default: revisionRoutes } = await import("./Routes/revision.routes.js");
  const { default: communityRoutes } = await import("./Routes/community.routes.js");
  const { default: blogRoutes } = await import("./Routes/blog.routes.js");
  const { default: subCategoryRoutes } = await import("./Routes/subCategory.routes.js");
  const { default: autoBadgeRoutes } = await import("./Routes/autoBadge.routes.js");
  const { default: revenueRoutes } = await import("./Routes/revenue.routes.js");
  const { default: invoiceRoutes } = await import("./Routes/invoice.routes.js");
  const { default: calendarRoutes } = await import("./Routes/calendar.routes.js");
  const { default: contractRoutes } = await import("./Routes/contract.routes.js");
  const { default: fileManagerRoutes } = await import("./Routes/fileManager.routes.js");
  const { default: thumbnailRoutes } = await import("./Routes/thumbnail.routes.js");
  const { default: emailVerificationRoutes } = await import("./Routes/emailVerification.routes.js");
  const { default: workspaceRoutes } = await import("./Routes/workspace.routes.js");

  // ── Auth & Identity ──
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(emailVerificationRoutes, { prefix: "/api/v1/email" });

  // ── Core Resources (RESTful, plural nouns) ──
  await app.register(profileRoutes, { prefix: "/api/v1/profiles" });
  await app.register(freelancerRoutes, { prefix: "/api/v1/freelancers" });
  await app.register(gigRoutes, { prefix: "/api/v1/gigs" });
  await app.register(jobRoutes, { prefix: "/api/v1/jobs" });
  await app.register(workspaceRoutes, { prefix: "/api/v1/workspace" });
  await app.register(applicationRoutes, { prefix: "/api/v1/applications" });
  await app.register(orderRoutes, { prefix: "/api/v1/orders" });
  await app.register(milestoneRoutes, { prefix: "/api/v1/milestones" });
  await app.register(transactionRoutes, { prefix: "/api/v1/transactions" });
  await app.register(escrowRoutes, { prefix: "/api/v1/escrow" });

  // ── Messaging & Notifications ──
  await app.register(messageRoutes, { prefix: "/api/v1/messages" });
  await app.register(notificationRoutes, { prefix: "/api/v1/notifications" });

  // ── Reviews & Disputes ──
  await app.register(reviewRoutes, { prefix: "/api/v1/reviews" });
  await app.register(disputeRoutes, { prefix: "/api/v1/disputes" });

  // ── Portfolio & Media ──
  await app.register(portfolioRoutes, { prefix: "/api/v1/portfolios" });
  await app.register(demoReelRoutes, { prefix: "/api/v1/demo-reels" });
  await app.register(thumbnailRoutes, { prefix: "/api/v1/thumbnails" });
  // Video Review (Frame.io-style) is now scoped under workspace at:
  //   /api/v1/workspace/projects/:jobId/files/:fileId/review/...

  // ── Project Management ──
  await app.register(timelineRoutes, { prefix: "/api/v1/timelines" });
  await app.register(revisionRoutes, { prefix: "/api/v1/revisions" });
  await app.register(fileManagerRoutes, { prefix: "/api/v1/project-files" });
  await app.register(filesRoutes, { prefix: "/api/v1/files" });
  await app.register(briefRoutes, { prefix: "/api/v1/briefs" });

  // ── Collaboration ──
  await app.register(teamProposalRoutes, { prefix: "/api/v1/team-proposals" });
  await app.register(matchingRoutes, { prefix: "/api/v1/matching" });
  await app.register(skillTestRoutes, { prefix: "/api/v1/skill-tests" });
  await app.register(renderFarmRoutes, { prefix: "/api/v1/render-farm" });

  // ── Marketplace ──
  await app.register(templateRoutes, { prefix: "/api/v1/templates" });
  await app.register(searchRoutes, { prefix: "/api/v1/search" });
  await app.register(subCategoryRoutes, { prefix: "/api/v1/sub-categories" });

  // ── Community & Content ──
  await app.register(communityRoutes, { prefix: "/api/v1/community" });
  await app.register(blogRoutes, { prefix: "/api/v1/blog" });

  // ── Billing & Revenue ──
  await app.register(invoiceRoutes, { prefix: "/api/v1/invoices" });
  await app.register(contractRoutes, { prefix: "/api/v1/contracts" });
  await app.register(calendarRoutes, { prefix: "/api/v1/calendar" });
  await app.register(promotionRoutes, { prefix: "/api/v1/promotions" });
  await app.register(referralRoutes, { prefix: "/api/v1/referrals" });
  await app.register(revenueRoutes, { prefix: "/api/v1/revenue" });

  // ── Gamification ──
  await app.register(autoBadgeRoutes, { prefix: "/api/v1/auto-badges" });

  // ── Admin ──
  await app.register(adminRoutes, { prefix: "/api/v1/admin" });
  await app.register(analyticsRoutes, { prefix: "/api/v1/analytics" });

  // ── External ──
  await app.register(contactRoutes, { prefix: "/api/v1/contact" });
  await app.register(webhookRoutes, { prefix: "/api/v1/webhooks" });

  return app;
}
