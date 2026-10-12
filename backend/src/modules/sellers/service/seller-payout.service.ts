import { SellerModel } from "../model/seller.model.js";
import { PayoutModel, IPayout } from "../model/payout.model.js";
import { SellerOrderModel } from "../../orders/model/order.model.js";
import { ProductModel } from "../../products/model/product.model.js";
import { domainEventBus, DomainEventBus } from "../../../core/events/event-bus.js";
import { NotFoundError, BadRequestError, ForbiddenError } from "../../../core/errors/app-error.js";
import { SettlePayoutInput } from "../validation/payout.validation.js";

export interface SellerAnalyticsSummary {
  financials: {
    lifetimeGrossSalesMinor: number;
    lifetimePlatformCommissionMinor: number;
    lifetimeNetEarningsMinor: number;
    availableEscrowBalanceMinor: number;
    pendingPayoutBalanceMinor: number;
    settledPayoutsMinor: number;
    currency: string;
  };
  orders: {
    total: number;
    delivered: number;
    processing: number;
    shipped: number;
    pending: number;
    cancelled: number;
  };
  products: {
    totalApproved: number;
    pendingModeration: number;
    lowStockCount: number;
  };
  topProducts: Array<{
    sku: string;
    title: string;
    totalQuantitySold: number;
    totalRevenueMinor: number;
  }>;
  seller: {
    storeName: string;
    slug: string;
    commissionRate: number;
    bankAccount: {
      bankName: string;
      accountNumberMasked: string;
      routingCode: string;
    };
  };
}

export class SellerPayoutService {
  constructor(private eventBus: DomainEventBus = domainEventBus) {}

  public async getSellerAnalytics(userId: string): Promise<SellerAnalyticsSummary> {
    const seller = await SellerModel.findOne({ userId });
    if (!seller) {
      throw new ForbiddenError("Seller profile not found for this account");
    }

    const [
      ordersAggregation,
      topProductsAggregation,
      existingPayouts,
      deliveredOrders,
      productsCount,
      pendingProductsCount,
      allSellerProducts,
    ] = await Promise.all([
      // 1. Order status & financial totals aggregation
      SellerOrderModel.aggregate([
        { $match: { sellerId: seller._id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            subtotalMinor: { $sum: "$subtotalMinor" },
            commissionMinor: { $sum: "$commissionMinor" },
            payoutMinor: { $sum: "$sellerPayoutMinor" },
          },
        },
      ]),

      // 2. Top-selling products aggregation
      SellerOrderModel.aggregate([
        { $match: { sellerId: seller._id, status: { $ne: "CANCELLED" } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: { sku: "$items.sku", title: "$items.title" },
            totalQuantitySold: { $sum: "$items.quantity" },
            totalRevenueMinor: { $sum: "$items.totalMinor" },
          },
        },
        { $sort: { totalQuantitySold: -1 } },
        { $limit: 5 },
      ]),

      // 3. Existing payouts
      PayoutModel.find({ sellerId: seller._id }),

      // 4. Delivered orders (eligible for payout if not already batched)
      SellerOrderModel.find({ sellerId: seller._id, status: "DELIVERED" }),

      // 5. Approved products count
      ProductModel.countDocuments({ sellerId: seller._id, status: "APPROVED" }),

      // 6. Pending moderation products count
      ProductModel.countDocuments({
        sellerId: seller._id,
        status: { $in: ["SUBMITTED", "DRAFT", "UNDER_REVIEW"] },
      }),

      // 7. Products for low-stock check
      ProductModel.find({ sellerId: seller._id }).select("variants"),
    ]);

    // Financial totals & order counts
    let lifetimeGrossSalesMinor = 0;
    let lifetimePlatformCommissionMinor = 0;
    let lifetimeNetEarningsMinor = 0;
    let totalOrders = 0;

    const statusCounts: Record<string, number> = {
      DELIVERED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
    };

    ordersAggregation.forEach((group: any) => {
      totalOrders += group.count;
      statusCounts[group._id] = group.count;

      if (group._id !== "CANCELLED" && group._id !== "REFUNDED") {
        lifetimeGrossSalesMinor += group.subtotalMinor;
        lifetimePlatformCommissionMinor += group.commissionMinor;
        lifetimeNetEarningsMinor += group.payoutMinor;
      }
    });

    // Payout balances calculation
    let pendingPayoutBalanceMinor = 0;
    let settledPayoutsMinor = 0;
    const ordersAlreadyInPayout = new Set<string>();

    existingPayouts.forEach((payout) => {
      payout.ordersIncluded.forEach((oid) => ordersAlreadyInPayout.add(oid.toString()));
      if (payout.status === "PAID") {
        settledPayoutsMinor += payout.amountMinor;
      } else if (payout.status === "PENDING" || payout.status === "PROCESSING") {
        pendingPayoutBalanceMinor += payout.amountMinor;
      }
    });

    // Available Escrow: delivered orders not yet batched into any payout
    let availableEscrowBalanceMinor = 0;
    deliveredOrders.forEach((order) => {
      if (!ordersAlreadyInPayout.has(order._id.toString())) {
        availableEscrowBalanceMinor += order.sellerPayoutMinor;
      }
    });

    // Low stock alert count (variants with stock <= 5)
    let lowStockCount = 0;
    allSellerProducts.forEach((p) => {
      p.variants?.forEach((v: any) => {
        if (v.stock !== undefined && v.stock <= 5) {
          lowStockCount++;
        }
      });
    });

    const topProducts = topProductsAggregation.map((item: any) => ({
      sku: item._id.sku,
      title: item._id.title,
      totalQuantitySold: item.totalQuantitySold,
      totalRevenueMinor: item.totalRevenueMinor,
    }));

    return {
      financials: {
        lifetimeGrossSalesMinor,
        lifetimePlatformCommissionMinor,
        lifetimeNetEarningsMinor,
        availableEscrowBalanceMinor,
        pendingPayoutBalanceMinor,
        settledPayoutsMinor,
        currency: "INR",
      },
      orders: {
        total: totalOrders,
        delivered: statusCounts.DELIVERED || 0,
        processing: (statusCounts.PROCESSING || 0) + (statusCounts.CONFIRMED || 0),
        shipped: statusCounts.SHIPPED || 0,
        pending: statusCounts.PENDING || 0,
        cancelled: statusCounts.CANCELLED || 0,
      },
      products: {
        totalApproved: productsCount,
        pendingModeration: pendingProductsCount,
        lowStockCount,
      },
      topProducts,
      seller: {
        storeName: seller.storeName,
        slug: seller.slug,
        commissionRate: seller.commissionRate,
        bankAccount: seller.bankAccount,
      },
    };
  }

