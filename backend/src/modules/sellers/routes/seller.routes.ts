import { Router } from "express";
import { sellerController } from "../controller/seller.controller.js";
import { authenticate, requireRole } from "../../../core/middleware/auth.middleware.js";
import { validateRequest } from "../../../core/middleware/validate.middleware.js";
import {
  sellerApplicationSchema,
  reviewSellerApplicationSchema,
  updateSellerStatusSchema,
} from "../validation/seller.validation.js";
import { payoutController } from "../controller/payout.controller.js";
import {
  settlePayoutSchema,
  listPayoutsQuerySchema,
} from "../validation/payout.validation.js";

const router = Router();

// All seller endpoints require active session
router.use(authenticate);

// 1. Merchant Onboarding & Profile
router.post(
  "/apply",
  validateRequest({ body: sellerApplicationSchema }),
  sellerController.apply
);
router.get("/me", sellerController.getMyProfile);

// 2. Admin Moderation & Governance Routes
router.get(
  "/admin/applications",
  requireRole(["ADMIN"]),
  sellerController.listApplications
);

router.patch(
  "/admin/applications/:id/review",
  requireRole(["ADMIN"]),
  validateRequest({ body: reviewSellerApplicationSchema }),
  sellerController.reviewApplication
);

router.patch(
  "/admin/sellers/:id/status",
  requireRole(["ADMIN"]),
  validateRequest({ body: updateSellerStatusSchema }),
  sellerController.updateStatus
);

// 3. Seller Analytics & Automated Payout Engine
router.get(
  "/dashboard/analytics",
  requireRole(["SELLER", "ADMIN"]),
  payoutController.getAnalytics
);

router.get(
  "/dashboard/payouts",
  requireRole(["SELLER", "ADMIN"]),
  validateRequest({ query: listPayoutsQuerySchema }),
  payoutController.getPayouts
);

router.post(
  "/dashboard/payouts/request",
  requireRole(["SELLER", "ADMIN"]),
  payoutController.requestPayout
);

router.patch(
  "/admin/payouts/:id/settle",
  requireRole(["ADMIN"]),
  validateRequest({ body: settlePayoutSchema }),
  payoutController.settlePayout
);

export const sellerRoutes = router;
