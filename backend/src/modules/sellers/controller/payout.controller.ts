import { Request, Response, NextFunction } from "express";
import { sellerPayoutService, SellerPayoutService } from "../service/seller-payout.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { HttpStatus } from "../../../core/constants/http-status.js";

export class PayoutController {
  constructor(private service: SellerPayoutService = sellerPayoutService) {}

  public getAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const analytics = await this.service.getSellerAnalytics(req.user!.id);
      ResponseUtil.sendSuccess(res, analytics, "Seller analytics retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  public getPayouts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await this.service.getSellerPayoutHistory(req.user!.id, page, limit);
      ResponseUtil.sendSuccess(res, result, "Seller payout history retrieved");
    } catch (error) {
      next(error);
    }
  };

  public requestPayout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payout = await this.service.requestPayout(req.user!.id);
      ResponseUtil.sendSuccess(
        res,
        { payout },
        "Payout request processed successfully",
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  };

  public settlePayout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const payout = await this.service.settlePayout(id, req.body);
      ResponseUtil.sendSuccess(res, { payout }, "Payout settlement updated successfully");
    } catch (error) {
      next(error);
    }
  };
}

export const payoutController = new PayoutController();
