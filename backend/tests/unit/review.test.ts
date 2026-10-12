import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { ReviewService } from "../../src/modules/reviews/service/review.service.js";
import { ProductModel } from "../../src/modules/products/model/product.model.js";
import { MasterOrderModel, SellerOrderModel } from "../../src/modules/orders/model/order.model.js";
import { ForbiddenError, ConflictError } from "../../src/core/errors/app-error.js";

describe("Product Reviews & Ratings Unit Tests", () => {
  let reviewService: ReviewService;
  let mockRepository: any;
  let mockEventBus: any;

  beforeEach(() => {
    mockRepository = {
      findByProductAndCustomer: vi.fn(),
      create: vi.fn(),
      getRatingAggregate: vi.fn(),
      findReviewsByProduct: vi.fn(),
      countReviewsByProduct: vi.fn(),
      voteHelpful: vi.fn(),
    };
    mockEventBus = {
      publish: vi.fn(),
    };
    reviewService = new ReviewService(mockRepository, mockEventBus);
  });

  describe("addReview", () => {
    it("should reject review if customer has no verified delivered purchase for the product", async () => {
      const productId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();

      vi.spyOn(ProductModel, "findById").mockResolvedValue({ _id: productId } as any);
      mockRepository.findByProductAndCustomer.mockResolvedValue(null);

      // Customer has no paid master orders
      vi.spyOn(MasterOrderModel, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(SellerOrderModel, "findOne").mockResolvedValue(null);

      await expect(
        reviewService.addReview(userId, {
          productId,
          rating: 5,
          title: "Amazing quality",
          comment: "Loved the sound and battery life!",
          images: [],
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("should reject review if customer has already submitted a review for this product", async () => {
      const productId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();

      vi.spyOn(ProductModel, "findById").mockResolvedValue({ _id: productId } as any);
      mockRepository.findByProductAndCustomer.mockResolvedValue({
        _id: new Types.ObjectId(),
        rating: 4,
      });

      await expect(
        reviewService.addReview(userId, {
          productId,
          rating: 5,
          title: "Another review",
          comment: "Trying to submit twice",
          images: [],
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should publish review, update catalog rating summary, and emit event for verified buyer", async () => {
      const productId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();
      const masterOrderId = new Types.ObjectId();
      const sellerOrderId = new Types.ObjectId();

      vi.spyOn(ProductModel, "findById").mockResolvedValue({ _id: productId } as any);
      mockRepository.findByProductAndCustomer.mockResolvedValue(null);

      vi.spyOn(MasterOrderModel, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: masterOrderId }]),
      } as any);

      vi.spyOn(SellerOrderModel, "findOne").mockResolvedValue({
        _id: sellerOrderId,
        status: "DELIVERED",
      } as any);

      mockRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        productId,
        customerId: userId,
        orderId: sellerOrderId,
        rating: 5,
        title: "Best purchase this year",
        comment: "Excellent finish and sound clarity.",
        isVerifiedPurchase: true,
      });

      mockRepository.getRatingAggregate.mockResolvedValue({
        averageRating: 4.8,
        totalReviews: 12,
        starBreakdown: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 9 },
      });

      vi.spyOn(ProductModel, "findByIdAndUpdate").mockResolvedValue({} as any);

      const review = await reviewService.addReview(userId, {
        productId,
        rating: 5,
        title: "Best purchase this year",
        comment: "Excellent finish and sound clarity.",
        images: ["https://example.com/photo.jpg"],
      });

      expect(review.isVerifiedPurchase).toBe(true);
      expect(ProductModel.findByIdAndUpdate).toHaveBeenCalledWith(productId, {
        ratingSummary: {
          averageRating: 4.8,
          totalReviews: 12,
        },
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        "review.created",
        expect.objectContaining({
          productId,
          customerId: userId,
          rating: 5,
        })
      );
    });
  });

  describe("voteHelpful", () => {
    it("should reject repeat helpful votes from the same customer", async () => {
      const reviewId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();

      // Repository returns null if user has already voted
      mockRepository.voteHelpful.mockResolvedValue(null);

      await expect(reviewService.voteHelpful(reviewId, userId)).rejects.toThrow(ConflictError);
    });

    it("should successfully record helpful vote and return updated review", async () => {
      const reviewId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();

      mockRepository.voteHelpful.mockResolvedValue({
        _id: reviewId,
        helpfulVotes: 3,
      });

      const updated = await reviewService.voteHelpful(reviewId, userId);
      expect(updated.helpfulVotes).toBe(3);
    });
  });

  describe("checkEligibility", () => {
    it("should report eligible for customers with delivered orders", async () => {
      const productId = new Types.ObjectId().toString();
      const userId = new Types.ObjectId().toString();

      mockRepository.findByProductAndCustomer.mockResolvedValue(null);
      vi.spyOn(MasterOrderModel, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([{ _id: new Types.ObjectId() }]),
      } as any);
      vi.spyOn(SellerOrderModel, "findOne").mockResolvedValue({ _id: new Types.ObjectId() } as any);

      const eligibility = await reviewService.checkEligibility(userId, productId);
      expect(eligibility.canReview).toBe(true);
      expect(eligibility.alreadyReviewed).toBe(false);
    });
  });
});
