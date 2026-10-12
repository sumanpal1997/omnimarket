import { Response } from "express";
import { HttpStatus, HttpStatusCode } from "../constants/http-status.js";

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor?: string;
}

export class ResponseUtil {
  public static sendSuccess<T>(
    res: Response,
    data: T,
    message = "Operation completed successfully",
    statusCode: HttpStatusCode = HttpStatus.OK,
    meta?: PaginationMetadata
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      ...(meta && { meta }),
    });
  }

  public static sendError(
    res: Response,
    code: string,
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: unknown
  ): Response {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    });
  }
}
