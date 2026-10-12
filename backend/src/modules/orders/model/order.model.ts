import mongoose, { Schema, Document, Types } from "mongoose";

export type MasterPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type SellerOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED";

export interface ISellerOrderItem {
  productId: Types.ObjectId;
  sku: string;
  title: string;
  variantTitle: string;
  priceMinor: number;
  quantity: number;
  taxMinor: number;
  totalMinor: number;
  imageUrl?: string;
}

export interface IShippingTracking {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface ISellerOrder extends Document {
  _id: Types.ObjectId;
  masterOrderId: Types.ObjectId;
  sellerId: Types.ObjectId;
  subOrderNumber: string; // e.g. "ORD-20261003-8821-S1"
  items: ISellerOrderItem[];
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  commissionMinor: number; // Platform fee
  sellerPayoutMinor: number; // Payable to merchant
  status: SellerOrderStatus;
  statusHistory: Array<{
    status: SellerOrderStatus;
    timestamp: Date;
    note?: string;
  }>;
  tracking?: IShippingTracking;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMasterOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string; // e.g. "ORD-20261003-8821"
  customerId: Types.ObjectId;
  subOrderIds: Types.ObjectId[]; // Array of ISellerOrder references
  totalItemsCount: number;
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  currency: string;
  paymentStatus: MasterPaymentStatus;
  paymentId?: Types.ObjectId;
  shippingAddress: {
    label: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SellerOrderItemSchema = new Schema<ISellerOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    variantTitle: { type: String, required: true },
    priceMinor: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    taxMinor: { type: Number, required: true },
    totalMinor: { type: Number, required: true },
    imageUrl: { type: String },
  },
  { _id: false }
);

const SellerOrderSchema = new Schema<ISellerOrder>(
  {
    masterOrderId: {
      type: Schema.Types.ObjectId,
      ref: "MasterOrder",
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    subOrderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [SellerOrderItemSchema],
      required: true,
    },
    subtotalMinor: { type: Number, required: true },
    taxMinor: { type: Number, required: true },
    shippingMinor: { type: Number, required: true },
    totalMinor: { type: Number, required: true },
    commissionMinor: { type: Number, required: true },
    sellerPayoutMinor: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "RETURN_REQUESTED",
        "RETURNED",
        "REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    tracking: {
      carrier: { type: String },
      trackingNumber: { type: String },
      trackingUrl: { type: String },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Compound index for seller order management dashboard
SellerOrderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

const MasterOrderSchema = new Schema<IMasterOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subOrderIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "SellerOrder",
      },
    ],
    totalItemsCount: { type: Number, required: true },
    subtotalMinor: { type: Number, required: true },
    taxMinor: { type: Number, required: true },
    shippingMinor: { type: Number, required: true },
    discountMinor: { type: Number, default: 0 },
    grandTotalMinor: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
    shippingAddress: {
      label: { type: String, default: "HOME" },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: "India" },
      phone: { type: String },
    },
  },
  { timestamps: true }
);

// Compound index for customer order history queries
MasterOrderSchema.index({ customerId: 1, createdAt: -1 });

export const SellerOrderModel = mongoose.model<ISellerOrder>("SellerOrder", SellerOrderSchema);
export const MasterOrderModel = mongoose.model<IMasterOrder>("MasterOrder", MasterOrderSchema);
