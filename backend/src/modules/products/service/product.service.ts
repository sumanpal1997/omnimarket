import { Types } from "mongoose";
import { productRepository, ProductRepository } from "../repository/product.repository.js";
import { sellerRepository, SellerRepository } from "../../sellers/repository/seller.repository.js";
import { inventoryService, InventoryService } from "../../inventory/service/inventory.service.js";
import { auditLogService, AuditLogService } from "../../admins/service/audit-log.service.js";
import { domainEventBus, DomainEventBus } from "../../../core/events/event-bus.js";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../../../core/errors/app-error.js";
import {
  CreateProductInput,
  ReviewProductInput,
  ProductQueryInput,
} from "../validation/product.validation.js";
import { IProduct, ProductStatus } from "../model/product.model.js";
import { CategoryModel } from "../../categories/model/category.model.js";

export class ProductService {
  constructor(
    private productRepo: ProductRepository = productRepository,
    private sellerRepo: SellerRepository = sellerRepository,
    private inventory: InventoryService = inventoryService,
    private auditLogs: AuditLogService = auditLogService,
    private eventBus: DomainEventBus = domainEventBus
  ) {}

  public async createProduct(userId: string, input: CreateProductInput): Promise<IProduct> {
    const seller = await this.sellerRepo.findByUserId(userId);
    if (!seller || seller.status !== "ACTIVE") {
      throw new ForbiddenError(
        "Only verified and active sellers can create catalog products"
      );
    }

    // Verify SKU uniqueness across variants inside the input payload
    const skus = input.variants.map((v) => v.sku);
    const uniqueSkus = new Set(skus);
    if (uniqueSkus.size !== skus.length) {
      throw new BadRequestError("Duplicate SKUs detected within product variants");
    }

    // Generate unique slug from title
    const baseSlug = input.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await this.productRepo.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Format variants (excluding stock, which lives in the isolated inventory collection)
    const formattedVariants = input.variants.map((v) => ({
      _id: new Types.ObjectId(),
      sku: v.sku,
      title: v.title,
      priceMinor: v.priceMinor,
      compareAtPriceMinor: v.compareAtPriceMinor,
      attributes: v.attributes,
      images: v.images,
      isActive: true,
    }));

    const product = await this.productRepo.create({
      sellerId: seller._id,
      categoryId: new Types.ObjectId(input.categoryId),
      brandId: input.brandId ? new Types.ObjectId(input.brandId) : undefined,
      title: input.title,
      slug,
      description: input.description,
      images: input.images,
      status: "DRAFT",
      variants: formattedVariants,
      seo: input.seo,
    });

    // Initialize physical inventory records for each variant
    const inventoryPayload = input.variants.map((v) => ({
      sku: v.sku,
      stock: v.stock,
      lowStockThreshold: 5,
    }));

    try {
      await this.inventory.initializeStock(product._id, seller._id, inventoryPayload);
    } catch (invError) {
      // Clean up product draft if inventory initialization failed
      await this.productRepo.updateStatus(product._id, "ARCHIVED");
      throw invError;
    }

    return product;
  }

  public async submitForApproval(userId: string, productId: string): Promise<IProduct> {
    const seller = await this.sellerRepo.findByUserId(userId);
    if (!seller) {
      throw new ForbiddenError("Seller profile not found");
    }

    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    // Resource ownership check
    if (product.sellerId._id.toString() !== seller._id.toString()) {
      throw new ForbiddenError("You do not have permission to submit this product");
    }

    // State machine check: Can only submit from DRAFT or REJECTED
    if (product.status !== "DRAFT" && product.status !== "REJECTED") {
      throw new BadRequestError(
        `Cannot submit a product currently in '${product.status}' status`
      );
    }

    const updated = await this.productRepo.updateStatus(productId, "SUBMITTED");

    this.eventBus.publish("product.submitted", {
      productId: product._id.toString(),
      sellerId: seller._id.toString(),
      title: product.title,
    });

    return updated!;
  }

  public async reviewProduct(
    adminId: string,
    productId: string,
    input: ReviewProductInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<IProduct> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    if (product.status !== "SUBMITTED" && product.status !== "UNDER_REVIEW") {
      throw new BadRequestError(
        `Cannot review product currently in '${product.status}' status`
      );
    }

    const updated = await this.productRepo.updateStatus(
      productId,
      input.status,
      input.rejectionReason
    );

    // Record formal administrative audit log
    await this.auditLogs.record({
      actorId: adminId,
      actorRole: "ADMIN",
      action: input.status === "APPROVED" ? "PRODUCT_APPROVED" : "PRODUCT_REJECTED",
      resource: "Product",
      resourceId: product._id,
      metadata: {
        title: product.title,
        previousStatus: product.status,
        newStatus: input.status,
        rejectionReason: input.rejectionReason,
      },
      ipAddress,
      userAgent,
    });

    this.eventBus.publish(
      input.status === "APPROVED" ? "product.approved" : "product.rejected",
      {
        productId: product._id.toString(),
        sellerId: product.sellerId._id.toString(),
        title: product.title,
        reason: input.rejectionReason,
      }
    );

    return updated!;
  }

  public async getCatalog(
    query: ProductQueryInput
  ): Promise<{ items: IProduct[]; total: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    let categoryFilter: any = query.category;
    if (query.category) {
      if (Types.ObjectId.isValid(query.category)) {
        categoryFilter = new Types.ObjectId(query.category);
      } else {
        const cat = await CategoryModel.findOne({ slug: query.category });
        if (cat) {
          const descendants = await CategoryModel.find({
            $or: [{ _id: cat._id }, { parentId: cat._id }, { ancestors: cat._id }],
          });
          const ids = descendants.map((d) => d._id);
          categoryFilter = ids.length === 1 ? ids[0] : { $in: ids };
        }
      }
    }

    const { items, total } = await this.productRepo.findCatalog(
      {
        categoryId: categoryFilter,
        brandId: query.brand,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        search: query.search,
        sort: query.sort,
      },
      page,
      limit
    );

    return {
      items,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async getBySlug(slug: string): Promise<{ product: IProduct; inventory: Record<string, number> }> {
    const product = await this.productRepo.findBySlug(slug);
    if (!product || product.status !== "APPROVED") {
      throw new NotFoundError("Product not found or unavailable in the marketplace");
    }

    // Attach real-time available stock for each variant
    const stockMap: Record<string, number> = {};
    for (const variant of product.variants) {
      try {
        const inv = await this.inventory.getStockBySku(variant.sku);
        stockMap[variant.sku] = inv.stock;
      } catch {
        stockMap[variant.sku] = 0;
      }
    }

    return { product, inventory: stockMap };
  }

  public async getSellerProducts(
    userId: string,
    status?: ProductStatus,
    page = 1,
    limit = 20
  ): Promise<{ items: IProduct[]; total: number; totalPages: number }> {
    const seller = await this.sellerRepo.findByUserId(userId);
    if (!seller) {
      throw new ForbiddenError("Seller profile not found");
    }

    const { items, total } = await this.productRepo.findSellerProducts(
      seller._id,
      status,
      page,
      limit
    );

    return {
      items,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const productService = new ProductService();
