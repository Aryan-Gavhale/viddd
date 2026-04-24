import type { FastifyInstance } from "fastify";
import { authenticate } from "../Middlewares/auth.middleware.js";
import { generateThumbnails, getPortfolioWithThumbnails } from "../Controllers/thumbnail.controller.js";

async function thumbnailRoutes(app: FastifyInstance) {
  app.post("/generate", { preHandler: [authenticate] }, generateThumbnails as never);
  app.get("/portfolio/:userId", getPortfolioWithThumbnails as never);
}

export default thumbnailRoutes;
