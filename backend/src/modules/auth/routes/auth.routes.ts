import { Router } from "express";
import { authController } from "../controller/auth.controller.js";
import { validateRequest } from "../../../core/middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../validation/auth.validation.js";
import { authRateLimiter } from "../../../core/middleware/rate-limiter.middleware.js";
import { authenticate } from "../../../core/middleware/auth.middleware.js";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  authController.register
);

router.post(
  "/login",
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  authController.login
);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.get("/me", authenticate, authController.getMe);

export const authRoutes = router;
