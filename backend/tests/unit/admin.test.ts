import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { AdminService } from "../../src/modules/admins/service/admin.service.js";
import { SellerModel } from "../../src/modules/sellers/model/seller.model.js";
import { ProductModel } from "../../src/modules/products/model/product.model.js";
import { UserModel } from "../../src/modules/users/model/user.model.js";
import { MasterOrderModel, SellerOrderModel } from "../../src/modules/orders/model/order.model.js";

describe("Admin Module Unit Tests", () => {
  let adminService: AdminService;
  let mockAuditLog: any;
  let mockEventBus: any;

  beforeEach(() => {
    mockAuditLog = {
      record: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    adminService = new AdminService(mockAuditLog, mockEventBus);
  });

  describe("getPlatformAnalytics", () => {
    it("should compute aggregated GMV, commissions, payouts, and role counts", async () => {
      vi.spyOn(MasterOrderModel, "aggregate").mockResolvedValue([
        {
          gmv: [{ totalGMV: 15000000 }], // ₹150,000.00
          ordersCount: [
            { _id: "PAID", count: 12 },
            { _id: "PENDING", count: 3 },
          ],
        },
      ] as any);

      vi.spyOn(SellerOrderModel, "aggregate").mockResolvedValue([
        {
          _id: null,
          totalCommission: 1500000, // ₹15,000.00 (10%)
          totalPayouts: 13500000,
        },
      ] as any);

      vi.spyOn(UserModel, "aggregate").mockResolvedValue([
        { _id: "CUSTOMER", count: 85 },
        { _id: "SELLER", count: 10 },
        { _id: "ADMIN", count: 2 },
      ] as any);

      vi.spyOn(SellerModel, "aggregate").mockResolvedValue([
        { _id: "ACTIVE", count: 8 },
        { _id: "PENDING", count: 2 },
      ] as any);

      vi.spyOn(ProductModel, "aggregate").mockResolvedValue([
        { _id: "APPROVED", count: 45 },
        { _id: "SUBMITTED", count: 5 },
      ] as any);

      vi.spyOn(MasterOrderModel, "find").mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const analytics = await adminService.getPlatformAnalytics();

      expect(analytics.financials.gmvMinor).toBe(15000000);
      expect(analytics.financials.platformCommissionMinor).toBe(1500000);
      expect(analytics.financials.merchantPayoutsMinor).toBe(13500000);
      expect(analytics.orders.total).toBe(15);
      expect(analytics.orders.paid).toBe(12);
      expect(analytics.users.total).toBe(97);
      expect(analytics.sellers.active).toBe(8);
      expect(analytics.sellers.pendingKYC).toBe(2);
      expect(analytics.products.approved).toBe(45);
      expect(analytics.products.pendingModeration).toBe(5);
    });
  });

  describe("moderateSeller", () => {
    it("should approve pending seller, upgrade user role, and write audit log", async () => {
      const sellerId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const adminId = new Types.ObjectId().toString();

      const sellerDoc = {
        _id: sellerId,
        userId,
        status: "PENDING",
        commissionRate: 10,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(SellerModel, "findById").mockResolvedValue(sellerDoc as any);
      vi.spyOn(UserModel, "findByIdAndUpdate").mockResolvedValue({} as any);

      const result = await adminService.moderateSeller({
        adminId,
        sellerId: sellerId.toString(),
        action: "APPROVE",
        commissionRate: 12,
      });

      expect(result.status).toBe("ACTIVE");
      expect(result.commissionRate).toBe(12);
      expect(sellerDoc.save).toHaveBeenCalled();
      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, { role: "SELLER" });
      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: adminId,
          actorRole: "ADMIN",
          action: "SELLER_APPROVE",
          resource: "Seller",
          resourceId: sellerId.toString(),
        })
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith("seller.moderated", expect.any(Object));
    });

    it("should reject seller with compliance audit reasoning", async () => {
      const sellerId = new Types.ObjectId();
      const adminId = new Types.ObjectId().toString();

      const sellerDoc = {
        _id: sellerId,
        status: "PENDING",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(SellerModel, "findById").mockResolvedValue(sellerDoc as any);

      const result = await adminService.moderateSeller({
        adminId,
        sellerId: sellerId.toString(),
        action: "REJECT",
        reason: "Invalid GST registration document",
      });

      expect(result.status).toBe("REJECTED");
      expect(sellerDoc.save).toHaveBeenCalled();
      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SELLER_REJECT",
          metadata: expect.objectContaining({
            reason: "Invalid GST registration document",
          }),
        })
      );
    });
  });

  describe("moderateProduct", () => {
    it("should approve product to catalog and log audit action", async () => {
      const productId = new Types.ObjectId();
      const adminId = new Types.ObjectId().toString();

      const productDoc = {
        _id: productId,
        status: "SUBMITTED",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(ProductModel, "findById").mockResolvedValue(productDoc as any);

      const result = await adminService.moderateProduct({
        adminId,
        productId: productId.toString(),
        action: "APPROVE",
      });

      expect(result.status).toBe("APPROVED");
      expect(productDoc.save).toHaveBeenCalled();
      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PRODUCT_APPROVE",
          resource: "Product",
          resourceId: productId.toString(),
        })
      );
    });
  });

  describe("toggleUserStatus", () => {
    it("should suspend user and increment tokenVersion to revoke all active sessions", async () => {
      const userId = new Types.ObjectId();
      const adminId = new Types.ObjectId().toString();

      vi.spyOn(UserModel, "findByIdAndUpdate").mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: userId,
          status: "SUSPENDED",
          tokenVersion: 2,
        }),
      } as any);

      const result = await adminService.toggleUserStatus({
        adminId,
        userId: userId.toString(),
        isActive: false,
        reason: "Suspicious checkout bot activity",
      });

      expect(result.status).toBe("SUSPENDED");
      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId.toString(),
        {
          $set: { status: "SUSPENDED" },
          $inc: { tokenVersion: 1 },
        },
        { new: true }
      );
      expect(mockAuditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_SUSPEND",
          metadata: expect.objectContaining({
            sessionsRevoked: true,
          }),
        })
      );
    });
  });
});
