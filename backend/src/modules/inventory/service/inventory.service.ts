import { ClientSession, Types } from "mongoose";
import { inventoryRepository, InventoryRepository } from "../repository/inventory.repository.js";
import { ConflictError, NotFoundError, BadRequestError } from "../../../core/errors/app-error.js";
import { IInventory } from "../model/inventory.model.js";
import { logger } from "../../../core/logger/logger.js";

export interface StockReservationItem {
  sku: string;
  quantity: number;
}

export class InventoryService {
  constructor(private repo: InventoryRepository = inventoryRepository) {}

  public async initializeStock(
    productId: string | Types.ObjectId,
    sellerId: string | Types.ObjectId,
    items: Array<{ sku: string; stock: number; lowStockThreshold?: number }>,
    session?: ClientSession
  ): Promise<IInventory[]> {
    const results: IInventory[] = [];
    for (const item of items) {
      const existing = await this.repo.findBySku(item.sku);
      if (existing) {
        throw new ConflictError(`Inventory record for SKU ${item.sku} already exists`);
      }

      const inv = await this.repo.create(
        {
          productId: new Types.ObjectId(productId),
          sellerId: new Types.ObjectId(sellerId),
          sku: item.sku,
          stock: item.stock,
          reserved: 0,
          lowStockThreshold: item.lowStockThreshold ?? 5,
        },
        session
      );
      results.push(inv);
    }
    return results;
  }

  /**
   * Reserves stock for multiple items atomically.
   * If any item in the order has insufficient stock, any previously reserved items
   * are immediately rolled back and a ConflictError is thrown.
   */
  public async reserveStock(
    items: StockReservationItem[],
    session?: ClientSession
  ): Promise<void> {
    const successfullyReserved: StockReservationItem[] = [];

    for (const item of items) {
      if (item.quantity <= 0) {
        throw new BadRequestError(`Invalid reservation quantity for SKU ${item.sku}`);
      }

      const updated = await this.repo.atomicReserve(item.sku, item.quantity, session);

      if (!updated) {
        // Rollback previously acquired items in this transaction
        logger.warn(
          { failedSku: item.sku, requestedQty: item.quantity },
          "Insufficient stock during reservation. Initiating compensatory rollback."
        );
        for (const reserved of successfullyReserved) {
          await this.repo.atomicRollback(reserved.sku, reserved.quantity, session);
        }
        throw new ConflictError(
          `Insufficient inventory available for SKU: ${item.sku}. Requested: ${item.quantity}`
        );
      }

      successfullyReserved.push(item);
    }
  }

  /**
   * Commits previously reserved inventory upon successful payment confirmation.
   */
  public async commitReservation(
    items: StockReservationItem[],
    session?: ClientSession
  ): Promise<void> {
    for (const item of items) {
      const committed = await this.repo.atomicCommit(item.sku, item.quantity, session);
      if (!committed) {
        logger.error(
          { sku: item.sku, quantity: item.quantity },
          "Failed to commit inventory reservation. Discrepancy detected!"
        );
      }
    }
  }

  /**
   * Releases reserved stock back into physical stock on checkout abandonment or payment failure.
   */
  public async rollbackReservation(
    items: StockReservationItem[],
    session?: ClientSession
  ): Promise<void> {
    for (const item of items) {
      await this.repo.atomicRollback(item.sku, item.quantity, session);
    }
  }

  public async getStockBySku(sku: string): Promise<IInventory> {
    const inv = await this.repo.findBySku(sku);
    if (!inv) {
      throw new NotFoundError(`No inventory record found for SKU ${sku}`);
    }
    return inv;
  }

  public async adjustStock(
    sku: string,
    delta: number,
    session?: ClientSession
  ): Promise<IInventory> {
    const updated = await this.repo.atomicAdjust(sku, delta, session);
    if (!updated) {
      throw new ConflictError(
        `Unable to adjust stock for SKU ${sku}. Operation would result in negative inventory.`
      );
    }
    return updated;
  }
}

export const inventoryService = new InventoryService();
