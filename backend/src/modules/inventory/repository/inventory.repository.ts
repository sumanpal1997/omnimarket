import { ClientSession, Types } from "mongoose";
import { InventoryModel, IInventory } from "../model/inventory.model.js";

export class InventoryRepository {
  public async create(data: Partial<IInventory>, session?: ClientSession): Promise<IInventory> {
    const inv = new InventoryModel(data);
    return inv.save({ session });
  }

  public async findBySku(sku: string): Promise<IInventory | null> {
    return InventoryModel.findOne({ sku: sku.toUpperCase().trim() });
  }

  public async findByProductId(productId: string | Types.ObjectId): Promise<IInventory[]> {
    return InventoryModel.find({ productId });
  }

  /**
   * Atomic conditional decrement from available stock to reserved stock.
   * Guaranteed concurrency-safe by MongoDB storage engine.
   */
  public async atomicReserve(
    sku: string,
    quantity: number,
    session?: ClientSession
  ): Promise<IInventory | null> {
    return InventoryModel.findOneAndUpdate(
      {
        sku: sku.toUpperCase().trim(),
        stock: { $gte: quantity }, // Condition prevents overselling
      },
      {
        $inc: { stock: -quantity, reserved: quantity },
        $set: { updatedAt: new Date() },
      },
      { new: true, session }
    );
  }

  /**
   * Atomic rollback: releases reserved stock back into available stock.
   */
  public async atomicRollback(
    sku: string,
    quantity: number,
    session?: ClientSession
  ): Promise<IInventory | null> {
    return InventoryModel.findOneAndUpdate(
      {
        sku: sku.toUpperCase().trim(),
        reserved: { $gte: quantity },
      },
      {
        $inc: { reserved: -quantity, stock: quantity },
        $set: { updatedAt: new Date() },
      },
      { new: true, session }
    );
  }

  /**
   * Atomic commit: permanently deducts reserved stock upon payment capture.
   */
  public async atomicCommit(
    sku: string,
    quantity: number,
    session?: ClientSession
  ): Promise<IInventory | null> {
    return InventoryModel.findOneAndUpdate(
      {
        sku: sku.toUpperCase().trim(),
        reserved: { $gte: quantity },
      },
      {
        $inc: { reserved: -quantity },
        $set: { updatedAt: new Date() },
      },
      { new: true, session }
    );
  }

  /**
   * Manual merchant stock adjustment (restock or audit deduction).
   */
  public async atomicAdjust(
    sku: string,
    delta: number,
    session?: ClientSession
  ): Promise<IInventory | null> {
    return InventoryModel.findOneAndUpdate(
      {
        sku: sku.toUpperCase().trim(),
        // If delta is negative, ensure stock doesn't drop below 0
        ...(delta < 0 ? { stock: { $gte: Math.abs(delta) } } : {}),
      },
      {
        $inc: { stock: delta },
        $set: { updatedAt: new Date() },
      },
      { new: true, session }
    );
  }
}

export const inventoryRepository = new InventoryRepository();
