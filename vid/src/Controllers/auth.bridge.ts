/**
 * Auth bridge: tiny stand-alone module so `security.routes.ts` can wire
 * `POST /security/2fa/login` without re-declaring the cookie/session logic
 * that already lives inside `user.controller.ts`. We import the cookie
 * helpers from there indirectly via a callback the route exposes.
 *
 * The actual session issuance is delegated to a closure registered by
 * `app.ts` (`setMfaSessionIssuer`) so we don't depend on the controller's
 * internal cookie helpers at module-load time.
 */
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { consumeMfaPending } from "./twoFactor.controller.js";
import logger from "../Utils/logger.js";
import type {
  ExpressRequest,
  ExpressResponse,
  NextFunction,
  DbRow,
} from "../types/index.js";

type IssueSessionFn = (res: ExpressResponse, user: DbRow) => Promise<void>;

let issueSession: IssueSessionFn | null = null;

export function setMfaSessionIssuer(fn: IssueSessionFn): void {
  issueSession = fn;
}

export const complete2faLoginRoute = async (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
): Promise<void | ReturnType<ExpressResponse["json"]>> => {
  try {
    const { mfaToken, code } = req.body as { mfaToken?: string; code?: string };
    if (!mfaToken || !code) return next(new ApiError(400, "mfaToken and code are required"));
    const user = await consumeMfaPending(mfaToken, code);

    if (issueSession) {
      await issueSession(res, user);
    } else {
      logger.warn("complete2faLoginRoute: MFA session issuer not registered");
      return next(new ApiError(503, "Login finalisation not available"));
    }

    const userResponse = {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
    };
    return res.status(200).json(new ApiResponse(200, { user: userResponse }, "Login successful"));
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    logger.error("complete2faLoginRoute: %s", (err as Error).message);
    return next(new ApiError(500, "Failed to complete MFA login"));
  }
};
