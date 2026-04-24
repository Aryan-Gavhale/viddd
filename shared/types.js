/**
 * Shared type definitions for Vidlancing.
 * These serve as documentation and runtime constants.
 * When migrating to TypeScript, convert to .ts with proper interfaces.
 */

export const USER_ROLES = /** @type {const} */ ({
  FREELANCER: "FREELANCER",
  CLIENT: "CLIENT",
  ADMIN: "ADMIN",
});

export const JOB_STATUS = /** @type {const} */ ({
  OPEN: "OPEN",
  ACCEPTED: "ACCEPTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

export const ORDER_STATUS = /** @type {const} */ ({
  PENDING: "PENDING",
  CURRENT: "CURRENT",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
});

export const GIG_STATUS = /** @type {const} */ ({
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  DRAFT: "DRAFT",
  DELETED: "DELETED",
});

export const TRANSACTION_TYPE = /** @type {const} */ ({
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
  PAYOUT: "PAYOUT",
});

export const TRANSACTION_STATUS = /** @type {const} */ ({
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
});

export const APPLICATION_STATUS = /** @type {const} */ ({
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
});

export const DISPUTE_STATUS = /** @type {const} */ ({
  OPEN: "OPEN",
  IN_REVIEW: "IN_REVIEW",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
});

export const AVAILABILITY = /** @type {const} */ ({
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  UNAVAILABLE: "UNAVAILABLE",
});

export const EXPERIENCE_LEVEL = /** @type {const} */ ({
  ENTRY: "ENTRY",
  INTERMEDIATE: "INTERMEDIATE",
  EXPERT: "EXPERT",
});

export const API_ROUTES = {
  USERS: "/api/v1/users",
  JOBS: "/api/v1/jobs",
  GIGS: "/api/v1/gig",
  ORDERS: "/api/v1/orders",
  MESSAGES: "/api/v1/messages",
  REVIEWS: "/api/v1/reviews",
  TRANSACTIONS: "/api/v1/transactions",
  NOTIFICATIONS: "/api/v1/notifications",
  DISPUTES: "/api/v1/disputes",
  SEARCH: "/api/v1/search",
  ADMIN: "/api/v1/admin",
  ANALYTICS: "/api/v1/analytics",
  PROFILE: "/api/v1/profile",
};
