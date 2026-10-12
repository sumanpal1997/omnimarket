"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  sellerService,
  SellerProfile,
  SellerAnalyticsSummary,
  PayoutItem,
} from "@/services/seller.service";
import { formatMinorUnitsToCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Package,
  Clock,
  PlusCircle,
  AlertTriangle,
  Store,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export default function SellerDashboardPage() {
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [analytics, setAnalytics] = useState<SellerAnalyticsSummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutSuccessMessage, setPayoutSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const profile = await sellerService.getMyProfile();
      setSeller(profile);

      if (profile.status === "ACTIVE") {
        const [analyticsData, payoutsData] = await Promise.all([
          sellerService.getAnalytics(),
          sellerService.getPayouts(1, 10),
        ]);
        setAnalytics(analyticsData);
        setPayouts(payoutsData.payouts);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          "Unable to load merchant profile or analytics. Please apply to sell first."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestPayout = async () => {
    if (!analytics || analytics.financials.availableEscrowBalanceMinor < 100000) return;
    setRequestingPayout(true);
    setPayoutSuccessMessage(null);
    try {
      const newPayout = await sellerService.requestPayout();
      setPayoutSuccessMessage(
        `Disbursement batch ${newPayout.payoutNumber} of ${formatMinorUnitsToCurrency(
          newPayout.amountMinor
        )} was successfully processed to ${newPayout.bankAccount.bankName}!`
      );
      // Refresh analytics & ledger
      const [updatedAnalytics, updatedPayouts] = await Promise.all([
        sellerService.getAnalytics(),
        sellerService.getPayouts(1, 10),
      ]);
      setAnalytics(updatedAnalytics);
      setPayouts(updatedPayouts.payouts);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to process payout");
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <Card className="p-8">
          <Store className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <CardTitle className="text-xl font-bold">No Active Merchant Account</CardTitle>
          <p className="mt-2 text-sm text-slate-600">
            You must apply and be approved by platform administrators before accessing the Seller Dashboard.
          </p>
          <Link href="/seller/apply" className="mt-6 inline-block">
            <Button>Apply as Merchant</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isPending = seller.status === "PENDING";
  const isSuspended = seller.status === "SUSPENDED" || seller.status === "BLOCKED";

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 max-w-6xl space-y-8">
      {/* Top Banner: Status Notices */}
      {isPending && (
        <div className="flex items-center space-x-3 rounded-xl bg-amber-50 p-4 border border-amber-200 text-amber-800 text-xs">
          <Clock className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <span className="font-semibold block">Application Under Compliance Review:</span>
            Your merchant application is currently pending approval by marketplace administrators.
          </div>
        </div>
      )}

      {isSuspended && (
        <div className="flex items-center space-x-3 rounded-xl bg-red-50 p-4 border border-red-200 text-red-800 text-xs">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <span className="font-semibold block">Merchant Account Suspended:</span>
            {seller.rejectionReason || "Please contact platform compliance support."}
          </div>
        </div>
      )}

      {/* Low stock alert banner */}
      {analytics && analytics.products.lowStockCount > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50/80 p-4 border border-amber-200 text-amber-900 text-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Inventory Alert:</strong> You have {analytics.products.lowStockCount} product variant(s) with 5 or fewer units remaining.
            </span>
          </div>
          <Link href="/dashboard/seller/orders">
            <Button variant="outline" size="sm" className="h-7 text-xs border-amber-300">
              Manage Stock
            </Button>
          </Link>
        </div>
      )}

      {payoutSuccessMessage && (
        <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-800 text-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{payoutSuccessMessage}</span>
        </div>
      )}

      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl">
              {seller.storeName}
            </h1>
            <Badge
              className={
                seller.status === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : seller.status === "PENDING"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-red-100 text-red-800 border-red-300"
              }
            >
              {seller.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Store Slug: <span className="font-mono text-blue-600">/{seller.slug}</span> • Platform Fee: {seller.commissionRate}%
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/dashboard/seller/orders">
            <Button variant="outline" className="flex items-center space-x-2 text-xs">
              <Package className="h-4 w-4 text-blue-600" />
              <span>Manage Orders</span>
            </Button>
          </Link>
          <Link href="/dashboard/seller/products/new">
            <Button
              className="flex items-center space-x-2 text-xs"
              disabled={seller.status !== "ACTIVE"}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">Gross Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatMinorUnitsToCurrency(analytics?.financials.lifetimeGrossSalesMinor || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" /> Lifetime customer orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">Net Merchant Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatMinorUnitsToCurrency(analytics?.financials.lifetimeNetEarningsMinor || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              After {seller.commissionRate}% platform fee deduction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">Orders</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {analytics?.orders.total || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {analytics?.orders.delivered || 0} delivered • {analytics?.orders.processing || 0} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-800">Available For Payout</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {formatMinorUnitsToCurrency(analytics?.financials.availableEscrowBalanceMinor || 0)}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">
              Eligible delivered orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Settlement & Bank Information Row */}
      <Card className="border border-slate-200">
        <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span>Merchant Settlement & Payouts</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Settles directly to: <strong>{seller.bankAccount.bankName}</strong> ({seller.bankAccount.accountNumberMasked}) • IFSC: {seller.bankAccount.routingCode}
            </p>
          </div>

          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-2 text-xs shrink-0"
            disabled={
              !analytics ||
              analytics.financials.availableEscrowBalanceMinor < 100000 ||
              requestingPayout
            }
            onClick={handleRequestPayout}
          >
            {requestingPayout ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Bank Wire...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>
                  Request Payout ({formatMinorUnitsToCurrency(analytics?.financials.availableEscrowBalanceMinor || 0)})
                </span>
              </>
            )}
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
            <span>Recent Settlement Batches</span>
            <span>Min. threshold: ₹1,000.00</span>
          </div>

          {payouts.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed text-center text-xs text-slate-400">
              No payout settlement batches generated yet. Once customer orders are delivered, eligible funds become available for withdrawal.
            </div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4">Payout ID</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Bank Reference (UTR)</th>
                    <th className="py-2.5 px-4 text-right">Settled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {p.payoutNumber}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-600">
                        {formatMinorUnitsToCurrency(p.amountMinor)}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant="outline"
                          className={
                            p.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {p.transactionReference || "Pending Bank Gateway"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-right">
                        {p.settledAt ? new Date(p.settledAt).toLocaleDateString() : "In Transit"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products Leaderboard */}
      {analytics && analytics.topProducts.length > 0 && (
        <Card>
          <CardHeader className="py-3.5 px-5 border-b border-slate-200">
            <CardTitle className="text-sm">Top-Selling Products Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4">Product Title</th>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4">Units Sold</th>
                    <th className="py-2.5 px-4 text-right">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.topProducts.map((p) => (
                    <tr key={p.sku} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{p.title}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{p.sku}</td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium">{p.totalQuantitySold}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {formatMinorUnitsToCurrency(p.totalRevenueMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
