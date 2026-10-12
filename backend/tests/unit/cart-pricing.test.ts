import { describe, it, expect, vi, beforeEach } from "vitest";
import { PricingEngineService } from "../../src/modules/pricing/service/pricing.service.js";
import { CartService } from "../../src/modules/cart/service/cart.service.js";
import { ProductModel } from "../../src/modules/products/model/product.model.js";
import { SellerModel } from "../../src/modules/sellers/model/seller.model.js";
import { ConflictError } from "../../src/core/errors/app-error.js";
import { Types } from "mongoose";

describe("Cart & Centralized Pricing Engine Unit Tests", () => {
  describe("PricingEngineService", () => {
    let pricingEngine: PricingEngineService;

    beforeEach(() => {
      pricingEngine = new PricingEngineService();
    });

    it("should return zero totals for an empty item list", async () => {
      const result = await pricingEngine.calculateOrderPrice([]);
      expect(result.grandTotalMinor).toBe(0);
      expect(result.subtotalMinor).toBe(0);
      expect(result.taxMinor).toBe(0);
      expect(result.shippingMinor).toBe(0);
      expect(result.sellerBreakdowns).toHaveLength(0);
    });

    it("should calculate exact minor units, tax, shipping, and merchant payouts", async () => {
      const sellerId1 = new Types.ObjectId();
      const productId1 = new Types.ObjectId();

      vi.spyOn(ProductModel, "find").mockResolvedValue([
        {
          _id: productId1,
          sellerId: sellerId1,
          title: "Premium Headphones",
          images: ["https://example.com/hp.jpg"],
          status: "APPROVED",
          variants: [
            {
              sku: "HP-01",
              title: "Black",
              priceMinor: 200000, // ₹2,000.00
              images: [],
              isActive: true,
            },
          ],
        } as any,
      ]);

      vi.spyOn(SellerModel, "find").mockResolvedValue([
        {
          _id: sellerId1,
          storeName: "Audio Haven",
          commissionRate: 10, // 10% platform fee
        } as any,
      ]);

      const result = await pricingEngine.calculateOrderPrice([
        {
          productId: productId1.toString(),
          sku: "HP-01",
          quantity: 2, // 2 units @ ₹2,000.00 = ₹4,000.00 (400,000 paise)
        },
      ]);

      // Subtotal = 2 * 200000 = 400000
      expect(result.subtotalMinor).toBe(400000);
      // Tax = 18% of 400000 = 72000
      expect(result.taxMinor).toBe(72000);
      // Shipping: Subtotal (₹4000) >= Free shipping threshold (₹999), so shipping = 0
      expect(result.shippingMinor).toBe(0);
      // Grand Total = 400000 + 72000 + 0 = 472000
      expect(result.grandTotalMinor).toBe(472000);

      // Verify Seller Breakdown
      expect(result.sellerBreakdowns).toHaveLength(1);
      const breakdown = result.sellerBreakdowns[0];
      expect(breakdown.sellerId).toBe(sellerId1.toString());
      expect(breakdown.commissionMinor).toBe(40000); // 10% of 400,000
      // Seller payout = Subtotal (400000) + Tax (72000) + Shipping (0) - Commission (40000) = 432000
      expect(breakdown.sellerPayoutMinor).toBe(432000);
    });
  });

  describe("CartService Stock Validation", () => {
    const mockCartRepo = {
      findByUserId: vi.fn(),
      findByGuestToken: vi.fn(),
      create: vi.fn(),
      deleteById: vi.fn(),
    };

    const mockInventory = {
      getStockBySku: vi.fn(),
      reserveStock: vi.fn(),
      commitReservation: vi.fn(),
      rollbackReservation: vi.fn(),
      adjustStock: vi.fn(),
      initializeStock: vi.fn(),
    };

    const mockPricing = {
      calculateOrderPrice: vi.fn(),
    };

    let cartService: CartService;

    beforeEach(() => {
      vi.clearAllMocks();
      cartService = new CartService(
        mockCartRepo as any,
        mockInventory as any,
        mockPricing as any
      );
    });

    it("should throw ConflictError if requested quantity exceeds available physical stock", async () => {
      const productId = new Types.ObjectId();
      vi.spyOn(ProductModel, "findById").mockResolvedValue({
        _id: productId,
        status: "APPROVED",
        sellerId: new Types.ObjectId(),
        variants: [{ sku: "KB-01", title: "Standard", isActive: true }],
      } as any);

      // Only 2 in stock
      mockInventory.getStockBySku.mockResolvedValue({
        sku: "KB-01",
        stock: 2,
      });

      mockCartRepo.findByUserId.mockResolvedValue({
        _id: new Types.ObjectId(),
        items: [],
        save: vi.fn(),
      });

      // Requesting 5 units
      await expect(
        cartService.addItem("user-1", undefined, {
          productId: productId.toString(),
          sku: "KB-01",
          quantity: 5,
        })
      ).rejects.toThrow(ConflictError);
    });
  });
});
