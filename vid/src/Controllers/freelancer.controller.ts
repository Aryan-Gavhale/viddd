import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne } from "../db.js";
import logger from "../Utils/logger.js";
import type {
  ExpressRequest,
  ExpressResponse,
  NextFunction,
  DbRow,
} from "../types/index.js";

type Handler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

const getFreelancerSkills: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;

    const freelancer = (await sqlOne(
      `SELECT "skills" FROM "FreelancerProfile" WHERE "user_id" = $1`,
      [userId]
    )) as DbRow | null;
    if (!freelancer) {
      return next(new ApiError(404, "Freelancer profile not found"));
    }

    const skillsList = (freelancer.skills as string[] | undefined) || [];
    const skills = skillsList.map((skill, index) => ({ id: index + 1, name: skill }));
    return res.status(200).json(new ApiResponse(200, skills, "Skills retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving skills: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve skills"));
  }
};

const getFreelancerSoftware: Handler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;

    const software = await sql(
      `SELECT fs."id", fs."name", fs."icon", fs."level"
       FROM "FreelancerSoftware" fs
       INNER JOIN "FreelancerProfile" fp ON fp."id" = fs."freelancer_id"
       WHERE fp."user_id" = $1
       ORDER BY fs."id" ASC`,
      [userId]
    );

    return res.status(200).json(new ApiResponse(200, software, "Software retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving software: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve software"));
  }
};

export { getFreelancerSkills, getFreelancerSoftware };
