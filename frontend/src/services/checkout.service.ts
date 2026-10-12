import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types/api";
import { CartLineItem, SellerCartBreakdown } from "./cart.service";
import { Address } from "./user.service";

export interface CheckoutPreviewData {
  shippingAddress: Address;
  items: CartLineItem[];
  sellerBreakdowns: SellerCartBreakdown[];
  pricing: {
    subtotalMinor: number;
    taxMinor: number;
    shippingMinor: number;
    discountMinor: number;
    grandTotalMinor: number;
  };
}

export const checkoutService = {
  async getPreview(addressId: string, couponCode?: string): Promise<CheckoutPreviewData> {
    const response = await apiClient.post<ApiResponse<{ checkout: CheckoutPreviewData }>>(
      "/checkout/preview",
      { addressId, couponCode }
    );
    return response.data.data.checkout;
  },
};