  public async getSellerPayoutHistory(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    payouts: IPayout[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const seller = await SellerModel.findOne({ userId });
    if (!seller) {
      throw new ForbiddenError("Seller profile not found");
    }

    const skip = (page - 1) * limit;
    const [payouts, total] = await Promise.all([
      PayoutModel.find({ sellerId: seller._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PayoutModel.countDocuments({ sellerId: seller._id }),
    ]);

    return {
      payouts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public async requestPayout(userId: string): Promise<IPayout> {
    const seller = await SellerModel.findOne({ userId });
    if (!seller) {
      throw new ForbiddenError("Seller profile not found");
    }

    // Identify already batched orders
    const existingPayouts = await PayoutModel.find({
      sellerId: seller._id,
      status: { $in: ["PENDING", "PROCESSING", "PAID"] },
    }).select("ordersIncluded");

    const batchedOrderIds = new Set<string>();
    existingPayouts.forEach((p) => {
      p.ordersIncluded.forEach((oid) => batchedOrderIds.add(oid.toString()));
    });

    // Find all delivered sub-orders not yet batched
    const eligibleOrders = await SellerOrderModel.find({
      sellerId: seller._id,
      status: "DELIVERED",
      _id: { $nin: Array.from(batchedOrderIds) },
    });

    const eligibleAmountMinor = eligibleOrders.reduce(
      (sum, o) => sum + o.sellerPayoutMinor,
      0
    );

    // Minimum payout threshold: ₹1,000 (100,000 paise)
    const MINIMUM_PAYOUT_THRESHOLD_MINOR = 100000;
    if (eligibleAmountMinor < MINIMUM_PAYOUT_THRESHOLD_MINOR) {
      throw new BadRequestError(
        `Minimum payout settlement threshold is ₹1,000.00. Current available balance is ₹${(
          eligibleAmountMinor / 100
        ).toFixed(2)}.`
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const payoutNumber = `PAY-${dateStr}-${randomSuffix}`;

    const payout = new PayoutModel({
      payoutNumber,
      sellerId: seller._id,
      amountMinor: eligibleAmountMinor,
      currency: "INR",
      status: "PAID", // Auto-settled in sandbox environment
      bankAccount: seller.bankAccount,
      ordersIncluded: eligibleOrders.map((o) => o._id),
      transactionReference: `UTR${Date.now()}${Math.floor(Math.random() * 1000)}`,
      settledAt: new Date(),
    });

    await payout.save();

    this.eventBus.publish("seller.payout_settled", {
      payoutId: payout._id.toString(),
      payoutNumber: payout.payoutNumber,
      sellerId: seller._id.toString(),
      amountMinor: payout.amountMinor,
      ordersCount: eligibleOrders.length,
    });

    return payout;
  }

  public async settlePayout(
    payoutId: string,
    input: SettlePayoutInput
  ): Promise<IPayout> {
    const payout = await PayoutModel.findById(payoutId);
    if (!payout) {
      throw new NotFoundError("Payout batch not found");
    }

    payout.status = input.status;
    if (input.status === "PAID") {
      payout.transactionReference = input.transactionReference;
      payout.settledAt = new Date();
      payout.failureReason = undefined;
    } else {
      payout.failureReason = input.failureReason || "Bank settlement failed";
    }

    await payout.save();
    return payout;
  }
}

export const sellerPayoutService = new SellerPayoutService();
