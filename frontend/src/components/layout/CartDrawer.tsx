"use client";

import { useUIStore } from "@/stores/ui-store";
import { useCartStore } from "@/stores/cart-store";
import { formatMinorUnitsToCurrency } from "@/lib/utils";
import {
  X,
  ShoppingBag,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const { isCartDrawerOpen, closeCartDrawer } = useUIStore();
  const { cart, updateQuantity, removeItem, isLoading } = useCartStore();

  if (!isCartDrawerOpen) return null;

  const items = cart?.items || [];
  const pricing = cart?.pricing;
  const isEmpty = items.length === 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={closeCartDrawer}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight">
                  Shopping Cart ({pricing?.totalItemsCount || 0})
                </h2>
                <p className="text-[11px] text-slate-400">
                  100% Escrow Protected Checkout
                </p>
              </div>
            </div>
            <button
              onClick={closeCartDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Free Shipping Banner */}
          {!isEmpty && (
            <div className="bg-emerald-50 border-b border-emerald-200/80 px-6 py-2.5 flex items-center space-x-2 text-xs font-bold text-emerald-800">
              <Truck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Your order qualifies for Priority Express Delivery!</span>
            </div>
          )}

          {/* Body */}
          {isEmpty ? (
            <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                <ShoppingBag className="h-9 w-9" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Your cart is empty</h3>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-xs leading-relaxed">
                Explore flagship electronics, audio gear, and verified brand stores across OmniMarket.
              </p>
              <Link href="/products" onClick={closeCartDrawer}>
                <Button className="mt-6 rounded-xl px-6 font-bold">
                  Explore Flagship Deals
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.sku} className="pt-4 first:pt-0 flex space-x-4">
                  {/* Thumbnail */}
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                    <img
                      src={item.imageUrl || "/placeholder.png"}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{item.variantTitle}</p>
                      <p className="text-sm font-extrabold text-blue-600 mt-1">
                        {formatMinorUnitsToCurrency(item.unitPriceMinor)}
                      </p>
                    </div>

                    {/* Stepper & Remove */}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                          disabled={isLoading}
                          className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                          disabled={isLoading}
                          className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.sku)}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Checkout Preview */}
          {!isEmpty && pricing && (
            <div className="border-t border-slate-200 p-6 bg-slate-50/90 space-y-4">
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    {formatMinorUnitsToCurrency(pricing.subtotalMinor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax (18% GST)</span>
                  <span className="font-semibold text-slate-900">
                    {formatMinorUnitsToCurrency(pricing.taxMinor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-bold text-emerald-600">
                    {pricing.shippingMinor === 0
                      ? "FREE"
                      : formatMinorUnitsToCurrency(pricing.shippingMinor)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2.5 text-base font-extrabold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-blue-600">
                    {formatMinorUnitsToCurrency(pricing.grandTotalMinor)}
                  </span>
                </div>
              </div>

              <Link href="/checkout" onClick={closeCartDrawer} className="block">
                <Button
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
                  size="lg"
                >
                  <span>Proceed to Secure Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <div className="flex items-center justify-center space-x-1.5 text-[11px] font-medium text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>256-Bit Encrypted Multi-Vendor Escrow</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
