import { UserModel, IUser, UserStatus } from "../../users/model/user.model.js";
import { SellerModel, ISeller, SellerStatus } from "../../sellers/model/seller.model.js";
import { ProductModel, IProduct, ProductStatus } from "../../products/model/product.model.js";
import { MasterOrderModel, SellerOrderModel, IMasterOrder } from "../../orders/model/order.model.js";
import { auditLogService, AuditLogService } from "./audit-log.service.js";
import { domainEventBus, DomainEventBus } from "../../../core/events/event-bus.js";
import { NotFoundError, BadRequestError } from "../../../core/errors/app-error.js";

export interface PlatformAnalytics {
  financials: {
    gmvMinor: number;
    platformCommissionMinor: number;
    merchantPayoutsMinor: number;
    currency: string;
  };
  orders: {
    total: number;
    paid: number;
    pending: number;
    failed: number;
  };
  users: {
    total: number;
    customers: number;
    sellers: number;
    admins: number;
  };
  sellers: {
    total: number;
    active: number;
    pendingKYC: number;
    suspended: number;
  };
  products: {
    total: number;
    approved: number;
    pendingModeration: number;
    rejected: number;
  };
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    grandTotalMinor: number;
    paymentStatus: string;
    createdAt: Date;
    customerEmail?: string;
  }>;
}

export class AdminService {
  constructor(
    private auditLog: AuditLogService = auditLogService,
    private eventBus: DomainEventBus = domainEventBus
  ) {}

