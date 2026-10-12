import { Request, Response, NextFunction } from "express";
import { wishlistService, WishlistService } from "../service/wishlist.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";

export class WishlistController {
  constructor(private service: WishlistService = wishlistService) {}

  public getWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const wishlist = await this.service.getWishlist(req.user!.id);
      ResponseUtil.sendSuccess(res, { wishlist }, "Wishlist retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  public toggleProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { inWishlist, wishlist } = await this.service.toggleProduct(
        req.user!.id,
        req.params.productId
      );
      ResponseUtil.sendSuccess(
        res,
        { inWishlist, wishlist },
        inWishlist ? "Product added to wishlist" : "Product removed from wishlist"
      );
    } catch (error) {
      next(error);
    }
  };
}

export const wishlistController = new WishlistController();
