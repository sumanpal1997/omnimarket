import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { config } from "./config/env.js";
import { requestIdMiddleware } from "./core/middleware/request-id.middleware.js";
import { globalRateLimiter } from "./core/middleware/rate-limiter.middleware.js";
import { errorHandler } from "./core/middleware/error.middleware.js";
import { DatabaseManager } from "./config/database.js";
import { NotFoundError } from "./core/errors/app-error.js";
import { ResponseUtil } from "./core/utils/response.util.js";
import { HttpStatus } from "./core/constants/http-status.js";
import { authRoutes } from "./modules/auth/routes/auth.routes.js";
import { userRoutes } from "./modules/users/routes/user.routes.js";
import { sellerRoutes } from "./modules/sellers/routes/seller.routes.js";
import { productRoutes } from "./modules/products/routes/product.routes.js";
import { categoryRoutes } from "./modules/categories/routes/category.routes.js";
import { brandRoutes } from "./modules/brands/routes/brand.routes.js";
import { cartRoutes } from "./modules/cart/routes/cart.routes.js";
import { wishlistRoutes } from "./modules/wishlist/routes/wishlist.routes.js";
import { checkoutRoutes } from "./modules/orders/routes/checkout.routes.js";
import { orderRoutes } from "./modules/orders/routes/order.routes.js";
import { paymentRoutes } from "./modules/payments/routes/payment.routes.js";
import { adminRoutes } from "./modules/admins/routes/admin.routes.js";
import { reviewRoutes } from "./modules/reviews/routes/review.routes.js";

export const createApp = (): Express => {
  const app = express();

  // 1. Security & Core Pre-Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: config.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-Id",
        "X-Guest-Token",
        "x-guest-token",
      ],
      exposedHeaders: ["X-Guest-Token", "x-guest-token"],
    })
  );
  app.use(compression());
  app.use(requestIdMiddleware);
  app.use(cookieParser(config.COOKIE_SECRET));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // 2. Global Rate Limiter
  app.use(globalRateLimiter);

  // 3. Health & Observability Endpoints
  app.get("/health", (_req: Request, res: Response) => {
    return ResponseUtil.sendSuccess(
      res,
      {
        status: "UP",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      "Service is healthy",
      HttpStatus.OK
    );
  });

  app.get("/readiness", (_req: Request, res: Response) => {
    const isDbConnected = DatabaseManager.checkHealth();
    if (!isDbConnected) {
      return ResponseUtil.sendError(
        res,
        "DATABASE_DISCONNECTED",
        "MongoDB is not currently connected",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    return ResponseUtil.sendSuccess(
      res,
      {
        database: "CONNECTED",
        status: "READY",
      },
      "Service is ready to handle traffic",
      HttpStatus.OK
    );
  });

  // 4. API v1 Router Registration
  const v1Router = express.Router();

  v1Router.get("/", (_req: Request, res: Response) => {
    return ResponseUtil.sendSuccess(
      res,
      {
        version: "1.0.0",
        name: "OmniMarket Modular Monolith API",
      },
      "API v1 operational"
    );
  });

  v1Router.use("/auth", authRoutes);
  v1Router.use("/users", userRoutes);
  v1Router.use("/sellers", sellerRoutes);
  v1Router.use("/products", productRoutes);
  v1Router.use("/categories", categoryRoutes);
  v1Router.use("/brands", brandRoutes);
  v1Router.use("/cart", cartRoutes);
  v1Router.use("/wishlist", wishlistRoutes);
  v1Router.use("/checkout", checkoutRoutes);
  v1Router.use("/orders", orderRoutes);
  v1Router.use("/payments", paymentRoutes);
  v1Router.use("/admin", adminRoutes);
  v1Router.use("/reviews", reviewRoutes);

  app.use(config.API_PREFIX, v1Router);

  // 5. 404 Catch-All Route
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // 6. Centralized Error Handler (Must be registered last)
  app.use(errorHandler);

  return app;
};
