import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types/api";

export interface PlatformAnalytics {
  financials: {
    gmvMinor: number;
    platformCommissionMinor: number;
    merchantPayoutsMinor: number;
    currency: string;
  };
  orders: {
    total: number;
    paid: number;
    pending: number;
    failed: number;
  };
  users: {
    total: number;
    customers: number;
    sellers: number;
    admins: number;
  };
  sellers: {
    total: number;
    active: number;
    pendingKYC: number;
    suspended: number;
  };
  products: {
    total: number;
    approved: number;
    pendingModeration: number;
    rejected: number;
  };
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    grandTotalMinor: number;
    paymentStatus: string;
    createdAt: string;
    customerEmail?: string;
  }>;
}

export interface AdminSellerItem {
  _id: string;
  storeName: string;
  slug: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  commissionRate: number;
  businessInfo: {
    legalName: string;
    registrationNumber: string;
    taxId: string;
    address: string;
  };
  bankAccount: {
    bankName: string;
    accountNumberMasked: string;
    routingCode: string;
  };
  userId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: string;
  };
  rejectionReason?: string;
  suspendedReason?: string;
  createdAt: string;
}

export interface AdminProductItem {
  _id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
  images: string[];
  rejectionReason?: string;
  sellerId?: {
    _id: string;
    storeName: string;
    slug: string;
  };
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
  };
  variants: Array<{
    sku: string;
    title: string;
    priceMinor: number;
    stock?: number;
  }>;
  createdAt: string;
}

export interface AdminUserItem {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  phone?: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export const adminService = {
  async getAnalytics(): Promise<PlatformAnalytics> {
    const response = await apiClient.get<ApiResponse<PlatformAnalytics>>("/admin/analytics");
    return response.data.data;
  },

  async getSellers(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    sellers: AdminSellerItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append("status", status);

    const response = await apiClient.get<
      ApiResponse<{
        sellers: AdminSellerItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>
    >(`/admin/sellers?${params.toString()}`);
    return response.data.data;
  },

  async moderateSeller(
    sellerId: string,
    payload: {
      action: "APPROVE" | "REJECT" | "SUSPEND" | "ACTIVATE";
      reason?: string;
      commissionRate?: number;
    }
  ): Promise<AdminSellerItem> {
    const response = await apiClient.patch<ApiResponse<{ seller: AdminSellerItem }>>(
      `/admin/sellers/${sellerId}/status`,
      payload
    );
    return response.data.data.seller;
  },

  async getProducts(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    products: AdminProductItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append("status", status);

    const response = await apiClient.get<
      ApiResponse<{
        products: AdminProductItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>
    >(`/admin/products?${params.toString()}`);
    return response.data.data;
  },

  async moderateProduct(
    productId: string,
    payload: {
      action: "APPROVE" | "REJECT" | "ARCHIVE";
      rejectionReason?: string;
    }
  ): Promise<AdminProductItem> {
    const response = await apiClient.patch<ApiResponse<{ product: AdminProductItem }>>(
      `/admin/products/${productId}/status`,
      payload
    );
    return response.data.data.product;
  },

  async getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string
  ): Promise<{
    users: AdminUserItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append("search", search);
    if (role) params.append("role", role);

    const response = await apiClient.get<
      ApiResponse<{
        users: AdminUserItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>
    >(`/admin/users?${params.toString()}`);
    return response.data.data;
  },

  async toggleUserStatus(
    userId: string,
    payload: { isActive: boolean; reason?: string }
  ): Promise<AdminUserItem> {
    const response = await apiClient.patch<ApiResponse<{ user: AdminUserItem }>>(
      `/admin/users/${userId}/status`,
      payload
    );
    return response.data.data.user;
  },
};
