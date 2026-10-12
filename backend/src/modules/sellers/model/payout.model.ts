import mongoose, { Schema, Document, Types } from "mongoose";

export type PayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";

export interface IPayout extends Document {
  _id: Types.ObjectId;
  payoutNumber: string; // e.g. "PAY-20261004-9812"
  sellerId: Types.ObjectId;
  amountMinor: number; // Integer minor currency units (paise/cents)
  currency: string;
  status: PayoutStatus;
  bankAccount: {
    bankName: string;
    accountNumberMasked: string;
    routingCode: string;
  };
  ordersIncluded: Types.ObjectId[]; // References to SellerOrder _id
  transactionReference?: string; // UTR / Bank transfer reference
  failureReason?: string;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    payoutNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PAID", "FAILED"],
      default: "PENDING",
      index: true,
    },
    bankAccount: {
      bankName: { type: String, required: true },
      accountNumberMasked: { type: String, required: true },
      routingCode: { type: String, required: true },
    },
    ordersIncluded: [
      {
        type: Schema.Types.ObjectId,
        ref: "SellerOrder",
      },
    ],
    transactionReference: {
      type: String,
    },
    failureReason: {
      type: String,
    },
    settledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

PayoutSchema.index({ sellerId: 1, createdAt: -1 });

export const PayoutModel = mongoose.model<IPayout>("Payout", PayoutSchema);
