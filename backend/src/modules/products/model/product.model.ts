import mongoose, { Schema, Document, Types } from "mongoose";

export type ProductStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED";

export interface IProductVariant {
  _id?: Types.ObjectId;
  sku: string; // Unique SKU across entire platform
  title: string; // e.g. "Space Gray / 256GB"
  priceMinor: number; // Integer minor currency units (paise/cents)
  compareAtPriceMinor?: number; // Optional strikethrough MRP
  attributes: Record<string, string>; // e.g. { color: "Gray", size: "M" }
  images: string[];
  isActive: boolean;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;
  categoryId: Types.ObjectId;
  brandId?: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  images: string[];
  status: ProductStatus;
  rejectionReason?: string;
  variants: IProductVariant[];
  ratingSummary: {
    averageRating: number;
    totalReviews: number;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    priceMinor: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPriceMinor: {
      type: Number,
      min: 0,
    },
    attributes: {
      type: Map,
      of: String,
      default: {},
    },
    images: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const ProductSchema = new Schema<IProduct>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      index: true,
    },
    title: {
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
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    rejectionReason: {
      type: String,
    },
    variants: {
      type: [ProductVariantSchema],
      validate: [
        (v: IProductVariant[]) => Array.isArray(v) && v.length > 0,
        "Product must contain at least one variant",
      ],
    },
    ratingSummary: {
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0, min: 0 },
    },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for accelerated catalog browsing & merchant filtering
ProductSchema.index({ status: 1, categoryId: 1, "variants.priceMinor": 1 });
ProductSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
ProductSchema.index({ "variants.sku": 1 }, { unique: true });

// Full-text search index for catalog keywords
ProductSchema.index({ title: "text", description: "text" });

export const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);
