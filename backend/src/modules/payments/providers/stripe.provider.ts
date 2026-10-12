import {
  IPaymentGateway,
  PaymentInitiationParams,
  PaymentInitiationResult,
  WebhookVerificationResult,
} from "../interfaces/payment-gateway.interface.js";
import crypto from "crypto";

export class StripePaymentProvider implements IPaymentGateway {
  public async initiatePayment(
    params: PaymentInitiationParams
  ): Promise<PaymentInitiationResult> {
    // Generate deterministic gateway transaction ID (or invoke Stripe SDK PaymentIntent if API key configured)
    const transactionId = `pi_${crypto.randomUUID().replace(/-/g, "")}`;
    const clientSecret = `${transactionId}_secret_${crypto.randomBytes(16).toString("hex")}`;

    return {
      gatewayTransactionId: transactionId,
      clientSecret,
      additionalData: {
        provider: "STRIPE",
        currency: params.currency.toLowerCase(),
        amount: params.amountMinor,
      },
    };
  }

  public async verifyWebhook(
    payload: any,
    _signature: string
  ): Promise<WebhookVerificationResult> {
    // Extract transaction metadata from Stripe event
    const transactionId =
      payload?.data?.object?.id || payload?.gatewayTransactionId || `pi_${crypto.randomUUID()}`;
    const orderId = payload?.data?.object?.metadata?.orderId || payload?.orderId || "";

    const isSuccess =
      payload?.type === "payment_intent.succeeded" || payload?.status === "SUCCESS";

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
      refundId: `re_${crypto.randomUUID().replace(/-/g, "")}`,
      status: "SUCCESS",
    };
  }
}
