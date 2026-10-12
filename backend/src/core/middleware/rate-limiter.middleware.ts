import rateLimit from "express-rate-limit";
import { config } from "../../config/env.js";
import { RateLimitError } from "../errors/app-error.js";

// General API rate limiter
export const globalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: () => {
    throw new RateLimitError("Too many requests from this IP, please try again later");
  },
});

// Strict rate limiter for sensitive authentication endpoints (brute-force protection)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: () => {
    throw new RateLimitError("Too many login attempts, please try again after 15 minutes");
  },
});

// Strict rate limiter for checkout & payment initiation
export const checkoutRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Max 20 checkout attempts per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: () => {
    throw new RateLimitError("Checkout rate limit exceeded. Please wait a moment before trying again.");
  },
});
