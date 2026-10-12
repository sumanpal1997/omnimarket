"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { orderService, MasterOrder, SellerOrder } from "@/services/order.service";
import { formatMinorUnitsToCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Store,
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

const ORDER_STEPS = [
  { key: "PENDING", label: "Placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [order, setOrder] = useState<MasterOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isJustCreated = searchParams.get("created") === "true";
  const paymentIdParam = searchParams.get("paymentId");

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrderDetail(resolvedParams.orderNumber);
      setOrder(data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push(`/login?redirect=/orders/${resolvedParams.orderNumber}`);
      return;
    }
    loadOrder();
  }, [user, resolvedParams.orderNumber]);

  const handleSimulatePayment = async () => {
    if (!order) return;
    setIsSimulatingPayment(true);
    try {
      const transactionId = paymentIdParam || order.orderNumber;
      await orderService.simulatePaymentSuccess(transactionId);
      setSimulatedSuccess(true);
      // Reload order to fetch updated PAID status & confirmed sub-orders
      await loadOrder();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to simulate payment");
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "PENDING":
        return 0;
      case "CONFIRMED":
        return 1;
      case "PROCESSING":
        return 2;
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
        return 3;
      case "DELIVERED":
        return 4;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <Card className="p-8 border-slate-200">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <CardTitle className="text-lg">Order Not Found</CardTitle>
          <p className="text-xs text-slate-500 mt-2">{error || "Unable to display this order."}</p>
          <Link href="/orders" className="inline-block mt-4">
            <Button size="sm">Back to Orders</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 max-w-5xl space-y-6">
      {/* Top Breadcrumb & Alerts */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 font-mono">{order.orderNumber}</h1>
              {order.paymentStatus === "PAID" ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Paid</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                  {order.paymentStatus}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Just created celebration banner */}
      {isJustCreated && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Order Placed Successfully!</p>
              <p className="mt-0.5 text-emerald-700">
                Inventory has been atomically reserved. Packages have been routed to each vendor for fulfillment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sandbox payment simulator if still PENDING */}
      {order.paymentStatus === "PENDING" && (
        <Card className="border-amber-200 bg-amber-50/60 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-amber-900 block">Sandbox Payment Action:</span>
              <p className="text-amber-700">
                This order is awaiting webhook settlement. In development mode, click to simulate instantaneous gateway settlement and stock commitment.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              disabled={isSimulatingPayment}
              onClick={handleSimulatePayment}
            >
              {isSimulatingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CreditCard className="h-4 w-4 mr-1" />
              )}
              Simulate Payment Success
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Vendor Sub-Orders with Live Status Steppers */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <span>Fulfillment Packages ({order.subOrderIds?.length || 0})</span>
          </h2>

          {order.subOrderIds?.map((subOrder: SellerOrder) => {
            const currentStep = getStepIndex(subOrder.status);
            const sellerStoreName =
              typeof subOrder.sellerId === "object"
                ? subOrder.sellerId.storeName
                : "Merchant Partner";

            return (
              <Card key={subOrder._id} className="overflow-hidden border border-slate-200">
                <CardHeader className="bg-slate-50/60 py-3 px-5 border-b border-slate-200 flex flex-row items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs">
                    <Store className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-slate-900">{sellerStoreName}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-mono text-slate-500">{subOrder.subOrderNumber}</span>
                  </div>
                  <Badge variant="outline" className="font-semibold text-xs">
                    {subOrder.status}
                  </Badge>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* Status Progress Stepper */}
                  <div className="relative flex justify-between items-center text-center px-4">
                    <div className="absolute left-6 right-6 top-3 h-0.5 bg-slate-200 -z-0" />
                    {ORDER_STEPS.map((step, idx) => {
                      const isCompleted = idx <= currentStep;
                      return (
                        <div key={step.key} className="flex flex-col items-center relative z-10">
                          <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isCompleted
                                ? "bg-blue-600 text-white"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <span className={`text-[10px] mt-1.5 ${isCompleted ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tracking info if present */}
                  {subOrder.tracking?.trackingNumber && (
                    <div className="rounded-lg bg-blue-50/60 border border-blue-200/70 p-3 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Carrier & Tracking</span>
                        <span className="font-semibold text-slate-800">
                          {subOrder.tracking.carrier}: {subOrder.tracking.trackingNumber}
                        </span>
                      </div>
                      {subOrder.tracking.trackingUrl && (
                        <a
                          href={subOrder.tracking.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1 font-medium"
                        >
                          <span>Track Live</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Item List */}
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    {subOrder.items.map((item) => (
                      <div key={item.sku} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-800">{item.title}</p>
                          <p className="text-[11px] text-slate-400">
                            {item.variantTitle} • SKU: {item.sku} • Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="font-medium text-slate-900">
                          {formatMinorUnitsToCurrency(item.totalMinor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right Column: Address and Invoicing */}
        <div className="space-y-6">
          {/* Shipping Address */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>Shipping Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">{order.shippingAddress.label}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && (
                <p className="text-slate-500 pt-1">Phone: {order.shippingAddress.phone}</p>
              )}
            </CardContent>
          </Card>

          {/* Payment & Invoice Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Payment & Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span>{formatMinorUnitsToCurrency(order.subtotalMinor)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Tax (18%)</span>
                  <span>{formatMinorUnitsToCurrency(order.taxMinor)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span>
                    {order.shippingMinor === 0
                      ? "FREE"
                      : formatMinorUnitsToCurrency(order.shippingMinor)}
                  </span>
                </div>
                {order.discountMinor > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-{formatMinorUnitsToCurrency(order.discountMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-sm">
                  <span>Grand Total</span>
                  <span className="text-blue-600">
                    {formatMinorUnitsToCurrency(order.grandTotalMinor)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500 flex items-center space-x-2 border border-slate-200/80">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Escrow protection enabled. Vendors are credited upon verified delivery.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
