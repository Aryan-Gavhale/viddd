import * as Sentry from "@sentry/node";
import logger from "./logger.js";

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("Sentry DSN not configured — error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    integrations: [
      Sentry.httpIntegration(),
    ],
  });

  logger.info("Sentry initialized for error tracking");
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export { Sentry };
