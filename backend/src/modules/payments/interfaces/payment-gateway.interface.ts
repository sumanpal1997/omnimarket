export interface PaymentInitiationParams {
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  customerId: string;
  customerEmail: string;
  idempotencyKey: string;
}

export interface PaymentInitiationResult {
  gatewayTransactionId: string;
  clientSecret: string;
  additionalData?: Record<string, unknown>;
}

export interface WebhookVerificationResult {
  status: "SUCCESS" | "FAILED";
  gatewayTransactionId: string;
  orderId: string;
  rawPayload: Record<string, unknown>;
}

export interface IPaymentGateway {
  initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult>;
  verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult>;
  processRefund(params: {
    transactionId: string;
    amountMinor: number;
    reason: string;
  }): Promise<{ refundId: string; status: "SUCCESS" | "PENDING" }>;
}
