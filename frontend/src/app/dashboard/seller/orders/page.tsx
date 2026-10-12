"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { orderService, SellerOrder, SellerOrderStatus } from "@/services/order.service";
import { formatMinorUnitsToCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";

export default function SellerOrdersDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fulfillment dialog state
  const [activeSubOrder, setActiveSubOrder] = useState<SellerOrder | null>(null);
  const [targetStatus, setTargetStatus] = useState<SellerOrderStatus | null>(null);
  const [carrier, setCarrier] = useState("Delhivery");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSellerOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getSellerOrders(page, 10, statusFilter || undefined);
      setOrders(data.orders);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error("Failed to load seller orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/dashboard/seller/orders");
      return;
    }
    fetchSellerOrders();
  }, [user, page, statusFilter]);

  const handleUpdateStatus = async () => {
    if (!activeSubOrder || !targetStatus) return;
    setUpdating(true);
    setActionError(null);

    try {
      const trackingPayload =
        targetStatus === "SHIPPED"
          ? {
              carrier,
              trackingNumber,
              trackingUrl: trackingUrl || undefined,
            }
          : undefined;

      await orderService.updateSellerOrderStatus(activeSubOrder._id, {
        status: targetStatus,
        note: `Fulfillment status changed to ${targetStatus} by merchant`,
        tracking: trackingPayload,
      });

      setActiveSubOrder(null);
      setTargetStatus(null);
      await fetchSellerOrders();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error?.message || "Failed to update fulfillment status"
      );
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-teal-50 text-teal-800 border-teal-200">Confirmed (Awaiting Packing)</Badge>;
      case "PROCESSING":
        return <Badge className="bg-blue-50 text-blue-800 border-blue-200">Processing / Packed</Badge>;
      case "SHIPPED":
        return <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200">Shipped</Badge>;
      case "OUT_FOR_DELIVERY":
        return <Badge className="bg-purple-50 text-purple-800 border-purple-200">Out For Delivery</Badge>;
      case "DELIVERED":
        return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Delivered</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-50 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link href="/dashboard/seller">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Fulfillment & Orders
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch merchant packages, update shipment tracking, and monitor payouts
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 text-xs border-b border-slate-200">
        {[
          { label: "All Orders", value: "" },
          { label: "Confirmed", value: "CONFIRMED" },
          { label: "Processing", value: "PROCESSING" },
          { label: "Shipped", value: "SHIPPED" },
          { label: "Delivered", value: "DELIVERED" },
          { label: "Cancelled", value: "CANCELLED" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No merchant orders found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {statusFilter
              ? `No sub-orders currently matching '${statusFilter}' status.`
              : "When customers purchase your listed items, fulfillment orders will appear here."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((subOrder) => (
            <Card key={subOrder._id} className="overflow-hidden border border-slate-200">
              <CardHeader className="bg-slate-50/70 py-3.5 px-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-slate-900">
                    {subOrder.subOrderNumber}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">
                    Placed: {new Date(subOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(subOrder.status)}
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Items in Sub-Order */}
                <div className="space-y-2">
                  {subOrder.items.map((item) => (
                    <div
                      key={item.sku}
                      className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{item.title}</span>
                        <span className="text-slate-400 ml-1">
                          ({item.variantTitle}) • SKU: {item.sku} • Qty: {item.quantity}
                        </span>
                      </div>
                      <span className="font-medium text-slate-900">
                        {formatMinorUnitsToCurrency(item.totalMinor)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="rounded-xl bg-slate-50 p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Package Total</span>
                    <span className="font-semibold text-slate-800">
                      {formatMinorUnitsToCurrency(subOrder.totalMinor)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Shipping Fee</span>
                    <span className="font-semibold text-slate-800">
                      {formatMinorUnitsToCurrency(subOrder.shippingMinor)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Platform Fee (10%)</span>
                    <span className="font-semibold text-red-600">
                      -{formatMinorUnitsToCurrency(subOrder.commissionMinor)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Net Merchant Payout</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      {formatMinorUnitsToCurrency(subOrder.sellerPayoutMinor)}
                    </span>
                  </div>
                </div>

                {/* Tracking information if shipped */}
                {subOrder.tracking?.trackingNumber && (
                  <div className="text-xs text-slate-600 flex items-center justify-between bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                    <div>
                      <span className="font-semibold">Carrier:</span> {subOrder.tracking.carrier} |{" "}
                      <span className="font-semibold">Tracking #:</span>{" "}
                      {subOrder.tracking.trackingNumber}
                    </div>
                    {subOrder.tracking.trackingUrl && (
                      <a
                        href={subOrder.tracking.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center space-x-1"
                      >
                        <span>Carrier Portal</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* State Machine Transition Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {subOrder.status === "CONFIRMED" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveSubOrder(subOrder);
                        setTargetStatus("PROCESSING");
                      }}
                    >
                      <span>Start Processing / Packing</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}

                  {subOrder.status === "PROCESSING" && (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => {
                        setActiveSubOrder(subOrder);
                        setTargetStatus("SHIPPED");
                      }}
                    >
                      <Truck className="h-3.5 w-3.5 mr-1" />
                      <span>Ship Package & Add Tracking</span>
                    </Button>
                  )}

                  {subOrder.status === "SHIPPED" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        setActiveSubOrder(subOrder);
                        setTargetStatus("DELIVERED");
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      <span>Mark Delivered</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Fulfillment Status Update Modal */}
      {activeSubOrder && targetStatus && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-base">
                Advance Order to {targetStatus}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Updating sub-order: <span className="font-mono">{activeSubOrder.subOrderNumber}</span>
              </p>
            </CardHeader>

            {actionError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {actionError}
              </div>
            )}

            {targetStatus === "SHIPPED" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Logistics Carrier
                  </label>
                  <Input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="e.g. Delhivery, Blue Dart, FedEx"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Air Waybill / Tracking Number
                  </label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. DEL123456789"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Tracking URL (Optional)
                  </label>
                  <Input
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://track.carrier.com/..."
                  />
                </div>
              </div>
            )}

            {targetStatus === "DELIVERED" && (
              <p className="text-xs text-slate-600">
                Confirming delivery will mark the merchant package completed and prepare the escrow payout for settlement.
              </p>
            )}

            {targetStatus === "PROCESSING" && (
              <p className="text-xs text-slate-600">
                Moving this sub-order to Processing notifies the customer that the items are being packed in the warehouse.
              </p>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={updating}
                onClick={() => {
                  setActiveSubOrder(null);
                  setTargetStatus(null);
                  setActionError(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={updating} onClick={handleUpdateStatus}>
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Confirm Status Update</span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
