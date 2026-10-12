import { Router } from "express";
import { wishlistController } from "../controller/wishlist.controller.js";
import { authenticate } from "../../../core/middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", wishlistController.getWishlist);
router.post("/toggle/:productId", wishlistController.toggleProduct);

export const wishlistRoutes = router;
