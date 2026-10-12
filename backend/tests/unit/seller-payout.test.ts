import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { SellerPayoutService } from "../../src/modules/sellers/service/seller-payout.service.js";
import { SellerModel } from "../../src/modules/sellers/model/seller.model.js";
import { PayoutModel } from "../../src/modules/sellers/model/payout.model.js";
import { SellerOrderModel } from "../../src/modules/orders/model/order.model.js";
import { ProductModel } from "../../src/modules/products/model/product.model.js";
import { BadRequestError } from "../../src/core/errors/app-error.js";

describe("Seller Analytics & Payout Engine Unit Tests", () => {
  let payoutService: SellerPayoutService;
  let mockEventBus: any;

  beforeEach(() => {
    mockEventBus = {
      publish: vi.fn(),
    };
    payoutService = new SellerPayoutService(mockEventBus);
  });

  describe("getSellerAnalytics", () => {
    it("should aggregate gross sales, platform fees, available escrow balance, and top products", async () => {
      const sellerId = new Types.ObjectId();
      const userId = new Types.ObjectId().toString();

      vi.spyOn(SellerModel, "findOne").mockResolvedValue({
        _id: sellerId,
        userId,
        storeName: "Peak Tech",
        slug: "peak-tech",
        commissionRate: 10,
        bankAccount: {
          bankName: "HDFC Bank",
          accountNumberMasked: "••••••••9876",
          routingCode: "HDFC0001234",
        },
      } as any);

      vi.spyOn(SellerOrderModel, "aggregate").mockImplementation((pipeline: any[]) => {
        // First aggregate call is order stats
        if (pipeline.length === 2 && pipeline[1].$group) {
          return Promise.resolve([
            {
              _id: "DELIVERED",
              count: 5,
              subtotalMinor: 5000000, // ₹50,000
              commissionMinor: 500000, // ₹5,000 (10%)
              payoutMinor: 4500000, // ₹45,000
            },
            {
              _id: "SHIPPED",
              count: 2,
              subtotalMinor: 2000000,
              commissionMinor: 200000,
              payoutMinor: 1800000,
            },
          ]);
        }
        // Second aggregate call is top-selling products
        return Promise.resolve([
          {
            _id: { sku: "TECH-01", title: "Wireless Mouse" },
            totalQuantitySold: 15,
            totalRevenueMinor: 3000000,
          },
        ]);
      });

      const deliveredOrder1 = { _id: new Types.ObjectId(), sellerPayoutMinor: 2500000 };
      const deliveredOrder2 = { _id: new Types.ObjectId(), sellerPayoutMinor: 2000000 };

      // Existing payouts: 1 settled payout of ₹20,000 including deliveredOrder2
      vi.spyOn(PayoutModel, "find").mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          ordersIncluded: [deliveredOrder2._id],
          amountMinor: 2000000,
          status: "PAID",
        },
      ] as any);

      vi.spyOn(SellerOrderModel, "find").mockResolvedValue([
        deliveredOrder1,
        deliveredOrder2,
      ] as any);

      vi.spyOn(ProductModel, "countDocuments").mockResolvedValue(12);
      vi.spyOn(ProductModel, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([
          {
            variants: [{ stock: 3 }, { stock: 15 }], // 1 low stock
          },
        ]),
      } as any);

      const analytics = await payoutService.getSellerAnalytics(userId);

      expect(analytics.financials.lifetimeGrossSalesMinor).toBe(7000000);
      expect(analytics.financials.lifetimePlatformCommissionMinor).toBe(700000);
      expect(analytics.financials.lifetimeNetEarningsMinor).toBe(6300000);
      // available escrow is deliveredOrder1 since deliveredOrder2 was already settled
      expect(analytics.financials.availableEscrowBalanceMinor).toBe(2500000);
      expect(analytics.financials.settledPayoutsMinor).toBe(2000000);
      expect(analytics.orders.delivered).toBe(5);
      expect(analytics.orders.shipped).toBe(2);
      expect(analytics.products.lowStockCount).toBe(1);
      expect(analytics.topProducts).toHaveLength(1);
      expect(analytics.topProducts[0].sku).toBe("TECH-01");
    });
  });

  describe("requestPayout", () => {
    it("should throw BadRequestError if eligible escrow balance is below threshold", async () => {
      const sellerId = new Types.ObjectId();
      const userId = new Types.ObjectId().toString();

      vi.spyOn(SellerModel, "findOne").mockResolvedValue({
        _id: sellerId,
        userId,
      } as any);

      vi.spyOn(PayoutModel, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      } as any);

      // Only ₹500 (50,000 paise) available, below ₹1,000 min threshold
      vi.spyOn(SellerOrderModel, "find").mockResolvedValue([
        { _id: new Types.ObjectId(), sellerPayoutMinor: 50000 },
      ] as any);

      await expect(payoutService.requestPayout(userId)).rejects.toThrow(BadRequestError);
    });

    it("should create payout batch, link orders, and publish event on eligible balance", async () => {
      const sellerId = new Types.ObjectId();
      const userId = new Types.ObjectId().toString();
      const orderId1 = new Types.ObjectId();
      const orderId2 = new Types.ObjectId();

      vi.spyOn(SellerModel, "findOne").mockResolvedValue({
        _id: sellerId,
        userId,
        bankAccount: {
          bankName: "State Bank of India",
          accountNumberMasked: "••••••••1122",
          routingCode: "SBIN0000123",
        },
      } as any);

      vi.spyOn(PayoutModel, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(SellerOrderModel, "find").mockResolvedValue([
        { _id: orderId1, sellerPayoutMinor: 150000 }, // ₹1,500
        { _id: orderId2, sellerPayoutMinor: 250000 }, // ₹2,500
      ] as any);

      vi.spyOn(PayoutModel.prototype, "save").mockResolvedValue({} as any);

      const payout = await payoutService.requestPayout(userId);

      expect(payout.amountMinor).toBe(400000); // ₹4,000
      expect(payout.payoutNumber).toMatch(/^PAY-\d{8}-\d{4}$/);
      expect(payout.ordersIncluded).toHaveLength(2);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        "seller.payout_settled",
        expect.objectContaining({
          amountMinor: 400000,
          ordersCount: 2,
        })
      );
    });
  });

  describe("settlePayout", () => {
    it("should update payout to PAID with bank reference", async () => {
      const payoutId = new Types.ObjectId().toString();
      const payoutDoc = {
        _id: payoutId,
        status: "PROCESSING",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(PayoutModel, "findById").mockResolvedValue(payoutDoc as any);

      const result = await payoutService.settlePayout(payoutId, {
        status: "PAID",
        transactionReference: "UTR20261004123456",
      });

      expect(result.status).toBe("PAID");
      expect(payoutDoc.save).toHaveBeenCalled();
    });
  });
});
