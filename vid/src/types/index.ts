import type { FastifyRequest, FastifyReply } from "fastify";
import type { PoolClient, QueryResult } from "pg";

// ─── Auth / User ───

export interface JwtPayload {
  id: number;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export type Role = "FREELANCER" | "CLIENT" | "ADMIN" | "SUPERADMIN";

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  isActive?: boolean;
}

// ─── Database Row Types ───

export interface UserRow {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  country: string;
  role: Role;
  username?: string | null;
  bio?: string | null;
  profilePicture?: string | null;
  isActive: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  isProfileComplete: boolean;
  company?: string | null;
  companyEmail?: string | null;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  pendingVerification?: boolean;
  totalJobs: number;
  totalHours: number;
  successRate: number;
  rating: number;
  lastNameChange?: Date | null;
  appliedJobsId: number[];
  failedLoginAttempts: number;
  lockUntil?: Date | null;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FreelancerProfileRow {
  id: number;
  user_id: number;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  jobTitle?: string | null;
  overview?: string | null;
  skills: string[];
  languages: string[];
  socialLinks?: Record<string, string> | null;
  tools: string[];
  equipmentCameras?: string | null;
  equipmentLenses?: string | null;
  equipmentLighting?: string | null;
  equipmentOther?: string | null;
  certifications: string[];
  minimumRate?: number | null;
  maximumRate?: number | null;
  hourlyRate?: number | null;
  weeklyHours?: number | null;
  availabilityStatus: string;
  experienceLevel: string;
  totalEarnings: number;
  rating: number;
  totalJobs: number;
  totalHours: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GigRow {
  id: number;
  title: string;
  description?: string | null;
  category: string[];
  pricing: unknown;
  deliveryTime?: number | null;
  revisionCount?: number | null;
  status: string;
  tags: string[];
  requirements?: string | null;
  thumbnailUrl?: string | null;
  faqs?: unknown;
  packageDetails?: unknown;
  views: number;
  orderCount: number;
  isVerified: boolean;
  freelancer_id: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobRow {
  id: number;
  title: string;
  description?: string | null;
  category: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  deadline?: Date | null;
  jobDifficulty?: string | null;
  projectLength?: string | null;
  keyResponsibilities: string[];
  requiredSkills: string[];
  tools: string[];
  scope?: string | null;
  status: string;
  progress: number;
  name?: string | null;
  company?: string | null;
  videoFileUrl?: string | null;
  location?: string | null;
  proposals: number;
  isVerified: boolean;
  posted_by_id: number;
  freelancer_id?: number | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRow {
  id: number;
  title?: string | null;
  description?: string | null;
  package?: string | null;
  totalPrice: number;
  status: string;
  escrowStatus: string;
  requirements?: string | null;
  deliveryDeadline?: Date | null;
  completedAt?: Date | null;
  orderNumber: string;
  revisionsRequested: number;
  revisionsCompleted: number;
  progress: number;
  daysLeft?: number | null;
  currency: string;
  client_id: number;
  freelancer_id: number;
  gig_id: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionRow {
  id: number;
  amount: number;
  type: string;
  paymentMethod?: string | null;
  status: string;
  currency: string;
  stripePaymentId?: string | null;
  user_id: number;
  order_id?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  type: string;
  content: string;
  entityType?: string | null;
  entityId?: number | null;
  priority: string;
  isRead: boolean;
  readAt?: Date | null;
  metadata?: unknown;
  expiresAt?: Date | null;
  createdAt: Date;
}

export interface MessageRow {
  id: string;
  content: string;
  sender_id: number;
  recipient_id?: number | null;
  job_id?: number | null;
  attachments?: unknown;
  reactions?: unknown;
  isRead: boolean;
  isDeleted: boolean;
  isFlagged: boolean;
  flaggedReason?: string | null;
  replyTo_id?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewRow {
  id: number;
  rating: number;
  comment?: string | null;
  title?: string | null;
  isAnonymous: boolean;
  response?: string | null;
  respondedAt?: Date | null;
  moderationStatus: string;
  moderatedAt?: Date | null;
  moderated_by?: number | null;
  clientId: number;
  freelancerId: number;
  orderId: number;
  gigId?: number | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisputeRow {
  id: number;
  reason: string;
  description?: string | null;
  status: string;
  resolution?: string | null;
  resolvedAt?: Date | null;
  resolved_by?: number | null;
  raised_by_id: number;
  order_id: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionRow {
  id: number;
  type: string;
  code?: string | null;
  discountAmount?: number | null;
  discountType?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  user_id: number;
  maxUses?: number | null;
  uses: number;
  status: string;
  expiresAt?: Date | null;
  createdAt: Date;
}

export interface ReferralRow {
  id: number;
  referrer_id: number;
  referee_id?: number | null;
  referralCode: string;
  rewardAmount: number;
  status: string;
  redeemedAt?: Date | null;
  createdAt: Date;
}

// ─── Express-like handler types (for wrapHandler compatibility) ───

export interface ExpressRequest
  extends Omit<FastifyRequest, "query" | "params" | "body"> {
  user?: AuthUser;
  file?: Express.Multer.File & { location?: string };
  files?:
    | (Express.Multer.File & { location?: string })[]
    | Record<string, (Express.Multer.File & { location?: string })[]>;
  fileUrl?: string | null;
  fileUrls?: string[] | null;
  resource?: unknown;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
  body: Record<string, unknown>;
  io?: {
    to: (room: string) => { emit: (event: string, payload: unknown) => void };
  };
}

export interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(data: unknown): void;
  send(data?: unknown): void;
  sendStatus(code: number): void;
  setHeader(name: string, value: string): ExpressResponse;
  header(name: string, value: string): ExpressResponse;
  end(data?: unknown): void;
  redirect(url: string): void;
  statusCode: number;
}

export type NextFunction = (err?: Error | unknown) => void;

export type ExpressHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => void | Promise<void>;

// ─── Transaction helpers ───

export type TxQueryFn = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
export type TxOneFn = (text: string, params?: unknown[]) => Promise<Record<string, unknown> | null>;

// ─── Pagination ───

export interface CursorPaginationOpts {
  defaultLimit?: number;
  maxLimit?: number;
  cursorField?: string;
}

export interface CursorPaginationResult {
  limit: number;
  cursor: number | null;
  direction: "next" | "prev";
  cursorField: string;
}

export interface OffsetPaginationResult {
  page: number;
  limit: number;
  skip: number;
}

// ─── Generic DB record ───
export type DbRow = Record<string, unknown>;
