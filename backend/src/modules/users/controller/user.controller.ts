import { Request, Response, NextFunction } from "express";
import { userService, UserService } from "../service/user.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { HttpStatus } from "../../../core/constants/http-status.js";

export class UserController {
  constructor(private service: UserService = userService) {}

  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.service.getProfile(req.user!.id);
      ResponseUtil.sendSuccess(res, { user }, "User profile retrieved successfully");
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updatedUser = await this.service.updateProfile(req.user!.id, req.body);
      ResponseUtil.sendSuccess(res, { user: updatedUser }, "Profile updated successfully");
    } catch (error) {
      next(error);
    }
  };

  public getAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const addresses = await this.service.getAddresses(req.user!.id);
      ResponseUtil.sendSuccess(res, { addresses }, "Addresses fetched successfully");
    } catch (error) {
      next(error);
    }
  };

  public addAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const addresses = await this.service.addAddress(req.user!.id, req.body);
      ResponseUtil.sendSuccess(
        res,
        { addresses },
        "Address added successfully",
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  };

  public updateAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const addresses = await this.service.updateAddress(
        req.user!.id,
        req.params.addressId,
        req.body
      );
      ResponseUtil.sendSuccess(res, { addresses }, "Address updated successfully");
    } catch (error) {
      next(error);
    }
  };

  public setDefaultAddress = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const addresses = await this.service.setDefaultAddress(
        req.user!.id,
        req.params.addressId
      );
      ResponseUtil.sendSuccess(res, { addresses }, "Default address updated successfully");
    } catch (error) {
      next(error);
    }
  };

  public deleteAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const addresses = await this.service.deleteAddress(
        req.user!.id,
        req.params.addressId
      );
      ResponseUtil.sendSuccess(res, { addresses }, "Address deleted successfully");
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