  public async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const [
      financialStats,
      orderStatusCounts,
      userRoleCounts,
      sellerStatusCounts,
      productStatusCounts,
      recentOrders,
    ] = await Promise.all([
      // 1. GMV & Commission Aggregation
      MasterOrderModel.aggregate([
        {
          $facet: {
            gmv: [
              { $match: { paymentStatus: "PAID" } },
              { $group: { _id: null, totalGMV: { $sum: "$grandTotalMinor" } } },
            ],
            ordersCount: [
              {
                $group: {
                  _id: "$paymentStatus",
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),

      // 2. Seller Commission & Payouts Aggregation
      SellerOrderModel.aggregate([
        { $match: { status: { $nin: ["CANCELLED", "REFUNDED"] } } },
        {
          $group: {
            _id: null,
            totalCommission: { $sum: "$commissionMinor" },
            totalPayouts: { $sum: "$sellerPayoutMinor" },
          },
        },
      ]),

      // 3. User Counts by Role
      UserModel.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ]),

      // 4. Seller Counts by Status
      SellerModel.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // 5. Product Counts by Status
      ProductModel.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // 6. Recent Orders
      MasterOrderModel.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("customerId", "email firstName lastName")
        .lean(),
    ]);

    const gmvMinor = financialStats[0]?.gmv[0]?.totalGMV || 0;
    const platformCommissionMinor = orderStatusCounts[0]?.totalCommission || 0;
    const merchantPayoutsMinor = orderStatusCounts[0]?.totalPayouts || 0;

    const orderCountsMap = new Map<string, number>();
    financialStats[0]?.ordersCount?.forEach((item: { _id: string; count: number }) => {
      orderCountsMap.set(item._id, item.count);
    });

    const userCountsMap = new Map<string, number>();
    let totalUsers = 0;
    userRoleCounts.forEach((item: { _id: string; count: number }) => {
      userCountsMap.set(item._id, item.count);
      totalUsers += item.count;
    });

    const sellerCountsMap = new Map<string, number>();
    let totalSellers = 0;
    sellerStatusCounts.forEach((item: { _id: string; count: number }) => {
      sellerCountsMap.set(item._id, item.count);
      totalSellers += item.count;
    });

    const productCountsMap = new Map<string, number>();
    let totalProducts = 0;
    productStatusCounts.forEach((item: { _id: string; count: number }) => {
      productCountsMap.set(item._id, item.count);
      totalProducts += item.count;
    });

    return {
      financials: {
        gmvMinor,
        platformCommissionMinor,
        merchantPayoutsMinor,
        currency: "INR",
      },
      orders: {
        total: Array.from(orderCountsMap.values()).reduce((a, b) => a + b, 0),
        paid: orderCountsMap.get("PAID") || 0,
        pending: orderCountsMap.get("PENDING") || 0,
        failed: orderCountsMap.get("FAILED") || 0,
      },
      users: {
        total: totalUsers,
        customers: userCountsMap.get("CUSTOMER") || 0,
        sellers: userCountsMap.get("SELLER") || 0,
        admins: userCountsMap.get("ADMIN") || 0,
      },
      sellers: {
        total: totalSellers,
        active: sellerCountsMap.get("ACTIVE") || 0,
        pendingKYC: sellerCountsMap.get("PENDING") || 0,
        suspended: sellerCountsMap.get("SUSPENDED") || 0,
      },
      products: {
        total: totalProducts,
        approved: productCountsMap.get("APPROVED") || 0,
        pendingModeration:
          (productCountsMap.get("SUBMITTED") || 0) +
          (productCountsMap.get("DRAFT") || 0) +
          (productCountsMap.get("UNDER_REVIEW") || 0),
        rejected: productCountsMap.get("REJECTED") || 0,
      },
      recentOrders: recentOrders.map((o: any) => ({
        _id: o._id.toString(),
        orderNumber: o.orderNumber,
        grandTotalMinor: o.grandTotalMinor,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        customerEmail: o.customerId?.email,
      })),
    };
  }

  public async getSellers(query: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    sellers: ISeller[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const filter: Record<string, any> = {};
    if (query.status) {
      filter.status = query.status;
    }

    const skip = (page - 1) * limit;
    const [sellers, total] = await Promise.all([
      SellerModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "firstName lastName email phone status"),
      SellerModel.countDocuments(filter),
    ]);

    return {
      sellers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public async moderateSeller(params: {
    adminId: string;
    sellerId: string;
    action: "APPROVE" | "REJECT" | "SUSPEND" | "ACTIVATE";
    reason?: string;
    commissionRate?: number;
  }): Promise<ISeller> {
    const { adminId, sellerId, action, reason, commissionRate } = params;

    const seller = await SellerModel.findById(sellerId);
    if (!seller) {
      throw new NotFoundError("Seller profile not found");
    }

    let newStatus: SellerStatus;
    switch (action) {
      case "APPROVE":
      case "ACTIVATE":
        newStatus = "ACTIVE";
        seller.rejectionReason = undefined;
        seller.suspendedReason = undefined;
        if (commissionRate !== undefined) {
          seller.commissionRate = commissionRate;
        }
        // Promote user role to SELLER
        await UserModel.findByIdAndUpdate(seller.userId, { role: "SELLER" });
        break;
      case "REJECT":
        newStatus = "REJECTED";
        seller.rejectionReason = reason || "Application did not meet compliance criteria";
        break;
      case "SUSPEND":
        newStatus = "SUSPENDED";
        seller.suspendedReason = reason || "Suspended by platform administration";
        break;
      default:
        throw new BadRequestError(`Invalid moderation action: ${action}`);
    }

    const previousStatus = seller.status;
    seller.status = newStatus;
    await seller.save();

    await this.auditLog.record({
      actorId: adminId,
      actorRole: "ADMIN",
      action: `SELLER_${action}`,
      resource: "Seller",
      resourceId: seller._id.toString(),
      metadata: {
        previousStatus,
        newStatus,
        reason,
        commissionRate,
      },
    });

    this.eventBus.publish("seller.moderated", {
      sellerId: seller._id.toString(),
      action,
      status: newStatus,
    });

    return seller;
  }

  public async getProducts(query: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    products: IProduct[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const filter: Record<string, any> = {};
    if (query.status) {
      filter.status = query.status;
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sellerId", "storeName slug status")
        .populate("categoryId", "name slug"),
      ProductModel.countDocuments(filter),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public async moderateProduct(params: {
    adminId: string;
    productId: string;
    action: "APPROVE" | "REJECT" | "ARCHIVE";
    rejectionReason?: string;
  }): Promise<IProduct> {
    const { adminId, productId, action, rejectionReason } = params;

    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    let newStatus: ProductStatus;
    switch (action) {
      case "APPROVE":
        newStatus = "APPROVED";
        product.rejectionReason = undefined;
        break;
      case "REJECT":
        newStatus = "REJECTED";
        product.rejectionReason =
          rejectionReason || "Product does not meet marketplace listing guidelines";
        break;
      case "ARCHIVE":
        newStatus = "ARCHIVED";
        break;
      default:
        throw new BadRequestError(`Invalid moderation action: ${action}`);
    }

    const previousStatus = product.status;
    product.status = newStatus;
    await product.save();

    await this.auditLog.record({
      actorId: adminId,
      actorRole: "ADMIN",
      action: `PRODUCT_${action}`,
      resource: "Product",
      resourceId: product._id.toString(),
      metadata: {
        previousStatus,
        newStatus,
        rejectionReason,
      },
    });

    this.eventBus.publish("product.moderated", {
      productId: product._id.toString(),
      status: newStatus,
    });

    return product;
  }

  public async getUsers(query: {
    search?: string;
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    users: IUser[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const filter: Record<string, any> = {};

    if (query.role) {
      filter.role = query.role;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, "i");
      filter.$or = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public async toggleUserStatus(params: {
    adminId: string;
    userId: string;
    isActive: boolean;
    reason?: string;
  }): Promise<IUser> {
    const { adminId, userId, isActive, reason } = params;

    const newStatus: UserStatus = isActive ? "ACTIVE" : "SUSPENDED";

    // If disabling user, increment tokenVersion to immediately revoke all refresh tokens and sessions
    const updateOps: any = {
      $set: { status: newStatus },
    };

    if (!isActive) {
      updateOps.$inc = { tokenVersion: 1 };
    }

    const updatedUser = await UserModel.findByIdAndUpdate(userId, updateOps, {
      new: true,
    }).select("-passwordHash");

    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    await this.auditLog.record({
      actorId: adminId,
      actorRole: "ADMIN",
      action: isActive ? "USER_REACTIVATE" : "USER_SUSPEND",
      resource: "User",
      resourceId: updatedUser._id.toString(),
      metadata: {
        newStatus,
        reason,
        sessionsRevoked: !isActive,
      },
    });

    return updatedUser;
  }

  public async getAllOrders(query: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    orders: IMasterOrder[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const filter: Record<string, any> = {};
    if (query.status) {
      filter.paymentStatus = query.status;
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      MasterOrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customerId", "firstName lastName email phone")
        .populate({
          path: "subOrderIds",
          populate: { path: "sellerId", select: "storeName slug" },
        }),
      MasterOrderModel.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const adminService = new AdminService();
