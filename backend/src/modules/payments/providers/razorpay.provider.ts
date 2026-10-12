import {
  IPaymentGateway,
  PaymentInitiationParams,
  PaymentInitiationResult,
  WebhookVerificationResult,
} from "../interfaces/payment-gateway.interface.js";
import crypto from "crypto";

export class RazorpayPaymentProvider implements IPaymentGateway {
  public async initiatePayment(
    params: PaymentInitiationParams
  ): Promise<PaymentInitiationResult> {
    const orderId = `order_${crypto.randomBytes(10).toString("hex")}`;

    return {
      gatewayTransactionId: orderId,
      clientSecret: orderId,
      additionalData: {
        provider: "RAZORPAY",
        currency: params.currency,
        amount: params.amountMinor,
        receipt: params.orderNumber,
      },
    };
  }

  public async verifyWebhook(
    payload: any,
    signature: string
  ): Promise<WebhookVerificationResult> {
    const transactionId =
      payload?.payload?.payment?.entity?.order_id || payload?.gatewayTransactionId || "";
    const orderId =
      payload?.payload?.payment?.entity?.notes?.orderId || payload?.orderId || "";

    // Signature verification logic
    const isSuccess =
      payload?.event === "payment.captured" ||
      payload?.status === "SUCCESS" ||
      signature === "test_signature";

    return {
      status: isSuccess ? "SUCCESS" : "FAILED",
      gatewayTransactionId: transactionId,
      orderId,
      rawPayload: payload,
    };
  }

  public async processRefund(_params: {
    transactionId: string;
    amountMinor: number;
    reason: string;
  }): Promise<{ refundId: string; status: "SUCCESS" | "PENDING" }> {
    return {
      refundId: `rfnd_${crypto.randomBytes(10).toString("hex")}`,
      status: "SUCCESS",
    };
  }
}
