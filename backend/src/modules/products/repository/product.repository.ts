import { FilterQuery, Types, ClientSession } from "mongoose";
import { ProductModel, IProduct, ProductStatus } from "../model/product.model.js";

export interface CatalogQueryFilters {
  status?: ProductStatus;
  categoryId?: string | Types.ObjectId | any;
  brandId?: string | Types.ObjectId;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: "price_asc" | "price_desc" | "newest" | "rating";
}

export class ProductRepository {
  public async create(data: Partial<IProduct>, session?: ClientSession): Promise<IProduct> {
    const product = new ProductModel(data);
    return product.save({ session });
  }

  public async findById(id: string | Types.ObjectId): Promise<IProduct | null> {
    return ProductModel.findById(id)
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug")
      .populate("sellerId", "storeName slug status");
  }

  public async findBySlug(slug: string): Promise<IProduct | null> {
    return ProductModel.findOne({ slug })
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug")
      .populate("sellerId", "storeName slug status");
  }

  public async findSellerProducts(
    sellerId: string | Types.ObjectId,
    status?: ProductStatus,
    page = 1,
    limit = 20
  ): Promise<{ items: IProduct[]; total: number }> {
    const query: FilterQuery<IProduct> = { sellerId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ProductModel.countDocuments(query),
    ]);

    return { items, total };
  }

  public async findCatalog(
    filters: CatalogQueryFilters,
    page = 1,
    limit = 20
  ): Promise<{ items: IProduct[]; total: number }> {
    const query: FilterQuery<IProduct> = {
      status: "APPROVED", // Only approved products appear in the public catalog
    };

    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.brandId) query.brandId = filters.brandId;

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query["variants.priceMinor"] = {};
      if (filters.minPrice !== undefined) query["variants.priceMinor"].$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) query["variants.priceMinor"].$lte = filters.maxPrice;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    const sortOptions: Record<string, 1 | -1> = {};
    if (filters.sort === "price_asc") sortOptions["variants.0.priceMinor"] = 1;
    else if (filters.sort === "price_desc") sortOptions["variants.0.priceMinor"] = -1;
    else if (filters.sort === "rating") sortOptions["ratingSummary.averageRating"] = -1;
    else sortOptions.createdAt = -1; // newest

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ProductModel.find(query)
        .populate("categoryId", "name slug")
        .populate("brandId", "name slug")
        .populate("sellerId", "storeName slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      ProductModel.countDocuments(query),
    ]);

    return { items, total };
  }

  public async updateStatus(
    id: string | Types.ObjectId,
    status: ProductStatus,
    rejectionReason?: string
  ): Promise<IProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      {
        status,
        ...(rejectionReason ? { rejectionReason } : { $unset: { rejectionReason: 1 } }),
      },
      { new: true }
    );
  }

  public async update(
    id: string | Types.ObjectId,
    data: Partial<IProduct>
  ): Promise<IProduct | null> {
    return ProductModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }
}

export const productRepository = new ProductRepository();
