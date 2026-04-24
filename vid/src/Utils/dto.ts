/**
 * Request/Response DTOs - Standardized API response shapes
 * and model select objects to prevent internal field leakage.
 */
import type { DbRow } from "../types/index.js";

// ──────────────── Response Helpers ────────────────

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
} {
  const totalPages = Math.ceil(total / limit);
  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function cursorPaginatedResponse<T extends DbRow>(
  items: T[],
  limit: number,
  // Must be a UNIQUE column (e.g. primary key) for stable cursor ordering — see pagination.ts
  cursorField: string = "id"
): {
  items: T[];
  pagination: { hasMore: boolean; nextCursor: unknown; count: number };
} {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1]?.[cursorField] : null;
  return {
    items: data,
    pagination: {
      hasMore,
      nextCursor,
      count: data.length,
    },
  };
}

// ──────────────── Model Select Objects ────────────────

export const USER_PUBLIC_SELECT: Record<string, true> = {
  id: true,
  firstname: true,
  lastname: true,
  email: true,
  country: true,
  username: true,
  role: true,
  profilePicture: true,
  bio: true,
  isActive: true,
  isProfileComplete: true,
  createdAt: true,
  company: true,
  companyEmail: true,
  isVerified: true,
  totalJobs: true,
  totalHours: true,
  successRate: true,
  rating: true,
};

export const USER_MINIMAL_SELECT: Record<string, true> = {
  id: true,
  firstname: true,
  lastname: true,
  profilePicture: true,
  role: true,
};

export const FREELANCER_PROFILE_SELECT: Record<string, true> = {
  id: true,
  city: true,
  state: true,
  pinCode: true,
  jobTitle: true,
  overview: true,
  skills: true,
  languages: true,
  socialLinks: true,
  tools: true,
  equipmentCameras: true,
  equipmentLenses: true,
  equipmentLighting: true,
  equipmentOther: true,
  certifications: true,
  minimumRate: true,
  maximumRate: true,
  hourlyRate: true,
  weeklyHours: true,
  availabilityStatus: true,
  experienceLevel: true,
  totalEarnings: true,
  rating: true,
  totalJobs: true,
  totalHours: true,
  successRate: true,
};

export const GIG_PUBLIC_SELECT: Record<string, true> = {
  id: true,
  title: true,
  description: true,
  category: true,
  pricing: true,
  deliveryTime: true,
  revisionCount: true,
  status: true,
  tags: true,
  requirements: true,
  thumbnailUrl: true,
  faqs: true,
  packageDetails: true,
  views: true,
  orderCount: true,
  createdAt: true,
  updatedAt: true,
};

export const JOB_PUBLIC_SELECT: Record<string, true> = {
  id: true,
  title: true,
  description: true,
  category: true,
  budgetMin: true,
  budgetMax: true,
  deadline: true,
  jobDifficulty: true,
  projectLength: true,
  keyResponsibilities: true,
  requiredSkills: true,
  tools: true,
  scope: true,
  status: true,
  progress: true,
  name: true,
  company: true,
  videoFileUrl: true,
  location: true,
  proposals: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
};

export const ORDER_SELECT: Record<string, true> = {
  id: true,
  title: true,
  description: true,
  package: true,
  totalPrice: true,
  status: true,
  requirements: true,
  deliveryDeadline: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  orderNumber: true,
  revisionsRequested: true,
  revisionsCompleted: true,
  progress: true,
  daysLeft: true,
  currency: true,
};

export const NOTIFICATION_SELECT: Record<string, true> = {
  id: true,
  type: true,
  content: true,
  entityType: true,
  entityId: true,
  priority: true,
  isRead: true,
  readAt: true,
  metadata: true,
  createdAt: true,
};

export const REVIEW_SELECT: Record<string, true> = {
  id: true,
  rating: true,
  comment: true,
  title: true,
  isAnonymous: true,
  response: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
};

export const TRANSACTION_SELECT: Record<string, true> = {
  id: true,
  amount: true,
  type: true,
  paymentMethod: true,
  status: true,
  createdAt: true,
  currency: true,
};
