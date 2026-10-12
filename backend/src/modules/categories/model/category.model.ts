import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICategoryAncestor {
  _id: Types.ObjectId;
  name: string;
  slug: string;
}

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  parentId?: Types.ObjectId;
  ancestors: ICategoryAncestor[]; // Materialized path pattern for fast hierarchical queries
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
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
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    ancestors: [
      {
        _id: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true },
      },
    ],
    imageUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for rendering active subcategories
CategorySchema.index({ parentId: 1, isActive: 1 });

export const CategoryModel = mongoose.model<ICategory>("Category", CategorySchema);
