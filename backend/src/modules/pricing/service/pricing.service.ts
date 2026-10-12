import { Types } from "mongoose";
import { ProductModel } from "../../products/model/product.model.js";
import { SellerModel } from "../../sellers/model/seller.model.js";
import { NotFoundError, BadRequestError } from "../../../core/errors/app-error.js";

export interface PricingItemInput {
  productId: string | Types.ObjectId;
  sku: string;
  quantity: number;
}

export interface CalculatedItem {
  productId: string;
  sku: string;
  sellerId: string;
  title: string;
  variantTitle: string;
  unitPriceMinor: number;
  quantity: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  imageUrl?: string;
}

export interface SellerPriceBreakdown {
  sellerId: string;
  storeName: string;
  commissionRate: number;
  items: CalculatedItem[];
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  commissionMinor: number;
  sellerPayoutMinor: number;
}

export interface PricingResult {
  items: CalculatedItem[];
  sellerBreakdowns: SellerPriceBreakdown[];
  totalItemsCount: number;
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
}

export class PricingEngineService {
  private static readonly STANDARD_TAX_RATE = 0.18; // 18% standard GST
  private static readonly BASE_SHIPPING_FEE_MINOR = 9900; // ₹99.00 per merchant
  private static readonly FREE_SHIPPING_THRESHOLD_MINOR = 99900; // Free shipping if merchant subtotal >= ₹999.00

  public async calculateOrderPrice(
    items: PricingItemInput[],
    discountMinor = 0
  ): Promise<PricingResult> {
    if (!items || items.length === 0) {
      return {
        items: [],
        sellerBreakdowns: [],
        totalItemsCount: 0,
        subtotalMinor: 0,
        taxMinor: 0,
        shippingMinor: 0,
        discountMinor: 0,
        grandTotalMinor: 0,
      };
    }

    // 1. Fetch unique products in a single batch query to avoid N+1 queries
    const productIds = [...new Set(items.map((i) => i.productId.toString()))];
    const products = await ProductModel.find({
      _id: { $in: productIds },
      status: "APPROVED",
    });

    // Create O(1) product lookup Map
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // 2. Fetch distinct sellers
    const sellerIds = [...new Set(products.map((p) => p.sellerId.toString()))];
    const sellers = await SellerModel.find({ _id: { $in: sellerIds } });
    const sellerMap = new Map(sellers.map((s) => [s._id.toString(), s]));

    // 3. Process line items with exact minor-unit math
    const calculatedItems: CalculatedItem[] = [];
    const itemsBySeller = new Map<string, CalculatedItem[]>();

    for (const item of items) {
      if (item.quantity <= 0) {
        throw new BadRequestError(`Invalid quantity for SKU: ${item.sku}`);
      }

      const product = productMap.get(item.productId.toString());
      if (!product) {
        throw new NotFoundError(`Product for SKU ${item.sku} not found or no longer approved`);
      }

      // Find variant in product
      const variant = product.variants.find((v) => v.sku === item.sku);
      if (!variant || !variant.isActive) {
        throw new NotFoundError(`Variant for SKU ${item.sku} is unavailable`);
      }

      const sellerIdStr = product.sellerId.toString();
      const unitPriceMinor = variant.priceMinor;
      const subtotalMinor = unitPriceMinor * item.quantity;
      const taxMinor = Math.round(subtotalMinor * PricingEngineService.STANDARD_TAX_RATE);
      const totalMinor = subtotalMinor + taxMinor;

      const calculatedItem: CalculatedItem = {
        productId: product._id.toString(),
        sku: variant.sku,
        sellerId: sellerIdStr,
        title: product.title,
        variantTitle: variant.title,
        unitPriceMinor,
        quantity: item.quantity,
        subtotalMinor,
        taxMinor,
        totalMinor,
        imageUrl: variant.images[0] || product.images[0],
      };

      calculatedItems.push(calculatedItem);

      const sellerList = itemsBySeller.get(sellerIdStr) || [];
      sellerList.push(calculatedItem);
      itemsBySeller.set(sellerIdStr, sellerList);
    }

    // 4. Calculate per-seller breakdowns, commissions, and shipping splits
    const sellerBreakdowns: SellerPriceBreakdown[] = [];
    let overallSubtotalMinor = 0;
    let overallTaxMinor = 0;
    let overallShippingMinor = 0;
    let totalItemsCount = 0;

    for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
      const seller = sellerMap.get(sellerId);
      const storeName = seller?.storeName || "Merchant";
      const commissionRate = seller?.commissionRate ?? 10;

      const sellerSubtotal = sellerItems.reduce((acc, i) => acc + i.subtotalMinor, 0);
      const sellerTax = sellerItems.reduce((acc, i) => acc + i.taxMinor, 0);
      const sellerItemsCount = sellerItems.reduce((acc, i) => acc + i.quantity, 0);

      // Shipping calculation per seller: free over threshold
      const shippingMinor =
        sellerSubtotal >= PricingEngineService.FREE_SHIPPING_THRESHOLD_MINOR
          ? 0
          : PricingEngineService.BASE_SHIPPING_FEE_MINOR;

      // Platform commission on merchant goods
      const commissionMinor = Math.round(sellerSubtotal * (commissionRate / 100));

      // Merchant payable settlement amount
      const sellerPayoutMinor = sellerSubtotal + sellerTax + shippingMinor - commissionMinor;

      sellerBreakdowns.push({
        sellerId,
        storeName,
        commissionRate,
        items: sellerItems,
        subtotalMinor: sellerSubtotal,
        taxMinor: sellerTax,
        shippingMinor,
        totalMinor: sellerSubtotal + sellerTax + shippingMinor,
        commissionMinor,
        sellerPayoutMinor,
      });

      overallSubtotalMinor += sellerSubtotal;
      overallTaxMinor += sellerTax;
      overallShippingMinor += shippingMinor;
      totalItemsCount += sellerItemsCount;
    }

    const grandTotalMinor =
      overallSubtotalMinor + overallTaxMinor + overallShippingMinor - discountMinor;

    return {
      items: calculatedItems,
      sellerBreakdowns,
      totalItemsCount,
      subtotalMinor: overallSubtotalMinor,
      taxMinor: overallTaxMinor,
      shippingMinor: overallShippingMinor,
      discountMinor,
      grandTotalMinor: Math.max(0, grandTotalMinor),
    };
  }
}

export const pricingEngine = new PricingEngineService();
