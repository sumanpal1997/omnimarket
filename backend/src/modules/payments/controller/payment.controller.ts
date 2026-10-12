import { Request, Response, NextFunction } from "express";
import { paymentService, PaymentService } from "../service/payment.service.js";
import { PaymentProvider } from "../model/payment.model.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { BadRequestError } from "../../../core/errors/app-error.js";
import { HttpStatus } from "../../../core/constants/http-status.js";

export class PaymentController {
  constructor(private service: PaymentService = paymentService) {}

  public handleWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const providerParam = (req.params.provider || "").toUpperCase() as PaymentProvider;
      if (providerParam !== "STRIPE" && providerParam !== "RAZORPAY") {
        throw new BadRequestError(`Unsupported payment provider: ${req.params.provider}`);
      }

      const signature =
        (req.headers["stripe-signature"] as string) ||
        (req.headers["x-razorpay-signature"] as string) ||
        (req.headers["x-signature"] as string) ||
        "";

      const result = await this.service.handleWebhook(providerParam, req.body, signature);

      ResponseUtil.sendSuccess(res, result, "Webhook processed successfully", HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  public simulateMockSuccess = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) {
        throw new BadRequestError("Payment ID is required");
      }

      // Simulate a successful gateway webhook callback
      const mockPayload = {
        id: `mock_evt_${Date.now()}`,
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: paymentId,
            status: "succeeded",
          },
        },
      };

      const result = await this.service.handleWebhook("STRIPE", mockPayload, "mock_sig");

      ResponseUtil.sendSuccess(res, result, "Mock payment confirmed successfully");
    } catch (error) {
      next(error);
    }
  };
}

export const paymentController = new PaymentController();
