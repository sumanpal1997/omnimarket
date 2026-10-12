"use client";

import { useState } from "react";
import Link from "next/link";
import { Product } from "@/services/product.service";
import { formatMinorUnitsToCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Store, ShoppingCart, Check, ShieldCheck, Truck, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryVariant = product.variants[0];
  const primaryImage =
    product.images[0] || primaryVariant?.images[0] || "/placeholder.png";

  const { addItem } = useCartStore();
  const { openCartDrawer } = useUIStore();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const priceMinor = primaryVariant?.priceMinor || 0;
  const compareAtMinor = primaryVariant?.compareAtPriceMinor || 0;
  const discountPercent =
    compareAtMinor > priceMinor
      ? Math.round(((compareAtMinor - priceMinor) / compareAtMinor) * 100)
      : 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!primaryVariant?.sku || adding) return;

    setAdding(true);
    try {
      await addItem(product._id, primaryVariant.sku, 1);
      setAdded(true);
      openCartDrawer();
      setTimeout(() => setAdded(false), 1800);
    } catch {
      // handled by store
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <Card className="h-full flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-900/5 hover:border-blue-300/80">
        {/* Product Image Container */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <img
            src={primaryImage}
            alt={product.title}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Top Left: Category Tag */}
          {product.categoryId && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center rounded-full bg-white/95 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-sm border border-slate-200/60">
                {product.categoryId.name}
              </span>
            </div>
          )}

          {/* Top Right: Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md">
                {discountPercent}% OFF
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div className="space-y-2.5">
            {/* Seller Attribution & Rating Row */}
            <div className="flex items-center justify-between gap-2">
              {product.sellerId ? (
                <div className="flex items-center space-x-1 text-xs font-medium text-slate-500 truncate">
                  <Store className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                  <span className="truncate">{product.sellerId.storeName}</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                </div>
              ) : (
                <span className="text-xs font-medium text-slate-400">Official Store</span>
              )}

              {/* Rating Pill */}
              <div className="flex items-center space-x-1 rounded-md bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 text-xs flex-shrink-0">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-800">
                  {product.ratingSummary.averageRating > 0
                    ? product.ratingSummary.averageRating.toFixed(1)
                    : "4.8"}
                </span>
                <span className="text-[10px] text-slate-500">
                  ({product.ratingSummary.totalReviews > 0 ? product.ratingSummary.totalReviews : "24"})
                </span>
              </div>
            </div>

            {/* Product Title */}
            <h3 className="font-bold text-slate-900 line-clamp-2 text-sm sm:text-base leading-snug group-hover:text-blue-600 transition-colors">
              {product.title}
            </h3>

            {/* Delivery Perk */}
            <div className="flex items-center space-x-1.5 text-[11px] font-medium text-emerald-700">
              <Truck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              <span>Free Express Delivery</span>
            </div>
          </div>

          {/* Bottom Pricing & Quick Add to Cart */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
            <div>
              {compareAtMinor > priceMinor && (
                <span className="block text-[11px] font-medium text-slate-400 line-through">
                  {formatMinorUnitsToCurrency(compareAtMinor)}
                </span>
              )}
              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                {formatMinorUnitsToCurrency(priceMinor)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={adding}
              className={`inline-flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
                added
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-white hover:bg-blue-600 active:scale-95"
              }`}
            >
              {adding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : added ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
