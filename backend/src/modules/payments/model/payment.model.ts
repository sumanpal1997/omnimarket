import mongoose, { Schema, Document, Types } from "mongoose";

export type PaymentProvider = "STRIPE" | "RAZORPAY";
export type PaymentStatus = "INITIATED" | "REQUIRES_ACTION" | "CAPTURED" | "FAILED" | "REFUNDED";

export interface IPayment extends Document {
  _id: Types.ObjectId;
  masterOrderId: Types.ObjectId;
  customerId: Types.ObjectId;
  provider: PaymentProvider;
  gatewayTransactionId: string;
  idempotencyKey: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  rawWebhookPayload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    masterOrderId: {
      type: Schema.Types.ObjectId,
      ref: "MasterOrder",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["STRIPE", "RAZORPAY"],
      required: true,
    },
    gatewayTransactionId: {
      type: String,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["INITIATED", "REQUIRES_ACTION", "CAPTURED", "FAILED", "REFUNDED"],
      default: "INITIATED",
      index: true,
    },
    rawWebhookPayload: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const PaymentModel = mongoose.model<IPayment>("Payment", PaymentSchema);
