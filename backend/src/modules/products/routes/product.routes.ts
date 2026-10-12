import { Router } from "express";
import { productController } from "../controller/product.controller.js";
import { authenticate, requireRole } from "../../../core/middleware/auth.middleware.js";
import { validateRequest } from "../../../core/middleware/validate.middleware.js";
import {
  createProductSchema,
  reviewProductSchema,
} from "../validation/product.validation.js";

const router = Router();

// ==========================================
// 1. PUBLIC STOREFRONT ROUTES
// ==========================================
router.get("/", productController.getCatalog);
router.get("/detail/:slug", productController.getBySlug);

// ==========================================
// 2. SELLER PORTAL PRODUCT ROUTES
// ==========================================
router.post(
  "/seller",
  authenticate,
  requireRole(["SELLER"]),
  validateRequest({ body: createProductSchema }),
  productController.createProduct
);

router.get(
  "/seller/my-products",
  authenticate,
  requireRole(["SELLER"]),
  productController.getMySellerProducts
);

router.post(
  "/seller/:id/submit",
  authenticate,
  requireRole(["SELLER"]),
  productController.submitForApproval
);

// ==========================================
// 3. ADMIN PRODUCT MODERATION ROUTES
// ==========================================
router.patch(
  "/admin/:id/review",
  authenticate,
  requireRole(["ADMIN"]),
  validateRequest({ body: reviewProductSchema }),
  productController.reviewProduct
);

export const productRoutes = router;
