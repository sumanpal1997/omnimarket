import { UserModel } from "../../users/model/user.model.js";
import { CartModel } from "../../cart/model/cart.model.js";
import { inventoryService, InventoryService } from "../../inventory/service/inventory.service.js";
import { pricingEngine, PricingEngineService, PricingResult } from "../../pricing/service/pricing.service.js";
import { NotFoundError, BadRequestError, ConflictError } from "../../../core/errors/app-error.js";

export interface CheckoutPreviewResult {
  shippingAddress: any;
  items: PricingResult["items"];
  sellerBreakdowns: PricingResult["sellerBreakdowns"];
  pricing: {
    subtotalMinor: number;
    taxMinor: number;
    shippingMinor: number;
    discountMinor: number;
    grandTotalMinor: number;
  };
}

export class CheckoutService {
  constructor(
    private inventory: InventoryService = inventoryService,
    private pricing: PricingEngineService = pricingEngine
  ) {}

  public async prepareCheckout(
    userId: string,
    addressId: string,
    _couponCode?: string
  ): Promise<CheckoutPreviewResult> {
    // 1. Validate shipping address
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const address = user.addresses.find((a) => a._id?.toString() === addressId);
    if (!address) {
      throw new NotFoundError("Selected shipping address not found on user profile");
    }

    // 2. Fetch cart items
    const cart = await CartModel.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestError("Your cart is empty. Add items before checking out.");
    }

    // 3. Concurrency check: verify live stock availability for all items in cart
    for (const item of cart.items) {
      const liveStock = await this.inventory.getStockBySku(item.sku);
      if (liveStock.stock < item.quantity) {
        throw new ConflictError(
          `Item SKU ${item.sku} has only ${liveStock.stock} units left in stock, but your cart has ${item.quantity}. Please update your cart.`
        );
      }
    }

    // 4. Calculate prices with Centralized Pricing Engine
    const pricingInputs = cart.items.map((i) => ({
      productId: i.productId,
      sku: i.sku,
      quantity: i.quantity,
    }));

    const pricingResult = await this.pricing.calculateOrderPrice(pricingInputs, 0);

    return {
      shippingAddress: address,
      items: pricingResult.items,
      sellerBreakdowns: pricingResult.sellerBreakdowns,
      pricing: {
        subtotalMinor: pricingResult.subtotalMinor,
        taxMinor: pricingResult.taxMinor,
        shippingMinor: pricingResult.shippingMinor,
        discountMinor: pricingResult.discountMinor,
        grandTotalMinor: pricingResult.grandTotalMinor,
      },
    };
  }
}

export const checkoutService = new CheckoutService();
