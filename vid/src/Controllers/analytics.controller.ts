import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { sql, sqlOne } from "../db.js";
import logger from "../Utils/logger.js";
import type { ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";
import type { DbRow } from "../types/index.js";

type ControllerHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => Promise<void | ReturnType<ExpressResponse["json"]>>;

function qs(
  q: Record<string, string | string[] | undefined>,
  key: string,
  defaultVal: string
): string {
  const v = q[key];
  if (v === undefined) return defaultVal;
  return Array.isArray(v) ? (v[0] ?? defaultVal) : v;
}

const getUserAnalytics: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const { startDate, endDate } = req.query as Record<string, string | string[] | undefined>;

    const dateParts: string[] = [];
    const dateParams: unknown[] = [];
    let dp = 1;
    if (startDate) {
      dateParts.push(`"createdAt" >= $${dp}::timestamp`);
      dateParams.push(new Date(String(startDate)));
      dp++;
    }
    if (endDate) {
      dateParts.push(`"createdAt" <= $${dp}::timestamp`);
      dateParams.push(new Date(String(endDate)));
      dp++;
    }
    const dateFilter = dateParts.length > 0 ? ` AND ${dateParts.join(" AND ")}` : "";

    const txParams = [userId, ...dateParams];
    const [freelancerProfile, txAgg, clientOrders, freelancerOrders] = await Promise.all([
      sqlOne(
        `SELECT "totalEarnings", "rating" FROM "FreelancerProfile" WHERE "user_id" = $1`,
        [userId]
      ),
      sqlOne(
        `SELECT COALESCE(SUM("amount"), 0) AS total, COUNT(*)::int AS cnt
         FROM "Transaction"
         WHERE "user_id" = $1 AND "status" = 'COMPLETED'${dateFilter}`,
        txParams
      ) as Promise<DbRow | null>,
      sqlOne(
        `SELECT COUNT(*)::int AS cnt, COALESCE(SUM("totalPrice"), 0) AS total
         FROM "Order"
         WHERE "client_id" = $1 AND "status" = 'COMPLETED' AND "deletedAt" IS NULL`,
        [userId]
      ) as Promise<DbRow | null>,
      sqlOne(
        `SELECT COUNT(*)::int AS cnt
         FROM "Order" o
         JOIN "FreelancerProfile" fp ON fp."id" = o."freelancer_id"
         WHERE fp."user_id" = $1 AND o."status" = 'COMPLETED' AND o."deletedAt" IS NULL`,
        [userId]
      ) as Promise<DbRow | null>,
    ]);

    const analytics = {
      role: req.user.role,
      totalEarnings: freelancerProfile ? (freelancerProfile as DbRow).totalEarnings : 0,
      averageRating: freelancerProfile ? (freelancerProfile as DbRow).rating : null,
      completedOrdersAsFreelancer: (freelancerOrders as DbRow | null)?.cnt ?? 0,
      completedOrdersAsClient: (clientOrders as DbRow | null)?.cnt ?? 0,
      totalSpentAsClient: (clientOrders as DbRow | null)?.total ?? 0,
      totalTransactions: (txAgg as DbRow | null)?.cnt ?? 0,
      transactionVolume: (txAgg as DbRow | null)?.total ?? 0,
    };

    return res.status(200).json(new ApiResponse(200, analytics, "User analytics retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving user analytics: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve user analytics"));
  }
};

