import { Router } from "express";
import { paymentController } from "../controller/payment.controller.js";
import { authenticate } from "../../../core/middleware/auth.middleware.js";

const router = Router();

// Gateway webhook callback endpoint (publicly accessible by Stripe / Razorpay servers)
router.post("/webhook/:provider", paymentController.handleWebhook);

// Dev / test simulation endpoint
router.post("/mock-success", authenticate, paymentController.simulateMockSuccess);

export const paymentRoutes = router;
