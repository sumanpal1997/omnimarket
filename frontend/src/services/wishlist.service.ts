import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types/api";
import { Product } from "./product.service";

export interface WishlistData {
  _id: string;
  userId: string;
  productIds: Product[];
}

export const wishlistService = {
  async getWishlist(): Promise<WishlistData> {
    const response = await apiClient.get<ApiResponse<{ wishlist: WishlistData }>>("/wishlist");
    return response.data.data.wishlist;
  },

  async toggleProduct(
    productId: string
  ): Promise<{ inWishlist: boolean; wishlist: WishlistData }> {
    const response = await apiClient.post<
      ApiResponse<{ inWishlist: boolean; wishlist: WishlistData }>
    >(`/wishlist/toggle/${productId}`);
    return response.data.data;
  },
};
