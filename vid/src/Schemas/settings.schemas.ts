/**
 * Joi schemas for the Settings backend.
 *
 * Centralised so the same shapes can be reused from controllers, smoke tests
 * and integration suites without duplicating validation rules. All schemas
 * accept partial updates where appropriate (PATCH) and strict bodies where
 * the operation has a single shape (POST).
 */
import Joi from "joi";

export const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, "uppercase letter")
  .pattern(/[a-z]/, "lowercase letter")
  .pattern(/[0-9]/, "number")
  .pattern(/[!@#$%^&*(),.?":{}|<>]/, "special character")
  .messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must not exceed 128 characters",
    "string.pattern.name": "Password must contain at least one {#name}",
  });

// ── Profile + account ────────────────────────────────────────────────────
export const updateProfileSchema = Joi.object({
  firstname: Joi.string().trim().min(1).max(50).optional(),
  lastname: Joi.string().trim().min(1).max(50).optional(),
  username: Joi.string().trim().min(2).max(40).optional(),
  bio: Joi.string().allow("").max(2000).optional(),
  country: Joi.string().trim().max(100).optional(),
  company: Joi.string().allow("").max(200).optional(),
  companyEmail: Joi.string().email().allow("").optional(),
  profilePicture: Joi.string().uri().allow("").optional(),
  jobTitle: Joi.string().allow("").max(120).optional(),
  city: Joi.string().allow("").max(120).optional(),
  state: Joi.string().allow("").max(120).optional(),
  pinCode: Joi.alternatives().try(Joi.number(), Joi.string().allow("")).optional(),
  socialLinks: Joi.object().optional(),
  responseTimeHours: Joi.number().integer().min(0).max(720).optional(),
  availabilityStatus: Joi.string().valid("FULL_TIME", "PART_TIME", "UNAVAILABLE").optional(),
}).min(1);

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema.required(),
});

export const requestEmailChangeSchema = Joi.object({
  newEmail: Joi.string().email().required(),
  currentPassword: Joi.string().required(),
});

// ── Notification preferences ─────────────────────────────────────────────
export const notificationPreferencesSchema = Joi.object({
  notifyJobInvitations: Joi.boolean().optional(),
  notifyMessages: Joi.boolean().optional(),
  notifyPaymentUpdates: Joi.boolean().optional(),
  notifyPlatformNews: Joi.boolean().optional(),
  notifyMarketing: Joi.boolean().optional(),
  emailFrequency: Joi.string().valid("instant", "daily", "weekly").optional(),
  pushEnabled: Joi.boolean().optional(),
  inAppEnabled: Joi.boolean().optional(),
}).min(1);

// ── Appearance / Video / Privacy combined ────────────────────────────────
export const appearancePreferencesSchema = Joi.object({
  theme: Joi.string().valid("light", "dark", "system").optional(),
  accentColor: Joi.string().max(40).optional(),
  language: Joi.string().max(10).optional(),
  fontSize: Joi.string().valid("small", "medium", "large").optional(),
});

export const videoPreferencesSchema = Joi.object({
  defaultVideoFormat: Joi.string().valid("mp4", "mov", "webm", "mkv").optional(),
  defaultResolution: Joi.string().valid("480p", "720p", "1080p", "1440p", "4k").optional(),
  watermarkEnabled: Joi.boolean().optional(),
  watermarkImageUrl: Joi.string().uri().allow("", null).optional(),
  watermarkPosition: Joi.string().valid("top-left", "top-right", "bottom-left", "bottom-right", "center").optional(),
  watermarkOpacity: Joi.number().integer().min(0).max(100).optional(),
  publicVideosScope: Joi.string().valid("public", "unlisted", "private").optional(),
  privateVideoPassword: Joi.string().allow("", null).max(80).optional(),
  autoplayPortfolioVideos: Joi.boolean().optional(),
  loopVideos: Joi.boolean().optional(),
  showVideoControls: Joi.boolean().optional(),
});

export const privacyPreferencesSchema = Joi.object({
  profileVisibleInSearch: Joi.boolean().optional(),
  showEarningsOnProfile: Joi.boolean().optional(),
  allowDataSharing: Joi.boolean().optional(),
});

export const allPreferencesPatchSchema = Joi.object({
  appearance: appearancePreferencesSchema.optional(),
  video: videoPreferencesSchema.optional(),
  privacy: privacyPreferencesSchema.optional(),
}).min(1);

// ── Billing profile (tax) ────────────────────────────────────────────────
export const billingProfileSchema = Joi.object({
  taxId: Joi.string().allow("", null).max(80).optional(),
  gstNumber: Joi.string().allow("", null).max(80).optional(),
  companyPan: Joi.string().allow("", null).max(40).optional(),
  billingName: Joi.string().allow("", null).max(200).optional(),
  billingAddress: Joi.object({
    line1: Joi.string().allow("").max(200).optional(),
    line2: Joi.string().allow("").max(200).optional(),
    city: Joi.string().allow("").max(120).optional(),
    state: Joi.string().allow("").max(120).optional(),
    postalCode: Joi.string().allow("").max(40).optional(),
    country: Joi.string().allow("").max(80).optional(),
  }).allow(null).optional(),
}).min(1);

// ── Payment methods ──────────────────────────────────────────────────────
export const savePaymentMethodSchema = Joi.object({
  paymentMethodId: Joi.string().required(),
  setAsDefault: Joi.boolean().default(false),
});

// ── 2FA ──────────────────────────────────────────────────────────────────
export const verify2faSetupSchema = Joi.object({
  code: Joi.string().pattern(/^\d{6}$/).required(),
});

export const disable2faSchema = Joi.object({
  currentPassword: Joi.string().required(),
  code: Joi.string().pattern(/^\d{6}$/).required(),
});

export const login2faChallengeSchema = Joi.object({
  mfaToken: Joi.string().required(),
  code: Joi.string().pattern(/^\d{6}$/).required(),
});

// ── Password reset ──────────────────────────────────────────────────────
export const passwordForgotSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: passwordSchema.required(),
});

// ── Team management ─────────────────────────────────────────────────────
export const inviteTeamMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid("ADMIN", "VIEWER", "APPROVER").default("VIEWER"),
});

export const updateTeamMemberSchema = Joi.object({
  role: Joi.string().valid("ADMIN", "VIEWER", "APPROVER").required(),
});

// ── Hard delete + export ────────────────────────────────────────────────
export const deleteRequestSchema = Joi.object({
  currentPassword: Joi.string().required(),
  reason: Joi.string().allow("").max(500).optional(),
});