const getPlatformAnalytics: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id || req.user.role !== "ADMIN") {
      return next(new ApiError(403, "Forbidden: Admin access required"));
    }

    const { startDate, endDate } = req.query as Record<string, string | string[] | undefined>;
    const dateParts: string[] = [];
    const dateParams: unknown[] = [];
    let dp = 1;
    if (startDate) {
      dateParts.push(`"createdAt" >= $${dp}::timestamp`);
      dateParams.push(new Date(String(startDate)));
      dp++;
    }
    if (endDate) {
      dateParts.push(`"createdAt" <= $${dp}::timestamp`);
      dateParams.push(new Date(String(endDate)));
      dp++;
    }
    const dateFilter = dateParts.length > 0 ? ` AND ${dateParts.join(" AND ")}` : "";

    const [userStats, gigStats, jobStats, orderStats, transactionStats, disputeStats] = await Promise.all([
      sqlOne(
        `SELECT COUNT(*)::int AS cnt FROM "User" WHERE "isActive" = true${dateFilter}`,
        dateParams
      ) as Promise<DbRow | null>,
      sqlOne(
        `SELECT COUNT(*)::int AS cnt FROM "Gig" WHERE "status" = 'ACTIVE'::"GigStatus" AND "deletedAt" IS NULL${dateFilter}`,
        dateParams
      ) as Promise<DbRow | null>,
      sqlOne(
        `SELECT COUNT(*)::int AS cnt FROM "Job" WHERE "isVerified" = true AND "deletedAt" IS NULL${dateFilter}`,
        dateParams
      ) as Promise<DbRow | null>,
      sqlOne(
        `SELECT COUNT(*)::int AS cnt, COALESCE(SUM("totalPrice"), 0) AS total FROM "Order" WHERE "status" = 'COMPLETED' AND "deletedAt" IS NULL${dateFilter}`,
        dateParams
      ) as Promise<DbRow | null>,
      sqlOne(
        `SELECT COALESCE(SUM("amount"), 0) AS total, COUNT(*)::int AS cnt FROM "Transaction" WHERE "status" = 'COMPLETED'${dateFilter}`,
        dateParams
      ) as Promise<DbRow | null>,
      sqlOne(
        `SELECT COUNT(*)::int AS cnt FROM "Dispute" WHERE "status" IN ('OPEN', 'IN_REVIEW')${dateFilter}`,
        dateParams
      ) as Promise<DbRow | null>,
    ]);

    const analytics = {
      totalActiveUsers: (userStats as DbRow | null)?.cnt,
      totalActiveGigs: (gigStats as DbRow | null)?.cnt,
      totalActiveJobs: (jobStats as DbRow | null)?.cnt,
      totalCompletedOrders: (orderStats as DbRow | null)?.cnt,
      totalOrderValue: (orderStats as DbRow | null)?.total,
      totalTransactions: (transactionStats as DbRow | null)?.cnt,
      totalRevenue: (transactionStats as DbRow | null)?.total,
      activeDisputes: (disputeStats as DbRow | null)?.cnt,
    };

    return res.status(200).json(new ApiResponse(200, analytics, "Platform analytics retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving platform analytics: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve platform analytics"));
  }
};

const getDetailedUserAnalytics: ControllerHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new ApiError(401, "Unauthorized: User not authenticated"));
    }
    const userId = req.user.id;
    const g = qs(req.query, "granularity", "month");
    const { startDate, endDate } = req.query as Record<string, string | string[] | undefined>;

    const truncField = g === "day" ? "day" : "month";
    const subLen = g === "day" ? 10 : 7;

    const dateParts = [`"user_id" = $1`, `"status" = 'COMPLETED'`];
    const params: unknown[] = [userId];
    let p = 2;
    if (startDate) {
      dateParts.push(`"createdAt" >= $${p}::timestamp`);
      params.push(new Date(String(startDate)));
      p++;
    }
    if (endDate) {
      dateParts.push(`"createdAt" <= $${p}::timestamp`);
      params.push(new Date(String(endDate)));
      p++;
    }
    const txWhere = dateParts.join(" AND ");

    const transactionsByPeriod = (await sql(
      `SELECT date_trunc('${truncField}', "createdAt") AS period,
              COALESCE(SUM("amount"), 0) AS "totalAmount",
              COUNT(*)::int AS "transactionCount"
       FROM "Transaction"
       WHERE ${txWhere}
       GROUP BY period
       ORDER BY period ASC`,
      params
    )) as DbRow[];

    const formattedTransactions = transactionsByPeriod.map((t) => ({
      period: (t.period as Date).toISOString().substring(0, subLen),
      totalAmount: t.totalAmount,
      transactionCount: t.transactionCount,
    }));

    const orderDateParts = [`"client_id" = $1`, `"status" = 'COMPLETED'`, `"deletedAt" IS NULL`];
    const orderParams: unknown[] = [userId];
    let op = 2;
    if (startDate) {
      orderDateParts.push(`"createdAt" >= $${op}::timestamp`);
      orderParams.push(new Date(String(startDate)));
      op++;
    }
    if (endDate) {
      orderDateParts.push(`"createdAt" <= $${op}::timestamp`);
      orderParams.push(new Date(String(endDate)));
      op++;
    }
    const oWhere = orderDateParts.join(" AND ");

    const ordersAsClientByPeriod = (await sql(
      `SELECT date_trunc('${truncField}', "createdAt") AS period,
              COALESCE(SUM("totalPrice"), 0) AS "totalSpent",
              COUNT(*)::int AS "orderCount"
       FROM "Order"
       WHERE ${oWhere}
       GROUP BY period
       ORDER BY period ASC`,
      orderParams
    )) as DbRow[];

    const formattedOrdersAsClient = ordersAsClientByPeriod.map((o) => ({
      period: (o.period as Date).toISOString().substring(0, subLen),
      totalSpent: o.totalSpent,
      orderCount: o.orderCount,
    }));

    const analytics = {
      role: req.user.role,
      transactions: formattedTransactions,
      ordersAsClient: formattedOrdersAsClient,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, analytics, "Detailed user analytics retrieved successfully"));
  } catch (error) {
    logger.error("Error retrieving detailed user analytics: %s", (error as Error).message);
    return next(new ApiError(500, "Failed to retrieve detailed user analytics"));
  }
};

export { getUserAnalytics, getPlatformAnalytics, getDetailedUserAnalytics };
