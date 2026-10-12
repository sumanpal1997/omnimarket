import { Router } from "express";
import { cartController } from "../controller/cart.controller.js";
import {
  optionalAuthenticate,
  authenticate,
} from "../../../core/middleware/auth.middleware.js";
import { validateRequest } from "../../../core/middleware/validate.middleware.js";
import {
  addToCartSchema,
  updateCartItemSchema,
  mergeCartSchema,
} from "../validation/cart.validation.js";

const router = Router();

// Endpoints accessible by both guests and authenticated customers
router.get("/", optionalAuthenticate, cartController.getCart);

router.post(
  "/items",
  optionalAuthenticate,
  validateRequest({ body: addToCartSchema }),
  cartController.addItem
);

router.patch(
  "/items/:sku",
  optionalAuthenticate,
  validateRequest({ body: updateCartItemSchema }),
  cartController.updateItem
);

router.delete("/items/:sku", optionalAuthenticate, cartController.removeItem);

router.delete("/", optionalAuthenticate, cartController.clearCart);

// Merge endpoint: explicitly requires customer authentication
router.post(
  "/merge",
  authenticate,
  validateRequest({ body: mergeCartSchema }),
  cartController.mergeCart
);

export const cartRoutes = router;
