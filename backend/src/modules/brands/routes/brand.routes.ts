import { Router, Request, Response, NextFunction } from "express";
import { BrandModel } from "../model/brand.model.js";
import { authenticate, requireRole } from "../../../core/middleware/auth.middleware.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { HttpStatus } from "../../../core/constants/http-status.js";

const router = Router();

// Public: List active brands
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await BrandModel.find({ isActive: true }).sort({ name: 1 });
    ResponseUtil.sendSuccess(res, { brands }, "Brands retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// Admin: Create brand
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.body.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const brand = new BrandModel({
        ...req.body,
        slug,
      });
      await brand.save();

      ResponseUtil.sendSuccess(
        res,
        { brand },
        "Brand created successfully",
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  }
);

export const brandRoutes = router;
