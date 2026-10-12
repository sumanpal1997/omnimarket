import { apiClient } from "@/lib/api-client";
import { ApiResponse, PaginationMeta } from "@/types/api";

export interface ProductVariant {
  _id: string;
  sku: string;
  title: string;
  priceMinor: number;
  compareAtPriceMinor?: number;
  attributes: Record<string, string>;
  images: string[];
  isActive: boolean;
}

export interface Product {
  _id: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
  rejectionReason?: string;
  categoryId: { _id: string; name: string; slug: string };
  brandId?: { _id: string; name: string; slug: string };
  sellerId: { _id: string; storeName: string; slug: string };
  variants: ProductVariant[];
  ratingSummary: {
    averageRating: number;
    totalReviews: number;
  };
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface CatalogQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "price_asc" | "price_desc" | "newest" | "rating";
  search?: string;
}

export const productService = {
  async getCatalog(
    params: CatalogQueryParams = {}
  ): Promise<{ items: Product[]; meta?: PaginationMeta }> {
    const response = await apiClient.get<ApiResponse<Product[]>>("/products", { params });
    return { items: response.data.data, meta: response.data.meta };
  },

  async getBySlug(
    slug: string
  ): Promise<{ product: Product; inventory: Record<string, number> }> {
    const response = await apiClient.get<
      ApiResponse<{ product: Product; inventory: Record<string, number> }>
    >(`/products/detail/${slug}`);
    return response.data.data;
  },

  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<{ categories: Category[] }>>("/categories");
    return response.data.data.categories;
  },

  async getBrands(): Promise<Brand[]> {
    const response = await apiClient.get<ApiResponse<{ brands: Brand[] }>>("/brands");
    return response.data.data.brands;
  },

  async createProduct(data: any): Promise<Product> {
    const response = await apiClient.post<ApiResponse<{ product: Product }>>(
      "/products/seller",
      data
    );
    return response.data.data.product;
  },

  async getMyProducts(
    status?: string,
    page = 1
  ): Promise<{ items: Product[]; meta?: PaginationMeta }> {
    const response = await apiClient.get<ApiResponse<Product[]>>("/products/seller/my-products", {
      params: { status, page },
    });
    return { items: response.data.data, meta: response.data.meta };
  },

  async submitForApproval(productId: string): Promise<Product> {
    const response = await apiClient.post<ApiResponse<{ product: Product }>>(
      `/products/seller/${productId}/submit`
    );
    return response.data.data.product;
  },
};
