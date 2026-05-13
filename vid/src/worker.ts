import "dotenv/config";

// Worker process must always run processors regardless of how the API
// container's environment is configured. Override the API-side flags before
// importing processors so a shared .env can't accidentally silence the
// dedicated worker.
process.env.DISABLE_WORKERS = "false";
process.env.ENABLE_INLINE_WORKERS = "true";

const { startProcessors } = await import("./Queues/index.js");
const { default: logger } = await import("./Utils/logger.js");

logger.info("Starting dedicated Bull worker process...");
startProcessors();
logger.info("Bull workers started. Waiting for jobs...");

process.on("SIGTERM", () => {
  logger.info("Worker received SIGTERM, shutting down...");
  process.exit(0);
});
process.on("SIGINT", () => {
  logger.info("Worker received SIGINT, shutting down...");
  process.exit(0);
});
