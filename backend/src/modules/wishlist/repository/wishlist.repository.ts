import { Types } from "mongoose";
import { WishlistModel, IWishlist } from "../model/wishlist.model.js";

export class WishlistRepository {
  public async findByUserId(userId: string | Types.ObjectId): Promise<IWishlist | null> {
    return WishlistModel.findOne({ userId }).populate({
      path: "productIds",
      select: "title slug images variants ratingSummary status",
      match: { status: "APPROVED" },
    });
  }

  public async getRawByUserId(userId: string | Types.ObjectId): Promise<IWishlist | null> {
    return WishlistModel.findOne({ userId });
  }

  public async create(userId: string | Types.ObjectId): Promise<IWishlist> {
    const wishlist = new WishlistModel({
      userId,
      productIds: [],
    });
    return wishlist.save();
  }

  public async addProduct(
    userId: string | Types.ObjectId,
    productId: string | Types.ObjectId
  ): Promise<IWishlist | null> {
    return WishlistModel.findOneAndUpdate(
      { userId },
      { $addToSet: { productIds: new Types.ObjectId(productId) } },
      { new: true, upsert: true }
    );
  }

  public async removeProduct(
    userId: string | Types.ObjectId,
    productId: string | Types.ObjectId
  ): Promise<IWishlist | null> {
    return WishlistModel.findOneAndUpdate(
      { userId },
      { $pull: { productIds: new Types.ObjectId(productId) } },
      { new: true }
    );
  }
}

export const wishlistRepository = new WishlistRepository();
