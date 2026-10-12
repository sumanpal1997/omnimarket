import { Router } from "express";
import { orderController } from "../controller/order.controller.js";
import { authenticate, requireRole } from "../../../core/middleware/auth.middleware.js";
import { checkoutRateLimiter } from "../../../core/middleware/rate-limiter.middleware.js";
import { validateRequest } from "../../../core/middleware/validate.middleware.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  listOrdersQuerySchema,
} from "../validation/order.validation.js";

const router = Router();

// Customer endpoints
router.post(
  "/",
  authenticate,
  checkoutRateLimiter,
  validateRequest({ body: createOrderSchema }),
  orderController.createOrder
);

router.get(
  "/",
  authenticate,
  validateRequest({ query: listOrdersQuerySchema }),
  orderController.getMyOrders
);

// Seller fulfillment endpoints (must be defined BEFORE /:orderNumber param route)
router.get(
  "/seller/sub-orders",
  authenticate,
  requireRole(["SELLER", "ADMIN"]),
  validateRequest({ query: listOrdersQuerySchema }),
  orderController.getSellerSubOrders
);

router.patch(
  "/seller/sub-orders/:id/status",
  authenticate,
  requireRole(["SELLER", "ADMIN"]),
  validateRequest({ body: updateOrderStatusSchema }),
  orderController.updateSellerSubOrderStatus
);

// Order tracking / detail endpoint
router.get(
  "/:orderNumber",
  authenticate,
  orderController.getOrderDetail
);

export const orderRoutes = router;
