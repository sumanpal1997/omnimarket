import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReview extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  customerId: Types.ObjectId;
  orderId?: Types.ObjectId;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  images: string[];
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  helpfulVotedUsers: Types.ObjectId[];
  status: "PUBLISHED" | "FLAGGED" | "HIDDEN";
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "SellerOrder",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    images: {
      type: [String],
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
    },
    helpfulVotedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["PUBLISHED", "FLAGGED", "HIDDEN"],
      default: "PUBLISHED",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: One review per customer per product
ReviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });

// Compound index for product reviews feed
ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export const ReviewModel = mongoose.model<IReview>("Review", ReviewSchema);
