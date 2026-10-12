import { Router, Request, Response, NextFunction } from "express";
import { checkoutService } from "../service/checkout.service.js";
import { authenticate } from "../../../core/middleware/auth.middleware.js";
import { checkoutRateLimiter } from "../../../core/middleware/rate-limiter.middleware.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { z } from "zod";
import { validateRequest } from "../../../core/middleware/validate.middleware.js";

const router = Router();

const checkoutPreviewSchema = z.object({
  addressId: z.string().min(1, "Address ID is required"),
  couponCode: z.string().optional(),
});

router.post(
  "/preview",
  authenticate,
  checkoutRateLimiter,
  validateRequest({ body: checkoutPreviewSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await checkoutService.prepareCheckout(
        req.user!.id,
        req.body.addressId,
        req.body.couponCode
      );
      ResponseUtil.sendSuccess(res, { checkout: result }, "Checkout preview generated");
    } catch (error) {
      next(error);
    }
  }
);

export const checkoutRoutes = router;
