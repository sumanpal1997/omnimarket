"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import {
  adminService,
  PlatformAnalytics,
  AdminSellerItem,
  AdminProductItem,
  AdminUserItem,
} from "@/services/admin.service";
import { formatMinorUnitsToCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Store,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";

type AdminTab = "analytics" | "sellers" | "products" | "users";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<AdminTab>("analytics");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);

  // Sellers state
  const [sellers, setSellers] = useState<AdminSellerItem[]>([]);
  const [sellerStatusFilter, setSellerStatusFilter] = useState("PENDING");
  const [selectedSeller, setSelectedSeller] = useState<AdminSellerItem | null>(null);
  const [sellerCommissionRate, setSellerCommissionRate] = useState<number>(10);
  const [rejectionReason, setRejectionReason] = useState("");
  const [moderatingSeller, setModeratingSeller] = useState(false);

  // Products state
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [productStatusFilter, setProductStatusFilter] = useState("SUBMITTED");
  const [selectedProduct, setSelectedProduct] = useState<AdminProductItem | null>(null);
  const [productRejectionReason, setProductRejectionReason] = useState("");
  const [moderatingProduct, setModeratingProduct] = useState(false);

  // Users state
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [togglingUser, setTogglingUser] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/dashboard/admin");
      return;
    }

    if (user.role !== "ADMIN") {
      setLoading(false);
      return;
    }

    fetchAnalytics();
  }, [user, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load platform analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSellers(1, 20, sellerStatusFilter || undefined);
      setSellers(data.sellers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await adminService.getProducts(1, 20, productStatusFilter || undefined);
      setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers(1, 20, userSearch || undefined, userRoleFilter || undefined);
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;
    if (activeTab === "analytics") fetchAnalytics();
    if (activeTab === "sellers") fetchSellers();
    if (activeTab === "products") fetchProducts();
    if (activeTab === "users") fetchUsers();
  }, [activeTab, sellerStatusFilter, productStatusFilter, userRoleFilter]);

  const handleModerateSeller = async (action: "APPROVE" | "REJECT" | "SUSPEND" | "ACTIVATE") => {
    if (!selectedSeller) return;
    setModeratingSeller(true);
    try {
      await adminService.moderateSeller(selectedSeller._id, {
        action,
        reason: rejectionReason || undefined,
        commissionRate: action === "APPROVE" ? Number(sellerCommissionRate) : undefined,
      });
      setSelectedSeller(null);
      setRejectionReason("");
      await fetchSellers();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to moderate seller");
    } finally {
      setModeratingSeller(false);
    }
  };

  const handleModerateProduct = async (action: "APPROVE" | "REJECT") => {
    if (!selectedProduct) return;
    setModeratingProduct(true);
    try {
      await adminService.moderateProduct(selectedProduct._id, {
        action,
        rejectionReason: action === "REJECT" ? productRejectionReason : undefined,
      });
      setSelectedProduct(null);
      setProductRejectionReason("");
      await fetchProducts();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to moderate product");
    } finally {
      setModeratingProduct(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: AdminUserItem) => {
    const isActivating = targetUser.status !== "ACTIVE";
    if (
      !confirm(
        isActivating
          ? `Reactivate account for ${targetUser.email}?`
          : `Suspend account for ${targetUser.email}? This will immediately revoke all active refresh tokens and user sessions.`
      )
    ) {
      return;
    }

    setTogglingUser(true);
    try {
      await adminService.toggleUserStatus(targetUser._id, {
        isActive: isActivating,
        reason: isActivating ? "Reactivated by admin" : "Suspended by admin",
      });
      await fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to update user status");
    } finally {
      setTogglingUser(false);
    }
  };

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <Card className="p-8 border-red-200">
          <ShieldAlert className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <CardTitle className="text-xl font-bold">Access Restricted</CardTitle>
          <p className="mt-2 text-xs text-slate-500">
            Administrative credentials are required to view the marketplace management dashboard.
          </p>
          <Link href="/" className="inline-block mt-6">
            <Button size="sm">Return to Storefront</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 max-w-7xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Marketplace Administration
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global governance: Gross Merchandise Value, vendor compliance, product moderation & access control
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 text-xs font-medium space-x-6">
        {[
          { key: "analytics", label: "Executive Analytics & KPIs" },
          { key: "sellers", label: "Seller KYC Applications" },
          { key: "products", label: "Product Moderation" },
          { key: "users", label: "User Governance" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as AdminTab)}
            className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* TAB 1: EXECUTIVE ANALYTICS */}
      {!loading && activeTab === "analytics" && analytics && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600">Platform GMV</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatMinorUnitsToCurrency(analytics.financials.gmvMinor)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                  Settled transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600">Marketplace Commission</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatMinorUnitsToCurrency(analytics.financials.platformCommissionMinor)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Net platform revenue (10% standard fee)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600">Merchant Payouts</CardTitle>
                <Store className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatMinorUnitsToCurrency(analytics.financials.merchantPayoutsMinor)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Disbursed / Escrowed to vendors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{analytics.orders.total}</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {analytics.orders.paid} paid • {analytics.orders.pending} pending
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Operational Health Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Sellers Network</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Active Approved Merchants:</span>
                <span className="font-bold text-emerald-600">{analytics.sellers.active}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Pending KYC Review:</span>
                <span className="font-bold text-amber-600">{analytics.sellers.pendingKYC}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Suspended Merchants:</span>
                <span className="font-bold text-red-600">{analytics.sellers.suspended}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Catalog Inventory</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Approved Products:</span>
                <span className="font-bold text-emerald-600">{analytics.products.approved}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Pending Moderation:</span>
                <span className="font-bold text-amber-600">{analytics.products.pendingModeration}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Rejected / Delisted:</span>
                <span className="font-bold text-red-600">{analytics.products.rejected}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">User Ecosystem</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Total Registered Users:</span>
                <span className="font-bold text-slate-900">{analytics.users.total}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Buyers / Customers:</span>
                <span className="font-medium text-slate-700">{analytics.users.customers}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Vendors / Merchants:</span>
                <span className="font-medium text-slate-700">{analytics.users.sellers}</span>
              </div>
            </Card>
          </div>

          {/* Recent Orders Table */}
          <Card>
            <CardHeader className="py-3 px-5 border-b border-slate-200">
              <CardTitle className="text-sm">Recent Platform Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Order Number</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Total Amount</th>
                      <th className="py-2.5 px-4">Payment</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.recentOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {order.customerEmail || "Guest / Verified"}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {formatMinorUnitsToCurrency(order.grandTotalMinor)}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant="outline"
                            className={
                              order.paymentStatus === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }
                          >
                            {order.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Link href={`/orders/${order.orderNumber}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              Inspect
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: SELLER KYC MODERATION */}
      {!loading && activeTab === "sellers" && (
        <div className="space-y-4">
          <div className="flex gap-2 text-xs">
            {["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"].map((st) => (
              <button
                key={st}
                onClick={() => setSellerStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                  sellerStatusFilter === st
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {sellers.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
              No seller applications found under status '{sellerStatusFilter}'.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sellers.map((seller) => (
                <Card key={seller._id} className="p-5 space-y-3 text-xs border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{seller.storeName}</h3>
                      <p className="text-[11px] text-slate-400">Slug: /{seller.slug}</p>
                    </div>
                    <Badge variant="outline">{seller.status}</Badge>
                  </div>

                  <div className="space-y-1 text-slate-600">
                    <p><span className="font-semibold">Legal Name:</span> {seller.businessInfo.legalName}</p>
                    <p><span className="font-semibold">GSTIN / Tax ID:</span> {seller.businessInfo.taxId}</p>
                    <p><span className="font-semibold">Registered Address:</span> {seller.businessInfo.address}</p>
                    <p><span className="font-semibold">Bank:</span> {seller.bankAccount.bankName} ({seller.bankAccount.accountNumberMasked}) • IFSC: {seller.bankAccount.routingCode}</p>
                    <p><span className="font-semibold">Applicant User:</span> {seller.userId?.firstName} {seller.userId?.lastName} ({seller.userId?.email})</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Commission: <strong>{seller.commissionRate}%</strong></span>
                    <div className="flex space-x-2">
                      {seller.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                            onClick={() => {
                              setSelectedSeller(seller);
                              setSellerCommissionRate(seller.commissionRate || 10);
                            }}
                          >
                            Review & Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                            onClick={() => setSelectedSeller(seller)}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {seller.status === "ACTIVE" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-amber-600 border-amber-200 hover:bg-amber-50 h-7 text-xs"
                          onClick={() => setSelectedSeller(seller)}
                        >
                          Suspend Store
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Seller Action Modal */}
          {selectedSeller && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="max-w-md w-full p-6 space-y-4">
                <CardHeader className="p-0">
                  <CardTitle className="text-base">
                    Moderate Seller: {selectedSeller.storeName}
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Legal Name: {selectedSeller.businessInfo.legalName} • GSTIN: {selectedSeller.businessInfo.taxId}
                  </p>
                </CardHeader>

                {selectedSeller.status === "PENDING" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Platform Commission Rate (%)
                      </label>
                      <Input
                        type="number"
                        value={sellerCommissionRate}
                        onChange={(e) => setSellerCommissionRate(Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Rejection Reason (if rejecting)
                      </label>
                      <Input
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g. Invalid GST document or failed bank verification"
                      />
                    </div>
                  </div>
                )}

                {selectedSeller.status === "ACTIVE" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Suspension Reason
                      </label>
                      <Input
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g. Policy violation or dispute rate exceeded"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={moderatingSeller}
                    onClick={() => setSelectedSeller(null)}
                  >
                    Cancel
                  </Button>
                  {selectedSeller.status === "PENDING" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={moderatingSeller}
                        onClick={() => handleModerateSeller("REJECT")}
                      >
                        Confirm Rejection
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={moderatingSeller}
                        onClick={() => handleModerateSeller("APPROVE")}
                      >
                        Approve & Activate
                      </Button>
                    </>
                  )}
                  {selectedSeller.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={moderatingSeller}
                      onClick={() => handleModerateSeller("SUSPEND")}
                    >
                      Confirm Suspension
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCT MODERATION */}
      {!loading && activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex gap-2 text-xs">
            {["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setProductStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                  productStatusFilter === st
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {products.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
              No products found under status '{productStatusFilter}'.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product._id} className="p-4 space-y-3 text-xs border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{product.status}</Badge>
                    <span className="text-[11px] text-slate-400">
                      {product.sellerId?.storeName || "Merchant"}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 line-clamp-1">{product.title}</h4>
                    <p className="text-[11px] text-slate-500">Category: {product.categoryId?.name || "General"}</p>
                    <p className="text-[11px] text-slate-500">Variants: {product.variants?.length || 0}</p>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-900">
                      {product.variants?.[0]
                        ? formatMinorUnitsToCurrency(product.variants[0].priceMinor)
                        : "N/A"}
                    </span>
                    <div className="flex space-x-1.5">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                        onClick={() => {
                          setSelectedProduct(product);
                          handleModerateProduct("APPROVE");
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                        onClick={() => setSelectedProduct(product)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Product Rejection Dialog */}
          {selectedProduct && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="max-w-md w-full p-6 space-y-4">
                <CardHeader className="p-0">
                  <CardTitle className="text-base">Reject Product Listing</CardTitle>
                  <p className="text-xs text-slate-500">{selectedProduct.title}</p>
                </CardHeader>
                <div className="text-xs space-y-2">
                  <label className="font-medium text-slate-700 block">Rejection Feedback to Seller</label>
                  <Input
                    value={productRejectionReason}
                    onChange={(e) => setProductRejectionReason(e.target.value)}
                    placeholder="e.g. Missing required safety certifications or unclear images"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setSelectedProduct(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handleModerateProduct("REJECT")}
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: USER GOVERNANCE */}
      {!loading && activeTab === "users" && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={fetchUsers} className="text-xs">
                Search
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Joined</th>
                  <th className="py-2.5 px-4 text-right">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{u.email}</td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline">{u.role}</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge
                        variant="outline"
                        className={
                          u.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {u.role !== "ADMIN" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={togglingUser}
                          onClick={() => handleToggleUserStatus(u)}
                          className={`h-7 text-xs ${
                            u.status === "ACTIVE"
                              ? "text-red-600 border-red-200 hover:bg-red-50"
                              : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          }`}
                        >
                          {u.status === "ACTIVE" ? "Suspend Account" : "Reactivate"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
