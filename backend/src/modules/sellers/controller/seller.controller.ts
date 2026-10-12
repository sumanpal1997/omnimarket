import { Request, Response, NextFunction } from "express";
import { sellerService, SellerService } from "../service/seller.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { HttpStatus } from "../../../core/constants/http-status.js";
import { SellerStatus } from "../model/seller.model.js";

export class SellerController {
  constructor(private service: SellerService = sellerService) {}

  public apply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const seller = await this.service.apply(req.user!.id, req.body);
      ResponseUtil.sendSuccess(
        res,
        { seller },
        "Seller onboarding application submitted successfully. It is now pending admin review.",
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  };

  public getMyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const seller = await this.service.getMyProfile(req.user!.id);
      ResponseUtil.sendSuccess(res, { seller }, "Seller profile retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  public reviewApplication = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user!.id;
      const sellerId = req.params.id;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const seller = await this.service.reviewApplication(
        adminId,
        sellerId,
        req.body,
        ip,
        userAgent
      );

      ResponseUtil.sendSuccess(
        res,
        { seller },
        `Seller application has been ${req.body.status.toLowerCase()}`
      );
    } catch (error) {
      next(error);
    }
  };

  public updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.id;
      const sellerId = req.params.id;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const seller = await this.service.updateStatus(adminId, sellerId, req.body, ip, userAgent);

      ResponseUtil.sendSuccess(res, { seller }, `Seller status updated to ${req.body.status}`);
    } catch (error) {
      next(error);
    }
  };

  public listApplications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status = req.query.status as SellerStatus | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await this.service.listApplications(status, page, limit);

      ResponseUtil.sendSuccess(
        res,
        result.items,
        "Seller applications retrieved successfully",
        HttpStatus.OK,
        {
          page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNextPage: page < result.totalPages,
          hasPrevPage: page > 1,
        }
      );
    } catch (error) {
      next(error);
    }
  };
}

export const sellerController = new SellerController();
