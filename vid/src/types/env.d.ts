declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: string;
    PORT?: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET?: string;
    JWT_ACCESS_TTL?: string;
    JWT_REFRESH_TTL?: string;
    COOKIE_SECRET?: string;
    CORS_ORIGIN: string;
    REDIS_URL?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_REGION?: string;
    AWS_S3_BUCKET?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    EMAIL_HOST?: string;
    EMAIL_PORT?: string;
    EMAIL_USERNAME?: string;
    EMAIL_PASSWORD?: string;
    EMAIL_FROM?: string;
    FRONTEND_URL?: string;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    UPLOAD_DIR?: string;
  }
}
