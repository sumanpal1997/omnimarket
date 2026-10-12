import { Request, Response, NextFunction } from "express";
import { orderService, OrderService } from "../service/order.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { HttpStatus } from "../../../core/constants/http-status.js";

export class OrderController {
  constructor(private service: OrderService = orderService) {}

  public createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { addressId, paymentProvider, idempotencyKey, couponCode } = req.body;
      const result = await this.service.createOrderFromCart({
        userId: req.user!.id,
        addressId,
        paymentProvider,
        idempotencyKey,
        couponCode,
      });

      ResponseUtil.sendSuccess(
        res,
        {
          order: result.masterOrder,
          sellerOrders: result.sellerOrders,
          clientSecret: result.paymentClientSecret,
        },
        "Order created successfully and payment session initialized",
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  };

  public getMyOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await this.service.getCustomerOrders(req.user!.id, page, limit);

      ResponseUtil.sendSuccess(res, result, "Customer orders retrieved");
    } catch (error) {
      next(error);
    }
  };

  public getOrderDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { orderNumber } = req.params;
      const order = await this.service.getOrderByNumber(
        req.user!.id,
        orderNumber,
        req.user!.role
      );

      ResponseUtil.sendSuccess(res, { order }, "Order details retrieved");
    } catch (error) {
      next(error);
    }
  };

  public getSellerSubOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string | undefined;

      const result = await this.service.getSellerOrders(
        req.user!.id,
        { status },
        page,
        limit
      );

      ResponseUtil.sendSuccess(res, result, "Seller orders retrieved");
    } catch (error) {
      next(error);
    }
  };

  public updateSellerSubOrderStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, note, tracking } = req.body;

      const updated = await this.service.updateSellerOrderStatus({
        sellerUserId: req.user!.id,
        subOrderId: id,
        newStatus: status,
        note,
        tracking,
      });

      ResponseUtil.sendSuccess(
        res,
        { subOrder: updated },
        "Order fulfillment status updated successfully"
      );
    } catch (error) {
      next(error);
    }
  };
}

export const orderController = new OrderController();
