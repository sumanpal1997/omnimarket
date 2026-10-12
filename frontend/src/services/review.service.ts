import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types/api";

export interface ReviewItem {
  _id: string;
  productId: string;
  customerId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  rating: number;
  title: string;
  comment: string;
  images: string[];
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  createdAt: string;
}

export interface ReviewAggregate {
  averageRating: number;
  totalReviews: number;
  starBreakdown: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
}

export const reviewService = {
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    rating?: number
  ): Promise<{
    reviews: ReviewItem[];
    aggregate: ReviewAggregate;
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (rating) params.append("rating", rating.toString());

    const response = await apiClient.get<
      ApiResponse<{
        reviews: ReviewItem[];
        aggregate: ReviewAggregate;
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>
    >(`/reviews/product/${productId}?${params.toString()}`);
    return response.data.data;
  },

  async addReview(payload: CreateReviewPayload): Promise<ReviewItem> {
    const response = await apiClient.post<ApiResponse<{ review: ReviewItem }>>(
      "/reviews",
      payload
    );
    return response.data.data.review;
  },

  async checkEligibility(
    productId: string
  ): Promise<{ canReview: boolean; alreadyReviewed: boolean; reason?: string }> {
    const response = await apiClient.get<
      ApiResponse<{ canReview: boolean; alreadyReviewed: boolean; reason?: string }>
    >(`/reviews/product/${productId}/eligibility`);
    return response.data.data;
  },

  async voteHelpful(reviewId: string): Promise<ReviewItem> {
    const response = await apiClient.post<ApiResponse<{ review: ReviewItem }>>(
      `/reviews/${reviewId}/vote`
    );
    return response.data.data.review;
  },
};
