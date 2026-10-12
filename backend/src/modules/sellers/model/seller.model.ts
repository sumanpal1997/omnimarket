import mongoose, { Schema, Document, Types } from "mongoose";

export type SellerStatus =
  | "PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "BLOCKED"
  | "REJECTED";

export interface IBusinessInfo {
  legalName: string;
  registrationNumber: string;
  taxId: string; // GSTIN / VAT
  address: string;
}

export interface IBankAccount {
  bankName: string;
  accountNumberMasked: string; // Only last 4 visible, e.g. "••••••••1234"
  routingCode: string; // IFSC / SWIFT / ABA
}

export interface ISeller extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  businessInfo: IBusinessInfo;
  bankAccount: IBankAccount;
  commissionRate: number; // e.g. 10 for 10%
  status: SellerStatus;
  rejectionReason?: string;
  suspendedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessInfoSchema = new Schema<IBusinessInfo>(
  {
    legalName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true },
    taxId: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const BankAccountSchema = new Schema<IBankAccount>(
  {
    bankName: { type: String, required: true, trim: true },
    accountNumberMasked: { type: String, required: true, trim: true },
    routingCode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const SellerSchema = new Schema<ISeller>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    bannerUrl: {
      type: String,
      trim: true,
    },
    businessInfo: {
      type: BusinessInfoSchema,
      required: true,
    },
    bankAccount: {
      type: BankAccountSchema,
      required: true,
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "ACTIVE", "SUSPENDED", "BLOCKED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    suspendedReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for administrative filtering of moderation applications
SellerSchema.index({ status: 1, createdAt: -1 });

export const SellerModel = mongoose.model<ISeller>("Seller", SellerSchema);
