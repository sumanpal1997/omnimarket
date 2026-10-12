import { Types } from "mongoose";
import { wishlistRepository, WishlistRepository } from "../repository/wishlist.repository.js";
import { ProductModel } from "../../products/model/product.model.js";
import { NotFoundError } from "../../../core/errors/app-error.js";
import { IWishlist } from "../model/wishlist.model.js";

export class WishlistService {
  constructor(private repo: WishlistRepository = wishlistRepository) {}

  public async getWishlist(userId: string): Promise<IWishlist> {
    let wishlist = await this.repo.findByUserId(userId);
    if (!wishlist) {
      wishlist = await this.repo.create(new Types.ObjectId(userId));
    }
    return wishlist;
  }

  public async toggleProduct(
    userId: string,
    productId: string
  ): Promise<{ inWishlist: boolean; wishlist: IWishlist }> {
    const product = await ProductModel.findById(productId);
    if (!product || product.status !== "APPROVED") {
      throw new NotFoundError("Product not found or unavailable");
    }

    const rawWishlist = await this.repo.getRawByUserId(userId);
    const isPresent = rawWishlist?.productIds.some(
      (id) => id.toString() === productId
    );

    let updated: IWishlist | null;
    let inWishlist: boolean;

    if (isPresent) {
      updated = await this.repo.removeProduct(userId, productId);
      inWishlist = false;
    } else {
      updated = await this.repo.addProduct(userId, productId);
      inWishlist = true;
    }

    const hydrated = await this.repo.findByUserId(userId);

    return {
      inWishlist,
      wishlist: hydrated || updated!,
    };
  }
}

export const wishlistService = new WishlistService();
