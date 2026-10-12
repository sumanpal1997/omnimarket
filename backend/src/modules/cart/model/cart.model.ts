import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  sku: string;
  sellerId: Types.ObjectId;
  quantity: number;
}

export interface ICart extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  guestToken?: string;
  items: ICartItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    guestToken: {
      type: String,
    },
    items: {
      type: [CartItemSchema],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: automatically deletes abandoned carts after expiration
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness for user and guest sessions
CartSchema.index({ userId: 1 }, { unique: true, sparse: true });
CartSchema.index({ guestToken: 1 }, { unique: true, sparse: true });

export const CartModel = mongoose.model<ICart>("Cart", CartSchema);
