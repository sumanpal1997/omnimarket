import { Types } from "mongoose";
import { IReview } from "../model/review.model.js";
import { reviewRepository, ReviewRepository } from "../repository/review.repository.js";
import { ProductModel } from "../../products/model/product.model.js";
import { MasterOrderModel, SellerOrderModel } from "../../orders/model/order.model.js";
import { domainEventBus, DomainEventBus } from "../../../core/events/event-bus.js";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../../../core/errors/app-error.js";
import { CreateReviewInput } from "../validation/review.validation.js";

export class ReviewService {
  constructor(
    private repository: ReviewRepository = reviewRepository,
    private eventBus: DomainEventBus = domainEventBus
  ) {}

  public async addReview(
    userId: string,
    input: CreateReviewInput
  ): Promise<IReview> {
    const { productId, rating, title, comment, images } = input;

    // 1. Verify product exists
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    // 2. Prevent duplicate reviews by the same customer
    const existingReview = await this.repository.findByProductAndCustomer(
      productId,
      userId
    );
    if (existingReview) {
      throw new ConflictError("You have already submitted a review for this product");
    }

    // 3. Verified Purchase Check: Must have a DELIVERED order for this product
    const customerMasterOrders = await MasterOrderModel.find({
      customerId: new Types.ObjectId(userId),
      paymentStatus: "PAID",
    }).select("_id");

    const masterOrderIds = customerMasterOrders.map((mo) => mo._id);

    const deliveredSubOrder = await SellerOrderModel.findOne({
      masterOrderId: { $in: masterOrderIds },
      "items.productId": new Types.ObjectId(productId),
      status: "DELIVERED",
    });

    if (!deliveredSubOrder) {
      throw new ForbiddenError(
        "Only verified purchasers with delivered orders are eligible to write a review"
      );
    }

    // 4. Save Review
    const review = await this.repository.create({
      productId: new Types.ObjectId(productId),
      customerId: new Types.ObjectId(userId),
      orderId: deliveredSubOrder._id,
      rating,
      title,
      comment,
      images: images || [],
      isVerifiedPurchase: true,
      helpfulVotes: 0,
      helpfulVotedUsers: [],
      status: "PUBLISHED",
    });

    // 5. Atomic recalculation of rating summary on Product catalog
    const aggregate = await this.repository.getRatingAggregate(productId);
    await ProductModel.findByIdAndUpdate(productId, {
      ratingSummary: {
        averageRating: aggregate.averageRating,
        totalReviews: aggregate.totalReviews,
      },
    });

    // 6. Publish domain event
    this.eventBus.publish("review.created", {
      reviewId: review._id.toString(),
      productId,
      customerId: userId,
      rating,
    });

    return review;
  }

  public async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    ratingFilter?: number
  ): Promise<{
    reviews: IReview[];
    aggregate: {
      averageRating: number;
      totalReviews: number;
      starBreakdown: { 1: number; 2: number; 3: number; 4: number; 5: number };
    };
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [reviews, total, aggregate] = await Promise.all([
      this.repository.findReviewsByProduct(
        productId,
        { rating: ratingFilter },
        { skip, limit }
      ),
      this.repository.countReviewsByProduct(productId, { rating: ratingFilter }),
      this.repository.getRatingAggregate(productId),
    ]);

    return {
      reviews,
      aggregate,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public async voteHelpful(reviewId: string, userId: string): Promise<IReview> {
    const updated = await this.repository.voteHelpful(reviewId, userId);
    if (!updated) {
      throw new ConflictError(
        "You have already voted this review as helpful or the review does not exist"
      );
    }
    return updated;
  }

  public async checkEligibility(
    userId: string,
    productId: string
  ): Promise<{
    canReview: boolean;
    alreadyReviewed: boolean;
    reason?: string;
  }> {
    const existingReview = await this.repository.findByProductAndCustomer(
      productId,
      userId
    );
    if (existingReview) {
      return {
        canReview: false,
        alreadyReviewed: true,
        reason: "You have already reviewed this product.",
      };
    }

    const customerMasterOrders = await MasterOrderModel.find({
      customerId: new Types.ObjectId(userId),
      paymentStatus: "PAID",
    }).select("_id");

    const masterOrderIds = customerMasterOrders.map((mo) => mo._id);

    const deliveredSubOrder = await SellerOrderModel.findOne({
      masterOrderId: { $in: masterOrderIds },
      "items.productId": new Types.ObjectId(productId),
      status: "DELIVERED",
    });

    if (!deliveredSubOrder) {
      return {
        canReview: false,
        alreadyReviewed: false,
        reason: "You can only review products from delivered orders.",
      };
    }

    return {
      canReview: true,
      alreadyReviewed: false,
    };
  }
}

export const reviewService = new ReviewService();
