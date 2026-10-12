import { Types } from "mongoose";
import { PaymentModel, IPayment, PaymentProvider } from "../model/payment.model.js";
import { MasterOrderModel, SellerOrderModel } from "../../orders/model/order.model.js";
import { inventoryService, InventoryService } from "../../inventory/service/inventory.service.js";
import { domainEventBus, DomainEventBus } from "../../../core/events/event-bus.js";
import { IPaymentGateway, PaymentInitiationParams } from "../interfaces/payment-gateway.interface.js";
import { StripePaymentProvider } from "../providers/stripe.provider.js";
import { RazorpayPaymentProvider } from "../providers/razorpay.provider.js";
import { NotFoundError, BadRequestError } from "../../../core/errors/app-error.js";
import { logger } from "../../../core/logger/logger.js";

export class PaymentService {
  private providers: Map<PaymentProvider, IPaymentGateway>;

  constructor(
    private inventory: InventoryService = inventoryService,
    private eventBus: DomainEventBus = domainEventBus
  ) {
    this.providers = new Map();
    this.providers.set("STRIPE", new StripePaymentProvider());
    this.providers.set("RAZORPAY", new RazorpayPaymentProvider());
  }

  public getProvider(providerName: PaymentProvider): IPaymentGateway {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new BadRequestError(`Unsupported payment gateway: ${providerName}`);
    }
    return provider;
  }

  public async initiatePayment(
    params: PaymentInitiationParams & { provider: PaymentProvider }
  ): Promise<{ payment: IPayment; clientSecret: string }> {
    // 1. Idempotency Check: Prevent duplicate payment sessions on network retry
    const existingPayment = await PaymentModel.findOne({
      idempotencyKey: params.idempotencyKey,
    });
    if (existingPayment) {
      logger.info(
        { idempotencyKey: params.idempotencyKey },
        "Reusing existing payment session via idempotency key"
      );
      return {
        payment: existingPayment,
        clientSecret: existingPayment.gatewayTransactionId,
      };
    }

    const gateway = this.getProvider(params.provider);
    const result = await gateway.initiatePayment(params);

    const payment = new PaymentModel({
      masterOrderId: new Types.ObjectId(params.orderId),
      customerId: new Types.ObjectId(params.customerId),
      provider: params.provider,
      gatewayTransactionId: result.gatewayTransactionId,
      idempotencyKey: params.idempotencyKey,
      amountMinor: params.amountMinor,
      currency: params.currency,
      status: "INITIATED",
    });

    await payment.save();

    // Link payment record to MasterOrder
    await MasterOrderModel.findByIdAndUpdate(params.orderId, {
      paymentId: payment._id,
    });

    return {
      payment,
      clientSecret: result.clientSecret,
    };
  }

  public async handleWebhook(
    providerName: PaymentProvider,
    payload: any,
    signature: string
  ): Promise<{ status: string; orderId: string }> {
    const gateway = this.getProvider(providerName);
    const verification = await gateway.verifyWebhook(payload, signature);

    const payment = await PaymentModel.findOne({
      gatewayTransactionId: verification.gatewayTransactionId,
    });

    if (!payment) {
      logger.warn(
        { transactionId: verification.gatewayTransactionId },
        "Payment webhook received for unknown transaction"
      );
      throw new NotFoundError("Payment transaction not found");
    }

    const masterOrder = await MasterOrderModel.findById(payment.masterOrderId).populate(
      "subOrderIds"
    );

    if (!masterOrder) {
      throw new NotFoundError("Associated master order not found");
    }

    // Idempotency: Ignore if already captured
    if (payment.status === "CAPTURED") {
      logger.info({ paymentId: payment._id }, "Webhook already processed for captured payment");
      return { status: "ALREADY_PROCESSED", orderId: masterOrder.orderNumber };
    }

    if (verification.status === "SUCCESS") {
      // 1. Mark payment as CAPTURED
      payment.status = "CAPTURED";
      payment.rawWebhookPayload = payload;
      await payment.save();

      // 2. Mark MasterOrder as PAID
      masterOrder.paymentStatus = "PAID";
      await masterOrder.save();

      // 3. Commit reserved inventory
      const sellerOrders = await SellerOrderModel.find({
        masterOrderId: masterOrder._id,
      });

      const reservedItems = sellerOrders.flatMap((so) =>
        so.items.map((i) => ({ sku: i.sku, quantity: i.quantity }))
      );

      await this.inventory.commitReservation(reservedItems);

      // 4. Activate all seller sub-orders to CONFIRMED
      for (const so of sellerOrders) {
        so.status = "CONFIRMED";
        so.statusHistory.push({
          status: "CONFIRMED",
          timestamp: new Date(),
          note: `Payment captured successfully via ${payment.provider}`,
        });
        await so.save();
      }

      // 5. Emit Domain Event
      this.eventBus.publish("order.paid", {
        orderId: masterOrder._id.toString(),
        orderNumber: masterOrder.orderNumber,
        amountMinor: masterOrder.grandTotalMinor,
        customerId: masterOrder.customerId.toString(),
      });

      return { status: "CAPTURED", orderId: masterOrder.orderNumber };
    } else {
      // Payment Failed: Rollback reserved stock
      payment.status = "FAILED";
      payment.rawWebhookPayload = payload;
      await payment.save();

      masterOrder.paymentStatus = "FAILED";
      await masterOrder.save();

      const sellerOrders = await SellerOrderModel.find({
        masterOrderId: masterOrder._id,
      });

      const itemsToRollback = sellerOrders.flatMap((so) =>
        so.items.map((i) => ({ sku: i.sku, quantity: i.quantity }))
      );

      await this.inventory.rollbackReservation(itemsToRollback);

      for (const so of sellerOrders) {
        so.status = "CANCELLED";
        so.statusHistory.push({
          status: "CANCELLED",
          timestamp: new Date(),
          note: "Payment failed during settlement",
        });
        await so.save();
      }

      this.eventBus.publish("order.payment_failed", {
        orderId: masterOrder._id.toString(),
        orderNumber: masterOrder.orderNumber,
      });

      return { status: "FAILED", orderId: masterOrder.orderNumber };
    }
  }
}

export const paymentService = new PaymentService();
