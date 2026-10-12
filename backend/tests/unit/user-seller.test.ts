import { describe, it, expect, vi, beforeEach } from "vitest";
import { SellerService } from "../../src/modules/sellers/service/seller.service.js";
import { UserService } from "../../src/modules/users/service/user.service.js";
import { ConflictError, BadRequestError } from "../../src/core/errors/app-error.js";
import { Types } from "mongoose";

describe("User & Seller Domain Unit Tests", () => {
  describe("SellerService State Machine", () => {
    const mockSellerRepo = {
      create: vi.fn(),
      findByUserId: vi.fn(),
      findBySlug: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
      listApplications: vi.fn(),
    };

    const mockUserRepo = {
      findById: vi.fn(),
    };

    const mockAuditLogs = {
      record: vi.fn(),
    };

    const mockEventBus = {
      publish: vi.fn(),
    };

    let sellerService: SellerService;

    beforeEach(() => {
      vi.clearAllMocks();
      sellerService = new SellerService(
        mockSellerRepo as any,
        mockUserRepo as any,
        mockAuditLogs as any,
        mockEventBus as any
      );
    });

    it("should reject duplicate application if seller already has pending application", async () => {
      mockSellerRepo.findByUserId.mockResolvedValue({
        status: "PENDING",
      });

      await expect(
        sellerService.apply("user-123", {
          storeName: "Electro Store",
          businessInfo: {
            legalName: "Electro Pvt Ltd",
            registrationNumber: "REG12345",
            taxId: "GST12345",
            address: "123 Tech Park, Bangalore",
          },
          bankAccount: {
            bankName: "HDFC Bank",
            accountNumber: "123456789012",
            routingCode: "HDFC0001234",
          },
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should prevent approving an application that is not in PENDING status", async () => {
      mockSellerRepo.findById.mockResolvedValue({
        _id: new Types.ObjectId(),
        status: "ACTIVE", // Already active
      });

      await expect(
        sellerService.reviewApplication("admin-1", "seller-1", {
          status: "APPROVED",
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should successfully approve PENDING application and promote user to SELLER", async () => {
      const sellerId = new Types.ObjectId();
      const userId = new Types.ObjectId();

      mockSellerRepo.findById.mockResolvedValue({
        _id: sellerId,
        userId,
        storeName: "Fashion Hub",
        status: "PENDING",
      });

      mockSellerRepo.updateStatus.mockResolvedValue({
        _id: sellerId,
        status: "ACTIVE",
      });

      const mockUser = {
        _id: userId,
        role: "CUSTOMER",
        save: vi.fn(),
      };
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await sellerService.reviewApplication("admin-1", sellerId.toString(), {
        status: "APPROVED",
      });

      expect(result.status).toBe("ACTIVE");
      expect(mockUser.role).toBe("SELLER");
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockAuditLogs.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SELLER_APPROVED",
          resource: "Seller",
        })
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith("seller.approved", expect.anything());
    });
  });
});
