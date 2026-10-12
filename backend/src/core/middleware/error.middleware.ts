import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";
import { HttpStatus } from "../constants/http-status.js";
import { logger } from "../logger/logger.js";
import { config } from "../../config/env.js";

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.id || "unknown";

  // 1. Operational AppErrors
  if (err instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        details: err.details,
        path: req.originalUrl,
        method: req.method,
      },
      `Operational Error: ${err.message}`
    );

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      rule: issue.code,
    }));

    logger.warn(
      {
        requestId,
        errors: formattedErrors,
        path: req.originalUrl,
      },
      "Request Validation Failed"
    );

    res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The provided request data failed validation",
        details: formattedErrors,
      },
    });
    return;
  }

  // 3. Mongo Duplicate Key Error (E11000)
  if ("code" in err && (err as { code: number }).code === 11000) {
    const duplicateFields = Object.keys((err as { keyValue?: Record<string, unknown> }).keyValue || {});
    const fieldName = duplicateFields.length > 0 ? duplicateFields.join(", ") : "resource";

    res.status(HttpStatus.CONFLICT).json({
      success: false,
      error: {
        code: "DUPLICATE_RESOURCE",
        message: `A record with this ${fieldName} already exists`,
      },
    });
    return;
  }

  // 4. Unexpected / Unhandled Errors
  logger.error(
    {
      requestId,
      err,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method,
    },
    `Unhandled Exception: ${err.message}`
  );

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        config.NODE_ENV === "production"
          ? "An unexpected internal server error occurred"
          : err.message,
    },
  });
};
