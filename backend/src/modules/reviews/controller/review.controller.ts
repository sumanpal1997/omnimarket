import { Request, Response, NextFunction } from "express";
import { reviewService, ReviewService } from "../service/review.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { HttpStatus } from "../../../core/constants/http-status.js";

export class ReviewController {
  constructor(private service: ReviewService = reviewService) {}

  public addReview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const review = await this.service.addReview(req.user!.id, req.body);
      ResponseUtil.sendSuccess(
        res,
        { review },
        "Review published successfully",
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  };

  public getProductReviews = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { productId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const rating = req.query.rating
        ? parseInt(req.query.rating as string, 10)
        : undefined;

      const result = await this.service.getProductReviews(
        productId,
        page,
        limit,
        rating
      );

      ResponseUtil.sendSuccess(res, result, "Product reviews retrieved");
    } catch (error) {
      next(error);
    }
  };

  public checkEligibility = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { productId } = req.params;
      const result = await this.service.checkEligibility(req.user!.id, productId);
      ResponseUtil.sendSuccess(res, result, "Review eligibility checked");
    } catch (error) {
      next(error);
    }
  };

  public voteHelpful = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const review = await this.service.voteHelpful(id, req.user!.id);
      ResponseUtil.sendSuccess(res, { review }, "Vote recorded successfully");
    } catch (error) {
      next(error);
    }
  };
}

export const reviewController = new ReviewController();
