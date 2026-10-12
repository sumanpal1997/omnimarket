"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { orderService, MasterOrder } from "@/services/order.service";
import { formatMinorUnitsToCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Calendar,
  CreditCard,
  MapPin,
  ChevronRight,
  Loader2,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<MasterOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/orders");
      return;
    }

    setLoading(true);
    orderService
      .getMyOrders(page, 10)
      .then((data) => {
        setOrders(data.orders);
        setTotalPages(data.pagination.totalPages);
      })
      .catch((err) => {
        console.error("Failed to load customer orders:", err);
      })
      .finally(() => setLoading(false));
  }, [user, page, router]);

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Paid</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Payment Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      case "REFUNDED":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSubOrderStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Delivered</Badge>;
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">In Transit</Badge>;
      case "PROCESSING":
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">Processing</Badge>;
      case "CONFIRMED":
        return <Badge className="bg-teal-50 text-teal-700 border-teal-200">Confirmed</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track shipments, manage deliveries, and view invoices across all marketplace vendors
          </p>
        </div>
        <Link href="/products">
          <Button variant="outline" size="sm" className="text-xs">
            <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
            Continue Shopping
          </Button>
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No orders placed yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When you purchase items from our independent vendors, your orders and shipment tracking will appear here.
          </p>
          <Link href="/products" className="inline-block mt-4">
            <Button size="sm">Browse Marketplace</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order._id} className="overflow-hidden border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
              <CardHeader className="bg-slate-50/70 py-3.5 px-5 border-b border-slate-200/80">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Order Number</span>
                      <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Placed On</span>
                      <span className="text-slate-700">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total</span>
                      <span className="font-bold text-slate-900">
                        {formatMinorUnitsToCurrency(order.grandTotalMinor)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getPaymentStatusBadge(order.paymentStatus)}
                    <Link href={`/orders/${order.orderNumber}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
                        <span>Details</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-3">
                <div className="text-xs text-slate-500 mb-1">
                  Vendor Packages ({order.subOrderIds?.length || 0}):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {order.subOrderIds?.map((subOrder) => (
                    <div
                      key={subOrder._id}
                      className="rounded-lg border border-slate-200 p-3 bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold text-slate-700">
                          {subOrder.subOrderNumber}
                        </span>
                        {getSubOrderStatusBadge(subOrder.status)}
                      </div>

                      <div className="text-slate-600 truncate">
                        {subOrder.items?.map((i) => `${i.title} (×${i.quantity})`).join(", ")}
                      </div>

                      {subOrder.tracking?.trackingNumber && (
                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>{subOrder.tracking.carrier}: {subOrder.tracking.trackingNumber}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
