import "dotenv/config";
import { startProcessors } from "./Queues/index.js";
import logger from "./Utils/logger.js";

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
