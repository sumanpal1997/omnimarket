import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryService } from "../../src/modules/inventory/service/inventory.service.js";
import { ProductService } from "../../src/modules/products/service/product.service.js";
import { ConflictError, BadRequestError, ForbiddenError } from "../../src/core/errors/app-error.js";
import { Types } from "mongoose";

describe("Product & Inventory Domain Unit Tests", () => {
  describe("InventoryService Concurrency & Reservation Engine", () => {
    const mockInventoryRepo = {
      create: vi.fn(),
      findBySku: vi.fn(),
      findByProductId: vi.fn(),
      atomicReserve: vi.fn(),
      atomicRollback: vi.fn(),
      atomicCommit: vi.fn(),
      atomicAdjust: vi.fn(),
    };

    let inventoryService: InventoryService;

    beforeEach(() => {
      vi.clearAllMocks();
      inventoryService = new InventoryService(mockInventoryRepo as any);
    });

    it("should successfully reserve multiple items when sufficient inventory exists", async () => {
      mockInventoryRepo.atomicReserve.mockResolvedValue({
        sku: "TEST-SKU",
        stock: 5,
        reserved: 2,
      });

      await expect(
        inventoryService.reserveStock([
          { sku: "SKU-A", quantity: 2 },
          { sku: "SKU-B", quantity: 1 },
        ])
      ).resolves.not.toThrow();

      expect(mockInventoryRepo.atomicReserve).toHaveBeenCalledTimes(2);
      expect(mockInventoryRepo.atomicRollback).not.toHaveBeenCalled();
    });

    it("should atomically rollback acquired items if any subsequent item in order has insufficient stock", async () => {
      // First item succeeds
      mockInventoryRepo.atomicReserve.mockResolvedValueOnce({
        sku: "SKU-A",
        stock: 8,
        reserved: 2,
      });
      // Second item fails due to insufficient inventory
      mockInventoryRepo.atomicReserve.mockResolvedValueOnce(null);

      await expect(
        inventoryService.reserveStock([
          { sku: "SKU-A", quantity: 2 },
          { sku: "SKU-B", quantity: 10 }, // Out of stock
        ])
      ).rejects.toThrow(ConflictError);

      // Verify compensatory rollback was executed for SKU-A
      expect(mockInventoryRepo.atomicRollback).toHaveBeenCalledWith("SKU-A", 2, undefined);
    });
  });

  describe("ProductService Validation & State Transitions", () => {
    const mockProductRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findSellerProducts: vi.fn(),
      findCatalog: vi.fn(),
      updateStatus: vi.fn(),
      update: vi.fn(),
    };

    const mockSellerRepo = {
      findByUserId: vi.fn(),
    };

    const mockInventory = {
      initializeStock: vi.fn(),
      reserveStock: vi.fn(),
      commitReservation: vi.fn(),
      rollbackReservation: vi.fn(),
      getStockBySku: vi.fn(),
      adjustStock: vi.fn(),
    };

    const mockAuditLogs = {
      record: vi.fn(),
    };

    const mockEventBus = {
      publish: vi.fn(),
    };

    let productService: ProductService;

    beforeEach(() => {
      vi.clearAllMocks();
      productService = new ProductService(
        mockProductRepo as any,
        mockSellerRepo as any,
        mockInventory as any,
        mockAuditLogs as any,
        mockEventBus as any
      );
    });

    it("should prevent non-active sellers from creating products", async () => {
      mockSellerRepo.findByUserId.mockResolvedValue({
        status: "PENDING", // Not active yet
      });

      await expect(
        productService.createProduct("user-1", {
          title: "Mechanical Keyboard",
          description: "Premium mechanical gaming keyboard",
          categoryId: "cat-1",
          images: ["https://example.com/img.jpg"],
          variants: [
            {
              sku: "KB-01",
              title: "Standard",
              priceMinor: 4999,
              stock: 10,
              attributes: {},
              images: [],
            },
          ],
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("should reject product creation if duplicate SKUs exist across variants", async () => {
      mockSellerRepo.findByUserId.mockResolvedValue({
        status: "ACTIVE",
        _id: new Types.ObjectId(),
      });

      await expect(
        productService.createProduct("user-1", {
          title: "Mechanical Keyboard",
          description: "Premium mechanical gaming keyboard",
          categoryId: "cat-1",
          images: ["https://example.com/img.jpg"],
          variants: [
            {
              sku: "KB-DUPE",
              title: "Blue Switch",
              priceMinor: 4999,
              stock: 5,
              attributes: {},
              images: [],
            },
            {
              sku: "KB-DUPE", // Duplicate SKU!
              title: "Red Switch",
              priceMinor: 4999,
              stock: 5,
              attributes: {},
              images: [],
            },
          ],
        })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
