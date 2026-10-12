"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { userService, Address } from "@/services/user.service";
import { checkoutService, CheckoutPreviewData } from "@/services/checkout.service";
import { orderService } from "@/services/order.service";
import { formatMinorUnitsToCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Store,
  ShieldCheck,
  CreditCard,
  Plus,
  AlertCircle,
  Loader2,
  Lock,
  CheckCircle2,
  X,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, fetchCart } = useCartStore();
  const { user } = useAuthStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [paymentProvider, setPaymentProvider] = useState<"STRIPE" | "RAZORPAY">("STRIPE");
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Address Creation Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addrLabel, setAddrLabel] = useState<"HOME" | "WORK" | "OTHER">("HOME");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPostalCode, setAddrPostalCode] = useState("");
  const [addrCountry, setAddrCountry] = useState("India");
  const [addrPhone, setAddrPhone] = useState("");
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressModalError, setAddressModalError] = useState<string | null>(null);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet || !addrCity || !addrState || !addrPostalCode) {
      setAddressModalError("Please fill out all required address fields.");
      return;
    }
    setIsAddingAddress(true);
    setAddressModalError(null);
    try {
      const updatedAddresses = await userService.addAddress({
        label: addrLabel,
        street: addrStreet,
        city: addrCity,
        state: addrState,
        postalCode: addrPostalCode,
        country: addrCountry,
        phone: addrPhone,
        isDefault: addresses.length === 0,
      });
      setAddresses(updatedAddresses);
      const newlyAdded = updatedAddresses[updatedAddresses.length - 1];
      if (newlyAdded) {
        setSelectedAddressId(newlyAdded._id);
      }
      setIsAddressModalOpen(false);
      setAddrStreet("");
      setAddrCity("");
      setAddrState("");
      setAddrPostalCode("");
      setAddrPhone("");
    } catch (err: any) {
      setAddressModalError(err?.response?.data?.error?.message || "Failed to add address.");
    } finally {
      setIsAddingAddress(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (user) {
      userService
        .getAddresses()
        .then((addrList) => {
          setAddresses(addrList);
          const defaultAddr = addrList.find((a) => a.isDefault) || addrList[0];
          if (defaultAddr) setSelectedAddressId(defaultAddr._id);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedAddressId && cart && cart.items.length > 0) {
      checkoutService
        .getPreview(selectedAddressId)
        .then(setCheckoutPreview)
        .catch((err) => {
          setError(
            err?.response?.data?.error?.message ||
              "Could not validate checkout. Check product availability."
          );
        });
    }
  }, [selectedAddressId, cart]);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) return;
    setIsProcessing(true);
    setError(null);

    try {
      const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const result = await orderService.createOrder({
        addressId: selectedAddressId,
        paymentProvider,
        idempotencyKey,
      });

      await fetchCart();
      router.push(`/orders/${result.order.orderNumber}?created=true&paymentId=${result.clientSecret}`);
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          "Failed to place order. Some items may have gone out of stock. Please review your cart."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <Card className="p-8 border-slate-200">
          <Lock className="h-10 w-10 text-blue-600 mx-auto mb-4" />
          <CardTitle className="text-xl font-bold">Sign In Required</CardTitle>
          <CardDescription className="mt-2 text-sm text-slate-500">
            Please log in or create an account to proceed with secure multi-vendor checkout.
          </CardDescription>
          <div className="mt-6 flex flex-col space-y-3">
            <Link href="/login">
              <Button className="w-full">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <Card className="p-8 border-slate-200">
          <CardTitle className="text-xl font-bold">Your Cart is Empty</CardTitle>
          <p className="mt-2 text-sm text-slate-500">
            Add items to your cart before proceeding to checkout.
          </p>
          <Link href="/products" className="mt-6 inline-block">
            <Button>Explore Products</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const pricing = checkoutPreview?.pricing || cart.pricing;

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review your items, choose shipping address, and proceed to payment.
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Address Selection & Multi-Vendor Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">1. Delivery Address</CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddressModalOpen(true)}
                className="flex items-center space-x-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Address</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {addresses.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center">
                  <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">No saved addresses found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Add a delivery address to choose delivery and proceed to payment.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="mt-4 text-xs inline-flex items-center space-x-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Delivery Address</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      onClick={() => setSelectedAddressId(addr._id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedAddressId === addr._id
                          ? "border-blue-600 bg-blue-50/50 shadow-sm"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{addr.label}</span>
                        {addr.isDefault && (
                          <Badge variant="success" className="text-[10px]">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {addr.street}, {addr.city}, {addr.state} - {addr.postalCode}
                      </p>
                      {addr.phone && (
                        <p className="text-[11px] text-slate-400 mt-1">Phone: {addr.phone}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Multi-Vendor Seller Split Review */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Store className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">2. Multi-Vendor Order Breakdown</CardTitle>
              </div>
              <CardDescription>
                Your order is divided into sub-orders fulfilled directly by each independent merchant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {cart.pricing.sellerBreakdowns.map((sellerBreakdown) => (
                <div
                  key={sellerBreakdown.sellerId}
                  className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <div className="flex items-center space-x-2">
                      <Store className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-bold text-slate-900">
                        {sellerBreakdown.storeName}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Shipping:{" "}
                      {sellerBreakdown.shippingMinor === 0
                        ? "FREE"
                        : formatMinorUnitsToCurrency(sellerBreakdown.shippingMinor)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {sellerBreakdown.items.map((item) => (
                      <div key={item.sku} className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-slate-800">{item.title}</span>
                          <span className="text-slate-400 ml-1">({item.variantTitle}) × {item.quantity}</span>
                        </div>
                        <span className="font-medium text-slate-900">
                          {formatMinorUnitsToCurrency(item.subtotalMinor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pricing Summary & Payment Launcher */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span>{formatMinorUnitsToCurrency(pricing.subtotalMinor)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax (18% GST)</span>
                  <span>{formatMinorUnitsToCurrency(pricing.taxMinor)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Delivery Fee</span>
                  <span>
                    {pricing.shippingMinor === 0
                      ? "FREE"
                      : formatMinorUnitsToCurrency(pricing.shippingMinor)}
                  </span>
                </div>
                {pricing.discountMinor > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatMinorUnitsToCurrency(pricing.discountMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                  <span>Total Payable</span>
                  <span className="text-blue-600">
                    {formatMinorUnitsToCurrency(pricing.grandTotalMinor)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="rounded-lg border border-slate-200 p-2.5 bg-slate-50 text-xs">
                  <span className="font-semibold text-slate-700 block mb-1.5">Payment Method:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentProvider("STRIPE")}
                      className={`py-1.5 px-2 text-center rounded border font-medium transition-colors ${
                        paymentProvider === "STRIPE"
                          ? "border-blue-600 bg-white text-blue-700 shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      Card / Stripe
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentProvider("RAZORPAY")}
                      className={`py-1.5 px-2 text-center rounded border font-medium transition-colors ${
                        paymentProvider === "RAZORPAY"
                          ? "border-blue-600 bg-white text-blue-700 shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      UPI / Razorpay
                    </button>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full flex items-center justify-center space-x-2"
                  disabled={!selectedAddressId || isProcessing}
                  onClick={handlePlaceOrder}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Placing Order & Allocating Stock...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      <span>Pay {formatMinorUnitsToCurrency(pricing.grandTotalMinor)}</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500 pt-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>256-bit encrypted checkout & escrow protection</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Add Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Add Delivery Address</h3>
              </div>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addressModalError && (
              <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{addressModalError}</span>
              </div>
            )}

            <form onSubmit={handleAddAddress} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Address Label</label>
                <div className="mt-1 flex gap-2">
                  {(["HOME", "WORK", "OTHER"] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddrLabel(lbl)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold border transition-all ${
                        addrLabel === lbl
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Street Address *</label>
                <Input
                  placeholder="Flat/House No., Building, Street name"
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">City *</label>
                  <Input
                    placeholder="City"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">State *</label>
                  <Input
                    placeholder="State"
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Postal Code *</label>
                  <Input
                    placeholder="e.g. 560038"
                    value={addrPostalCode}
                    onChange={(e) => setAddrPostalCode(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Country</label>
                  <Input
                    value={addrCountry}
                    onChange={(e) => setAddrCountry(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Phone Number (Optional)</label>
                <Input
                  placeholder="+919876543210"
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddressModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isAddingAddress}>
                  {isAddingAddress ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    "Save & Use Address"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
