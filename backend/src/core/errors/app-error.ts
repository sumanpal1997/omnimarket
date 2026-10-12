import { HttpStatus, HttpStatusCode } from "../constants/http-status.js";

export abstract class AppError extends Error {
  public abstract readonly statusCode: HttpStatusCode;
  public abstract readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  public readonly statusCode = HttpStatus.BAD_REQUEST;
  public readonly code = "BAD_REQUEST";
}

export class UnauthorizedError extends AppError {
  public readonly statusCode = HttpStatus.UNAUTHORIZED;
  public readonly code = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  public readonly statusCode = HttpStatus.FORBIDDEN;
  public readonly code = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  public readonly statusCode = HttpStatus.NOT_FOUND;
  public readonly code = "NOT_FOUND";
}

export class ConflictError extends AppError {
  public readonly statusCode = HttpStatus.CONFLICT;
  public readonly code = "CONFLICT";
}

export class ValidationError extends AppError {
  public readonly statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
  public readonly code = "VALIDATION_ERROR";
}

export class RateLimitError extends AppError {
  public readonly statusCode = HttpStatus.TOO_MANY_REQUESTS;
  public readonly code = "RATE_LIMIT_EXCEEDED";
}

export class InternalServerError extends AppError {
  public readonly statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  public readonly code = "INTERNAL_SERVER_ERROR";
}
