import type { NextFunction, Request, Response } from "express";
import type { Logger } from "../utils/logger.js";
import { HttpError } from "./http-error.js";

const GENERIC_CLIENT_MESSAGE = "Something went wrong. Please try again later.";

export function errorHandler(logger: Logger) {
  return (
    err: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (res.headersSent) {
      next(err);
      return;
    }

    logger.error({ err }, "Unhandled error");

    const status = err instanceof HttpError ? err.statusCode : 500;
    res.status(status).json({ error: GENERIC_CLIENT_MESSAGE });
  };
}
