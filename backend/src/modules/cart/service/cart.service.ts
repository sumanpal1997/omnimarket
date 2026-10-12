import { Types } from "mongoose";
import { cartRepository, CartRepository } from "../repository/cart.repository.js";
import { ProductModel } from "../../products/model/product.model.js";
import { inventoryService, InventoryService } from "../../inventory/service/inventory.service.js";
import { pricingEngine, PricingEngineService, PricingResult } from "../../pricing/service/pricing.service.js";
import { NotFoundError, BadRequestError, ConflictError } from "../../../core/errors/app-error.js";
import { ICart } from "../model/cart.model.js";

export interface HydratedCart {
  _id: string;
  items: PricingResult["items"];
  pricing: PricingResult;
  updatedAt: Date;
}

export class CartService {
  constructor(
    private cartRepo: CartRepository = cartRepository,
    private inventory: InventoryService = inventoryService,
    private pricing: PricingEngineService = pricingEngine
  ) {}

  public async getCart(userId?: string, guestToken?: string): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(userId, guestToken);

    // Map cart items into pricing engine inputs
    const pricingInputs = cart.items.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      quantity: item.quantity,
    }));

    const pricing = await this.pricing.calculateOrderPrice(pricingInputs);

    return {
      _id: cart._id.toString(),
      items: pricing.items,
      pricing,
      updatedAt: cart.updatedAt,
    };
  }

  public async addItem(
    userId?: string,
    guestToken?: string,
    payload?: { productId: string; sku: string; quantity: number }
  ): Promise<HydratedCart> {
    if (!payload || payload.quantity <= 0) {
      throw new BadRequestError("Valid quantity must be specified");
    }

    // Verify product and variant existence
    const product = await ProductModel.findById(payload.productId);
    if (!product || product.status !== "APPROVED") {
      throw new NotFoundError("Product not found or currently unavailable");
    }

    const variant = product.variants.find((v) => v.sku === payload.sku);
    if (!variant || !variant.isActive) {
      throw new NotFoundError(`Variant SKU ${payload.sku} is not available`);
    }

    // Validate available inventory
    const currentStock = await this.inventory.getStockBySku(payload.sku);
    const cart = await this.getOrCreateCart(userId, guestToken);

    const existingItemIndex = cart.items.findIndex((item) => item.sku === payload.sku);
    const currentCartQty = existingItemIndex >= 0 ? cart.items[existingItemIndex].quantity : 0;
    const requestedTotalQty = currentCartQty + payload.quantity;

    if (requestedTotalQty > currentStock.stock) {
      throw new ConflictError(
        `Insufficient inventory. Only ${currentStock.stock} units available in stock.`
      );
    }

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity = requestedTotalQty;
    } else {
      cart.items.push({
        productId: product._id,
        sku: variant.sku,
        sellerId: product.sellerId,
        quantity: payload.quantity,
      });
    }

    cart.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await cart.save();

    return this.getCart(userId, guestToken);
  }

  public async updateItemQuantity(
    userId: string | undefined,
    guestToken: string | undefined,
    sku: string,
    quantity: number
  ): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(userId, guestToken);
    const itemIndex = cart.items.findIndex((i) => i.sku === sku);

    if (itemIndex === -1) {
      throw new NotFoundError(`Item with SKU ${sku} not found in cart`);
    }

    if (quantity <= 0) {
      // Remove item if quantity is zero or negative
      cart.items.splice(itemIndex, 1);
    } else {
      // Validate against live inventory
      const currentStock = await this.inventory.getStockBySku(sku);
      if (quantity > currentStock.stock) {
        throw new ConflictError(
          `Cannot increase quantity to ${quantity}. Only ${currentStock.stock} units available.`
        );
      }
      cart.items[itemIndex].quantity = quantity;
    }

    cart.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await cart.save();

    return this.getCart(userId, guestToken);
  }

  public async removeItem(
    userId: string | undefined,
    guestToken: string | undefined,
    sku: string
  ): Promise<HydratedCart> {
    const cart = await this.getOrCreateCart(userId, guestToken);
    cart.items = cart.items.filter((item) => item.sku !== sku);
    await cart.save();
    return this.getCart(userId, guestToken);
  }

  public async clearCart(userId?: string, guestToken?: string): Promise<void> {
    const cart = await this.getOrCreateCart(userId, guestToken);
    cart.items = [];
    await cart.save();
  }

  public async mergeGuestCart(userId: string, guestToken: string): Promise<HydratedCart> {
    const guestCart = await this.cartRepo.findByGuestToken(guestToken);
    if (!guestCart || guestCart.items.length === 0) {
      return this.getCart(userId);
    }

    const userCart = await this.getOrCreateCart(userId);

    // Merge items avoiding duplicates
    for (const guestItem of guestCart.items) {
      const existingUserItem = userCart.items.find((i) => i.sku === guestItem.sku);
      if (existingUserItem) {
        existingUserItem.quantity += guestItem.quantity;
      } else {
        userCart.items.push(guestItem);
      }
    }

    await userCart.save();
    // Clean up temporary guest cart
    await this.cartRepo.deleteById(guestCart._id);

    return this.getCart(userId);
  }

  private async getOrCreateCart(userId?: string, guestToken?: string): Promise<ICart> {
    if (!userId && !guestToken) {
      throw new BadRequestError("Either userId or guestToken must be provided");
    }

    let cart: ICart | null = null;
    if (userId) {
      cart = await this.cartRepo.findByUserId(userId);
    } else if (guestToken) {
      cart = await this.cartRepo.findByGuestToken(guestToken);
    }

    if (!cart) {
      cart = await this.cartRepo.create({
        userId: userId ? new Types.ObjectId(userId) : undefined,
        guestToken: !userId ? guestToken : undefined,
        items: [],
      });
    }

    return cart;
  }
}

export const cartService = new CartService();
