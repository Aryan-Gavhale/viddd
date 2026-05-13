const REQUIRED_ENV_VARS = ["DATABASE_URL", "JWT_SECRET", "COOKIE_SECRET", "CORS_ORIGIN"];

const RECOMMENDED_ENV_VARS = [
  "REDIS_URL",
  "JWT_REFRESH_SECRET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "AWS_S3_BUCKET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SENTRY_DSN",
  "EMAIL_USERNAME",
  "EMAIL_PASSWORD",
];

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("FATAL: Missing required environment variables:");
    missing.forEach((key) => console.error(`  - ${key}`));
    console.error("\nCreate a .env file with the required variables. See .env.example for reference.");
    process.exit(1);
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error("FATAL: JWT_SECRET must be at least 32 characters for security.");
    process.exit(1);
  }

  // FIX M1: enforce a separate refresh secret in production so an access-token
  // leak doesn't compromise refresh tokens too.
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!refreshSecret) {
      console.error("FATAL: JWT_REFRESH_SECRET is required in production.");
      process.exit(1);
    }
    if (refreshSecret.length < 32) {
      console.error("FATAL: JWT_REFRESH_SECRET must be at least 32 characters.");
      process.exit(1);
    }
    if (refreshSecret === jwtSecret) {
      console.error("FATAL: JWT_REFRESH_SECRET must differ from JWT_SECRET.");
      process.exit(1);
    }
  } else if (refreshSecret && refreshSecret === jwtSecret) {
    console.warn("WARNING: JWT_REFRESH_SECRET equals JWT_SECRET. Use distinct secrets.");
  }

  if (process.env.NODE_ENV === "production" && !process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn("WARNING: STRIPE_WEBHOOK_SECRET is not set. Stripe webhooks will fail.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_INLINE_WORKERS === "true" &&
    process.env.DISABLE_WORKERS !== "true"
  ) {
    console.warn(
      "WARNING: ENABLE_INLINE_WORKERS=true in production. The API process will run Bull processors and may duplicate jobs if a dedicated worker is also running."
    );
  }

  const missingRecommended = RECOMMENDED_ENV_VARS.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    console.warn("WARNING: Missing recommended environment variables (some features may not work):");
    missingRecommended.forEach((key) => console.warn(`  - ${key}`));
  }

  console.log("Environment validation passed.");
}
