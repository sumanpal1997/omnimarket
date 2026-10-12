import { Request, Response, NextFunction } from "express";
import { adminService, AdminService } from "../service/admin.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";

export class AdminController {
  constructor(private service: AdminService = adminService) {}

  public getAnalytics = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const analytics = await this.service.getPlatformAnalytics();
      ResponseUtil.sendSuccess(res, analytics, "Platform analytics retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  public getSellers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string | undefined;

      const result = await this.service.getSellers({ status, page, limit });
      ResponseUtil.sendSuccess(res, result, "Sellers retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  public moderateSeller = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { action, reason, commissionRate } = req.body;

      const updatedSeller = await this.service.moderateSeller({
        adminId: req.user!.id,
        sellerId: id,
        action,
        reason,
        commissionRate,
      });

      ResponseUtil.sendSuccess(
        res,
        { seller: updatedSeller },
        `Seller moderation action '${action}' completed successfully`
      );
    } catch (error) {
      next(error);
    }
  };

  public getProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string | undefined;

      const result = await this.service.getProducts({ status, page, limit });
      ResponseUtil.sendSuccess(res, result, "Products retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  public moderateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { action, rejectionReason } = req.body;

      const updatedProduct = await this.service.moderateProduct({
        adminId: req.user!.id,
        productId: id,
        action,
        rejectionReason,
      });

      ResponseUtil.sendSuccess(
        res,
        { product: updatedProduct },
        `Product moderation action '${action}' completed successfully`
      );
    } catch (error) {
      next(error);
    }
  };

  public getUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const role = req.query.role as string | undefined;

      const result = await this.service.getUsers({ search, role, page, limit });
      ResponseUtil.sendSuccess(res, result, "Users retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  public toggleUserStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive, reason } = req.body;

      const updatedUser = await this.service.toggleUserStatus({
        adminId: req.user!.id,
        userId: id,
        isActive,
        reason,
      });

      ResponseUtil.sendSuccess(
        res,
        { user: updatedUser },
        `User status updated to ${isActive ? "ACTIVE" : "SUSPENDED"}`
      );
    } catch (error) {
      next(error);
    }
  };

  public getAllOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string | undefined;

      const result = await this.service.getAllOrders({ status, page, limit });
      ResponseUtil.sendSuccess(res, result, "Master orders retrieved successfully");
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();
