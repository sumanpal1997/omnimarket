import { Request, Response, NextFunction } from "express";
import { cartService, CartService } from "../service/cart.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { HttpStatus } from "../../../core/constants/http-status.js";
import crypto from "crypto";

export class CartController {
  constructor(private service: CartService = cartService) {}

  private extractSessionIdentifiers(req: Request) {
    const userId = req.user?.id;
    let guestToken = (req.headers["x-guest-token"] as string) || req.cookies["omni_guest_cart"];

    // If guest with no existing token, issue new UUID
    if (!userId && !guestToken) {
      guestToken = crypto.randomUUID();
    }

    return { userId, guestToken };
  }

  public getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, guestToken } = this.extractSessionIdentifiers(req);
      const cart = await this.service.getCart(userId, guestToken);

      if (!userId && guestToken) {
        res.setHeader("X-Guest-Token", guestToken);
      }

      ResponseUtil.sendSuccess(res, { cart }, "Cart retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  public addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, guestToken } = this.extractSessionIdentifiers(req);
      const cart = await this.service.addItem(userId, guestToken, req.body);

      if (!userId && guestToken) {
        res.setHeader("X-Guest-Token", guestToken);
      }

      ResponseUtil.sendSuccess(res, { cart }, "Item added to cart", HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  public updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, guestToken } = this.extractSessionIdentifiers(req);
      const cart = await this.service.updateItemQuantity(
        userId,
        guestToken,
        req.params.sku,
        req.body.quantity
      );

      ResponseUtil.sendSuccess(res, { cart }, "Cart item updated");
    } catch (error) {
      next(error);
    }
  };

  public removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, guestToken } = this.extractSessionIdentifiers(req);
      const cart = await this.service.removeItem(userId, guestToken, req.params.sku);

      ResponseUtil.sendSuccess(res, { cart }, "Item removed from cart");
    } catch (error) {
      next(error);
    }
  };

  public clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, guestToken } = this.extractSessionIdentifiers(req);
      await this.service.clearCart(userId, guestToken);

      ResponseUtil.sendSuccess(res, null, "Cart cleared successfully");
    } catch (error) {
      next(error);
    }
  };

  public mergeCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const guestToken = req.body.guestToken;

      const cart = await this.service.mergeGuestCart(userId, guestToken);
      ResponseUtil.sendSuccess(res, { cart }, "Guest cart merged successfully");
    } catch (error) {
      next(error);
    }
  };
}

export const cartController = new CartController();
