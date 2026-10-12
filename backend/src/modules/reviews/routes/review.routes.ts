import { Router } from "express";
import { reviewController } from "../controller/review.controller.js";
import { authenticate } from "../../../core/middleware/auth.middleware.js";
import { validateRequest } from "../../../core/middleware/validate.middleware.js";
import {
  createReviewSchema,
  listReviewsQuerySchema,
} from "../validation/review.validation.js";

const router = Router();

// Public: Get reviews feed for a product
router.get(
  "/product/:productId",
  validateRequest({ query: listReviewsQuerySchema }),
  reviewController.getProductReviews
);

// Authenticated customer endpoints
router.post(
  "/",
  authenticate,
  validateRequest({ body: createReviewSchema }),
  reviewController.addReview
);

router.get(
  "/product/:productId/eligibility",
  authenticate,
  reviewController.checkEligibility
);

router.post(
  "/:id/vote",
  authenticate,
  reviewController.voteHelpful
);

export const reviewRoutes = router;
