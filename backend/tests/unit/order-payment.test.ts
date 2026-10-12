import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { OrderService } from "../../src/modules/orders/service/order.service.js";
import { PaymentService } from "../../src/modules/payments/service/payment.service.js";
import { MasterOrderModel, SellerOrderModel } from "../../src/modules/orders/model/order.model.js";
import { PaymentModel } from "../../src/modules/payments/model/payment.model.js";
import { UserModel } from "../../src/modules/users/model/user.model.js";
import { CartModel } from "../../src/modules/cart/model/cart.model.js";
import { SellerModel } from "../../src/modules/sellers/model/seller.model.js";
import { BadRequestError } from "../../src/core/errors/app-error.js";

describe("Order & Payment Module Unit Tests", () => {
  describe("OrderService", () => {
    let orderService: OrderService;
    let mockInventory: any;
    let mockPricing: any;
    let mockPayment: any;
    let mockRepository: any;
    let mockEventBus: any;

    beforeEach(() => {
      mockInventory = {
        reserveStock: vi.fn().mockResolvedValue(true),
        rollbackReservation: vi.fn().mockResolvedValue(true),
        commitReservation: vi.fn().mockResolvedValue(true),
      };

      mockPricing = {
        calculateOrderPrice: vi.fn(),
      };

      mockPayment = {
        initiatePayment: vi.fn().mockResolvedValue({
          payment: { _id: new Types.ObjectId() },
          clientSecret: "pi_test_secret_123",
        }),
      };

      mockRepository = {
        createMasterOrder: vi.fn().mockImplementation((data) => Promise.resolve(data)),
        createSellerOrders: vi.fn().mockImplementation((data) =>
          Promise.resolve(
            data.map((d: any) => ({
              ...d,
              _id: d._id || new Types.ObjectId(),
            }))
          )
        ),
        findSellerOrderById: vi.fn(),
        updateSellerOrderStatus: vi.fn(),
      };

      mockEventBus = {
        publish: vi.fn(),
      };

      orderService = new OrderService(
        mockRepository,
        mockInventory,
        mockPricing,
        mockPayment,
        mockEventBus
      );
    });

    it("should throw BadRequestError if customer cart is empty", async () => {
      const userId = new Types.ObjectId();
      const addressId = new Types.ObjectId();

      vi.spyOn(UserModel, "findById").mockResolvedValue({
        _id: userId,
        addresses: [{ _id: addressId, label: "Home", street: "123 Main St", city: "Mumbai", state: "MH", postalCode: "400001", country: "India" }],
      } as any);

      vi.spyOn(CartModel, "findOne").mockResolvedValue({
        userId,
        items: [],
      } as any);

      await expect(
        orderService.createOrderFromCart({
          userId: userId.toString(),
          addressId: addressId.toString(),
          paymentProvider: "STRIPE",
          idempotencyKey: "idem-key-1",
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should create MasterOrder and split into multi-seller sub-orders accurately", async () => {
      const userId = new Types.ObjectId();
      const addressId = new Types.ObjectId();
      const sellerIdA = new Types.ObjectId();
      const sellerIdB = new Types.ObjectId();

      vi.spyOn(UserModel, "findById").mockResolvedValue({
        _id: userId,
        email: "customer@example.com",
        addresses: [{
          _id: addressId,
          label: "Office",
          street: "Tech Park 4",
          city: "Bengaluru",
          state: "KA",
          postalCode: "560001",
          country: "India",
          phone: "9876543210"
        }],
      } as any);

      const cartItems = [
        { productId: new Types.ObjectId().toString(), sku: "SKU-A", quantity: 2 },
        { productId: new Types.ObjectId().toString(), sku: "SKU-B", quantity: 1 },
      ];

      const mockCartDoc = {
        userId,
        items: [...cartItems],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(CartModel, "findOne").mockResolvedValue(mockCartDoc as any);

      mockPricing.calculateOrderPrice.mockResolvedValue({
        items: [],
        sellerBreakdowns: [
          {
            sellerId: sellerIdA.toString(),
            storeName: "Seller A Tech",
            commissionRate: 10,
            items: [{
              productId: cartItems[0].productId,
              sku: "SKU-A",
              title: "Mechanical Keyboard",
              variantTitle: "RGB Red Switch",
              unitPriceMinor: 500000,
              quantity: 2,
              taxMinor: 180000,
              totalMinor: 1180000,
            }],
            subtotalMinor: 1000000,
            taxMinor: 180000,
            shippingMinor: 5000,
            totalMinor: 1185000,
            commissionMinor: 100000,
            sellerPayoutMinor: 1085000,
          },
          {
            sellerId: sellerIdB.toString(),
            storeName: "Seller B Apparel",
            commissionRate: 15,
            items: [{
              productId: cartItems[1].productId,
              sku: "SKU-B",
              title: "Cotton T-Shirt",
              variantTitle: "Navy M",
              unitPriceMinor: 100000,
              quantity: 1,
              taxMinor: 18000,
              totalMinor: 118000,
            }],
            subtotalMinor: 100000,
            taxMinor: 18000,
            shippingMinor: 5000,
            totalMinor: 123000,
            commissionMinor: 15000,
            sellerPayoutMinor: 108000,
          },
        ],
        totalItemsCount: 3,
        subtotalMinor: 1100000,
        taxMinor: 198000,
        shippingMinor: 10000,
        discountMinor: 0,
        grandTotalMinor: 1308000,
      });

      const result = await orderService.createOrderFromCart({
        userId: userId.toString(),
        addressId: addressId.toString(),
        paymentProvider: "STRIPE",
        idempotencyKey: "idem_checkout_multi_1",
      });

      expect(mockInventory.reserveStock).toHaveBeenCalledWith([
        { sku: "SKU-A", quantity: 2 },
        { sku: "SKU-B", quantity: 1 },
      ]);

      expect(mockRepository.createSellerOrders).toHaveBeenCalledTimes(1);
      const sellerOrdersArg = mockRepository.createSellerOrders.mock.calls[0][0];
      expect(sellerOrdersArg).toHaveLength(2);
      expect(sellerOrdersArg[0].subtotalMinor).toBe(1000000);
      expect(sellerOrdersArg[0].sellerPayoutMinor).toBe(1085000);
      expect(sellerOrdersArg[1].subtotalMinor).toBe(100000);
      expect(sellerOrdersArg[1].sellerPayoutMinor).toBe(108000);

      expect(mockRepository.createMasterOrder).toHaveBeenCalledTimes(1);
      const masterOrderArg = mockRepository.createMasterOrder.mock.calls[0][0];
      expect(masterOrderArg.grandTotalMinor).toBe(1308000);
      expect(masterOrderArg.paymentStatus).toBe("PENDING");
      expect(masterOrderArg.subOrderIds).toHaveLength(2);

      // Cart cleared
      expect(mockCartDoc.items).toHaveLength(0);
      expect(mockCartDoc.save).toHaveBeenCalled();

      // Payment initiated
      expect(result.paymentClientSecret).toBe("pi_test_secret_123");
      expect(mockEventBus.publish).toHaveBeenCalledWith("order.created", expect.any(Object));
    });

    it("should rollback reserved inventory when payment initiation fails", async () => {
      const userId = new Types.ObjectId();
      const addressId = new Types.ObjectId();

      vi.spyOn(UserModel, "findById").mockResolvedValue({
        _id: userId,
        email: "customer@example.com",
        addresses: [{ _id: addressId, street: "St", city: "City", state: "ST", postalCode: "000000", country: "IN" }],
      } as any);

      vi.spyOn(CartModel, "findOne").mockResolvedValue({
        userId,
        items: [{ productId: "p1", sku: "SKU-FAIL", quantity: 1 }],
        save: vi.fn(),
      } as any);

      mockPricing.calculateOrderPrice.mockResolvedValue({
        items: [],
        sellerBreakdowns: [],
        totalItemsCount: 1,
        subtotalMinor: 1000,
        taxMinor: 180,
        shippingMinor: 50,
        discountMinor: 0,
        grandTotalMinor: 1230,
      });

      mockPayment.initiatePayment.mockRejectedValue(new Error("Gateway connection timeout"));

      await expect(
        orderService.createOrderFromCart({
          userId: userId.toString(),
          addressId: addressId.toString(),
          paymentProvider: "STRIPE",
          idempotencyKey: "idem_fail",
        })
      ).rejects.toThrow("Gateway connection timeout");

      expect(mockInventory.rollbackReservation).toHaveBeenCalledWith([
        { sku: "SKU-FAIL", quantity: 1 },
      ]);
    });

    it("should reject invalid fulfillment state transitions for seller sub-orders", async () => {
      const sellerUserId = new Types.ObjectId();
      const sellerId = new Types.ObjectId();
      const subOrderId = new Types.ObjectId();

      vi.spyOn(SellerModel, "findOne").mockResolvedValue({
        _id: sellerId,
        userId: sellerUserId,
      } as any);

      mockRepository.findSellerOrderById.mockResolvedValue({
        _id: subOrderId,
        sellerId,
        status: "DELIVERED", // Already delivered!
      });

      // Attempting to move back to PROCESSING
      await expect(
        orderService.updateSellerOrderStatus({
          sellerUserId: sellerUserId.toString(),
          subOrderId: subOrderId.toString(),
          newStatus: "PROCESSING",
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("PaymentService", () => {
    let paymentService: PaymentService;
    let mockInventory: any;
    let mockEventBus: any;

    beforeEach(() => {
      mockInventory = {
        commitReservation: vi.fn().mockResolvedValue(true),
        rollbackReservation: vi.fn().mockResolvedValue(true),
      };
      mockEventBus = {
        publish: vi.fn(),
      };
      paymentService = new PaymentService(mockInventory, mockEventBus);
    });

    it("should reuse existing payment session on idempotent retry", async () => {
      const existingPayment = {
        _id: new Types.ObjectId(),
        idempotencyKey: "idem_abc",
        gatewayTransactionId: "pi_existing_123",
        amountMinor: 5000,
      };

      vi.spyOn(PaymentModel, "findOne").mockResolvedValue(existingPayment as any);

      const result = await paymentService.initiatePayment({
        orderId: new Types.ObjectId().toString(),
        orderNumber: "ORD-TEST-001",
        amountMinor: 5000,
        currency: "INR",
        customerId: new Types.ObjectId().toString(),
        customerEmail: "user@test.com",
        idempotencyKey: "idem_abc",
        provider: "STRIPE",
      });

      expect(result.clientSecret).toBe("pi_existing_123");
    });

    it("should commit stock and confirm seller sub-orders upon successful payment webhook", async () => {
      const paymentId = new Types.ObjectId();
      const masterOrderId = new Types.ObjectId();

      const paymentDoc = {
        _id: paymentId,
        masterOrderId,
        provider: "STRIPE",
        status: "INITIATED",
        save: vi.fn().mockResolvedValue(true),
      };

      const masterOrderDoc = {
        _id: masterOrderId,
        orderNumber: "ORD-20261003-1001",
        customerId: new Types.ObjectId(),
        grandTotalMinor: 50000,
        paymentStatus: "PENDING",
        save: vi.fn().mockResolvedValue(true),
      };

      const sellerOrderDoc = {
        _id: new Types.ObjectId(),
        masterOrderId,
        items: [{ sku: "SKU-COMMIT", quantity: 3 }],
        status: "PENDING",
        statusHistory: [],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(PaymentModel, "findOne").mockResolvedValue(paymentDoc as any);
      vi.spyOn(MasterOrderModel, "findById").mockReturnValue({
        populate: vi.fn().mockResolvedValue(masterOrderDoc),
      } as any);
      vi.spyOn(SellerOrderModel, "find").mockResolvedValue([sellerOrderDoc] as any);

      // Trigger webhook verification
      const webhookPayload = {
        id: "evt_123",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_123",
            status: "succeeded",
          },
        },
      };

      const result = await paymentService.handleWebhook("STRIPE", webhookPayload, "test_sig");

      expect(result.status).toBe("CAPTURED");
      expect(paymentDoc.status).toBe("CAPTURED");
      expect(masterOrderDoc.paymentStatus).toBe("PAID");
      expect(mockInventory.commitReservation).toHaveBeenCalledWith([
        { sku: "SKU-COMMIT", quantity: 3 },
      ]);
      expect(sellerOrderDoc.status).toBe("CONFIRMED");
      expect(mockEventBus.publish).toHaveBeenCalledWith("order.paid", expect.any(Object));
    });
  });
});
