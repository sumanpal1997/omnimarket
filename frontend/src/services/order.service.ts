import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types/api";
import { Address } from "./user.service";

export type MasterPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type SellerOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED";

export interface OrderItem {
  productId: string;
  sku: string;
  title: string;
  variantTitle: string;
  priceMinor: number;
  quantity: number;
  taxMinor: number;
  totalMinor: number;
  imageUrl?: string;
}

export interface ShippingTracking {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface SellerOrder {
  _id: string;
  masterOrderId: string;
  sellerId: {
    _id: string;
    storeName: string;
    contactEmail?: string;
  } | string;
  subOrderNumber: string;
  items: OrderItem[];
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
  commissionMinor: number;
  sellerPayoutMinor: number;
  status: SellerOrderStatus;
  statusHistory: Array<{
    status: SellerOrderStatus;
    timestamp: string;
    note?: string;
  }>;
  tracking?: ShippingTracking;
  createdAt: string;
}

export interface MasterOrder {
  _id: string;
  orderNumber: string;
  customerId: string;
  subOrderIds: SellerOrder[];
  totalItemsCount: number;
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  currency: string;
  paymentStatus: MasterPaymentStatus;
  paymentId?: string;
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  addressId: string;
  paymentProvider: "STRIPE" | "RAZORPAY";
  idempotencyKey: string;
  couponCode?: string;
}

export interface CreateOrderResponse {
  order: MasterOrder;
  sellerOrders: SellerOrder[];
  clientSecret: string;
}

export const orderService = {
  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    const response = await apiClient.post<ApiResponse<CreateOrderResponse>>(
      "/orders",
      payload
    );
    return response.data.data;
  },

  async getMyOrders(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: MasterOrder[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const response = await apiClient.get<
      ApiResponse<{
        orders: MasterOrder[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>
    >(`/orders?page=${page}&limit=${limit}`);
    return response.data.data;
  },

  async getOrderDetail(orderNumber: string): Promise<MasterOrder> {
    const response = await apiClient.get<ApiResponse<{ order: MasterOrder }>>(
      `/orders/${orderNumber}`
    );
    return response.data.data.order;
  },

  async getSellerOrders(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<{
    orders: SellerOrder[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) query.append("status", status);

    const response = await apiClient.get<
      ApiResponse<{
        orders: SellerOrder[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>
    >(`/orders/seller/sub-orders?${query.toString()}`);
    return response.data.data;
  },

  async updateSellerOrderStatus(
    subOrderId: string,
    payload: {
      status: SellerOrderStatus;
      note?: string;
      tracking?: { carrier: string; trackingNumber: string; trackingUrl?: string };
    }
  ): Promise<SellerOrder> {
    const response = await apiClient.patch<ApiResponse<{ subOrder: SellerOrder }>>(
      `/orders/seller/sub-orders/${subOrderId}/status`,
      payload
    );
    return response.data.data.subOrder;
  },

  async simulatePaymentSuccess(paymentId: string): Promise<{ status: string }> {
    const response = await apiClient.post<ApiResponse<{ status: string }>>(
      "/payments/mock-success",
      { paymentId }
    );
    return response.data.data;
  },
};
