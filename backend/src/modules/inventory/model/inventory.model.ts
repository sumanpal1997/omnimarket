import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInventory extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  sku: string;
  sellerId: Types.ObjectId;
  stock: number; // Available unreserved stock for purchase
  reserved: number; // Temporarily locked for checkout in-flight
  lowStockThreshold: number;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reserved: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Compound index for seller low-stock alerts
InventorySchema.index({ sellerId: 1, stock: 1 });

export const InventoryModel = mongoose.model<IInventory>("Inventory", InventorySchema);
