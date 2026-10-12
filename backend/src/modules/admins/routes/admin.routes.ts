import { Router } from "express";
import { adminController } from "../controller/admin.controller.js";
import { authenticate, requireRole } from "../../../core/middleware/auth.middleware.js";
import { validateRequest } from "../../../core/middleware/validate.middleware.js";
import {
  sellerModerationSchema,
  productModerationSchema,
  userStatusToggleSchema,
  adminQuerySchema,
} from "../validation/admin.validation.js";

const router = Router();

// Apply admin authentication gate to all routes
router.use(authenticate, requireRole(["ADMIN"]));

// Platform metrics & analytics
router.get("/analytics", adminController.getAnalytics);

// Seller KYC Moderation queue
router.get("/sellers", validateRequest({ query: adminQuerySchema }), adminController.getSellers);
router.patch(
  "/sellers/:id/status",
  validateRequest({ body: sellerModerationSchema }),
  adminController.moderateSeller
);

// Catalog Product Moderation queue
router.get("/products", validateRequest({ query: adminQuerySchema }), adminController.getProducts);
router.patch(
  "/products/:id/status",
  validateRequest({ body: productModerationSchema }),
  adminController.moderateProduct
);

// User Management
router.get("/users", validateRequest({ query: adminQuerySchema }), adminController.getUsers);
router.patch(
  "/users/:id/status",
  validateRequest({ body: userStatusToggleSchema }),
  adminController.toggleUserStatus
);

// Order Oversight
router.get("/orders", validateRequest({ query: adminQuerySchema }), adminController.getAllOrders);

export const adminRoutes = router;
