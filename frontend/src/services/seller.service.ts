import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types/api";
import { SellerApplicationFormData } from "@/schemas/seller.schema";

export type SellerStatus = "PENDING" | "APPROVED" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "REJECTED";

export interface SellerProfile {
  _id: string;
  userId: string;
  storeName: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
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
  commissionRate: number;
  status: SellerStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface SellerAnalyticsSummary {
  financials: {
    lifetimeGrossSalesMinor: number;
    lifetimePlatformCommissionMinor: number;
    lifetimeNetEarningsMinor: number;
    availableEscrowBalanceMinor: number;
    pendingPayoutBalanceMinor: number;
    settledPayoutsMinor: number;
    currency: string;
  };
  orders: {
    total: number;
    delivered: number;
    processing: number;
    shipped: number;
    pending: number;
    cancelled: number;
  };
  products: {
    totalApproved: number;
    pendingModeration: number;
    lowStockCount: number;
  };
  topProducts: Array<{
    sku: string;
    title: string;
    totalQuantitySold: number;
    totalRevenueMinor: number;
  }>;
  seller: {
    storeName: string;
    slug: string;
    commissionRate: number;
    bankAccount: {
      bankName: string;
      accountNumberMasked: string;
      routingCode: string;
    };
  };
}

export interface PayoutItem {
  _id: string;
  payoutNumber: string;
  amountMinor: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED";
  bankAccount: {
    bankName: string;
    accountNumberMasked: string;
    routingCode: string;
  };
  ordersIncluded: string[];
  transactionReference?: string;
  failureReason?: string;
  settledAt?: string;
  createdAt: string;
}

export const sellerService = {
  async apply(data: SellerApplicationFormData): Promise<SellerProfile> {
    const response = await apiClient.post<ApiResponse<{ seller: SellerProfile }>>(
      "/sellers/apply",
      data
    );
    return response.data.data.seller;
  },

  async getMyProfile(): Promise<SellerProfile> {
    const response = await apiClient.get<ApiResponse<{ seller: SellerProfile }>>(
      "/sellers/me"
    );
    return response.data.data.seller;
  },

  async getAnalytics(): Promise<SellerAnalyticsSummary> {
    const response = await apiClient.get<ApiResponse<SellerAnalyticsSummary>>(
      "/sellers/dashboard/analytics"
    );
    return response.data.data;
  },

  async getPayouts(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    payouts: PayoutItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const response = await apiClient.get<
      ApiResponse<{
        payouts: PayoutItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>
    >(`/sellers/dashboard/payouts?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  async requestPayout(): Promise<PayoutItem> {
    const response = await apiClient.post<ApiResponse<{ payout: PayoutItem }>>(
      "/sellers/dashboard/payouts/request"
    );
    return response.data.data.payout;
  },
};
