import { Request, Response, NextFunction } from "express";
import { productService, ProductService } from "../service/product.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { HttpStatus } from "../../../core/constants/http-status.js";
import { ProductStatus } from "../model/product.model.js";

export class ProductController {
  constructor(private service: ProductService = productService) {}

  public getCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCatalog(req.query as any);
      ResponseUtil.sendSuccess(
        res,
        result.items,
        "Catalog products fetched successfully",
        HttpStatus.OK,
        {
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          total: result.total,
          totalPages: result.totalPages,
          hasNextPage: (Number(req.query.page) || 1) < result.totalPages,
          hasPrevPage: (Number(req.query.page) || 1) > 1,
        }
      );
    } catch (error) {
      next(error);
    }
  };

  public getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { product, inventory } = await this.service.getBySlug(req.params.slug);
      ResponseUtil.sendSuccess(
        res,
        { product, inventory },
        "Product details retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  public createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const product = await this.service.createProduct(req.user!.id, req.body);
      ResponseUtil.sendSuccess(
        res,
        { product },
        "Product draft created and inventory initialized successfully",
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  };

  public submitForApproval = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const product = await this.service.submitForApproval(req.user!.id, req.params.id);
      ResponseUtil.sendSuccess(
        res,
        { product },
        "Product submitted for administrative moderation"
      );
    } catch (error) {
      next(error);
    }
  };

  public reviewProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user!.id;
      const productId = req.params.id;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const product = await this.service.reviewProduct(
        adminId,
        productId,
        req.body,
        ip,
        userAgent
      );

      ResponseUtil.sendSuccess(
        res,
        { product },
        `Product has been ${req.body.status.toLowerCase()}`
      );
    } catch (error) {
      next(error);
    }
  };

  public getMySellerProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status = req.query.status as ProductStatus | undefined;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await this.service.getSellerProducts(req.user!.id, status, page, limit);

      ResponseUtil.sendSuccess(
        res,
        result.items,
        "Seller products retrieved successfully",
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

export const productController = new ProductController();
