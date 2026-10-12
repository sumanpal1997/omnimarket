import { Router } from "express";
import { userController } from "../controller/user.controller.js";
import { authenticate } from "../../../core/middleware/auth.middleware.js";
import { validateRequest } from "../../../core/middleware/validate.middleware.js";
import {
  updateProfileSchema,
  addressSchema,
  updateAddressSchema,
} from "../validation/user.validation.js";

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Profile
router.get("/profile", userController.getProfile);
router.patch(
  "/profile",
  validateRequest({ body: updateProfileSchema }),
  userController.updateProfile
);

// Addresses
router.get("/addresses", userController.getAddresses);
router.post(
  "/addresses",
  validateRequest({ body: addressSchema }),
  userController.addAddress
);
router.patch(
  "/addresses/:addressId",
  validateRequest({ body: updateAddressSchema }),
  userController.updateAddress
);
router.patch("/addresses/:addressId/default", userController.setDefaultAddress);
router.delete("/addresses/:addressId", userController.deleteAddress);

export const userRoutes = router;
