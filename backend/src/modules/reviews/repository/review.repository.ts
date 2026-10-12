import { Types } from "mongoose";
import { ReviewModel, IReview } from "../model/review.model.js";

export class ReviewRepository {
  public async create(data: Partial<IReview>): Promise<IReview> {
    const review = new ReviewModel(data);
    return await review.save();
  }

  public async findByProductAndCustomer(
    productId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<IReview | null> {
    return await ReviewModel.findOne({ productId, customerId });
  }

  public async findReviewsByProduct(
    productId: string | Types.ObjectId,
    filter: { rating?: number },
    pagination: { skip: number; limit: number }
  ): Promise<IReview[]> {
    const query: Record<string, any> = {
      productId,
      status: "PUBLISHED",
    };
    if (filter.rating) {
      query.rating = filter.rating;
    }

    return await ReviewModel.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("customerId", "firstName lastName");
  }

  public async countReviewsByProduct(
    productId: string | Types.ObjectId,
    filter: { rating?: number }
  ): Promise<number> {
    const query: Record<string, any> = {
      productId,
      status: "PUBLISHED",
    };
    if (filter.rating) {
      query.rating = filter.rating;
    }
    return await ReviewModel.countDocuments(query);
  }

  public async voteHelpful(
    reviewId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<IReview | null> {
    return await ReviewModel.findOneAndUpdate(
      {
        _id: reviewId,
        helpfulVotedUsers: { $ne: new Types.ObjectId(userId) },
      },
      {
        $inc: { helpfulVotes: 1 },
        $push: { helpfulVotedUsers: new Types.ObjectId(userId) },
      },
      { new: true }
    );
  }

  public async getRatingAggregate(
    productId: string | Types.ObjectId
  ): Promise<{
    averageRating: number;
    totalReviews: number;
    starBreakdown: { 1: number; 2: number; 3: number; 4: number; 5: number };
  }> {
    const results = await ReviewModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          status: "PUBLISHED",
        },
      },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
    ]);

    const starBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalReviews = 0;
    let totalScore = 0;

    results.forEach((r: { _id: number; count: number }) => {
      const star = r._id as 1 | 2 | 3 | 4 | 5;
      if (starBreakdown[star] !== undefined) {
        starBreakdown[star] = r.count;
      }
      totalReviews += r.count;
      totalScore += r._id * r.count;
    });

    const averageRating = totalReviews > 0 ? Number((totalScore / totalReviews).toFixed(1)) : 0;

    return {
      averageRating,
      totalReviews,
      starBreakdown,
    };
  }
}

export const reviewRepository = new ReviewRepository();
