import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types/api";

export interface CartLineItem {
  productId: string;
  sku: string;
  sellerId: string;
  title: string;
  variantTitle: string;
  unitPriceMinor: number;
  quantity: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  imageUrl?: string;
}

export interface SellerCartBreakdown {
  sellerId: string;
  storeName: string;
  commissionRate: number;
  items: CartLineItem[];
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
}

export interface CartData {
  _id: string;
  items: CartLineItem[];
  pricing: {
    items: CartLineItem[];
    sellerBreakdowns: SellerCartBreakdown[];
    totalItemsCount: number;
    subtotalMinor: number;
    taxMinor: number;
    shippingMinor: number;
    discountMinor: number;
    grandTotalMinor: number;
  };
}

const GUEST_CART_KEY = "omni_guest_cart_token";

export const getGuestCartToken = (): string => {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(GUEST_CART_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(GUEST_CART_KEY, token);
  }
  return token;
};

const getHeaders = () => {
  const token = getGuestCartToken();
  return token ? { "X-Guest-Token": token } : {};
};

export const cartService = {
  async getCart(): Promise<CartData> {
    const response = await apiClient.get<ApiResponse<{ cart: CartData }>>("/cart", {
      headers: getHeaders(),
    });
    return response.data.data.cart;
  },

  async addItem(productId: string, sku: string, quantity = 1): Promise<CartData> {
    const response = await apiClient.post<ApiResponse<{ cart: CartData }>>(
      "/cart/items",
      { productId, sku, quantity },
      { headers: getHeaders() }
    );
    return response.data.data.cart;
  },

  async updateItemQuantity(sku: string, quantity: number): Promise<CartData> {
    const response = await apiClient.patch<ApiResponse<{ cart: CartData }>>(
      `/cart/items/${sku}`,
      { quantity },
      { headers: getHeaders() }
    );
    return response.data.data.cart;
  },

  async removeItem(sku: string): Promise<CartData> {
    const response = await apiClient.delete<ApiResponse<{ cart: CartData }>>(
      `/cart/items/${sku}`,
      { headers: getHeaders() }
    );
    return response.data.data.cart;
  },

  async clearCart(): Promise<void> {
    await apiClient.delete("/cart", { headers: getHeaders() });
  },

  async mergeGuestCart(): Promise<CartData | null> {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem(GUEST_CART_KEY);
    if (!token) return null;

    try {
      const response = await apiClient.post<ApiResponse<{ cart: CartData }>>("/cart/merge", {
        guestToken: token,
      });
      localStorage.removeItem(GUEST_CART_KEY);
      return response.data.data.cart;
    } catch {
      return null;
    }
  },
};
