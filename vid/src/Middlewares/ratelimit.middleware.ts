// Rate limiting is now handled by @fastify/rate-limit in app.js.
// This file is kept for backward compatibility if any code imports it.
export const rateLimiter = (): void => {};
export const rateLimiterByUser = (): void => {};
export const dashboardRateLimiter = (): void => {};
