import type { ExpressHandler, ExpressRequest, ExpressResponse, NextFunction } from "../types/index.js";

const asyncHandler = (requestHandler: ExpressHandler): ExpressHandler => {
  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    void Promise.resolve(requestHandler(req, res, next)).catch((err: unknown) => {
      next(err instanceof Error ? err : new Error(String(err)));
    });
  };
};

export { asyncHandler };
