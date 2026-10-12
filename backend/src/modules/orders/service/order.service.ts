import { Types } from "mongoose";
import { UserModel } from "../../users/model/user.model.js";
import { CartModel } from "../../cart/model/cart.model.js";
import { SellerModel } from "../../sellers/model/seller.model.js";
import { IMasterOrder, ISellerOrder, SellerOrderStatus, IShippingTracking, ISellerOrderItem } from "../model/order.model.js";
import { orderRepository, OrderRepository } from "../repository/order.repository.js";
import { inventoryService, InventoryService } from "../../inventory/service/inventory.service.js";
import { pricingEngine, PricingEngineService } from "../../pricing/service/pricing.service.js";
import { paymentService, PaymentService } from "../../payments/service/payment.service.js";
import { PaymentProvider } from "../../payments/model/payment.model.js";
import { domainEventBus, DomainEventBus } from "../../../core/events/event-bus.js";
import { NotFoundError, BadRequestError, ForbiddenError } from "../../../core/errors/app-error.js";
import { logger } from "../../../core/logger/logger.js";

const ALLOWED_SELLER_STATUS_TRANSITIONS: Record<SellerOrderStatus, SellerOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  CANCELLED: [],
  RETURN_REQUESTED: ["RETURNED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
};

export class OrderService {
  constructor(
    private repository: OrderRepository = orderRepository,
    private inventory: InventoryService = inventoryService,
    private pricing: PricingEngineService = pricingEngine,
    private payment: PaymentService = paymentService,
    private eventBus: DomainEventBus = domainEventBus
  ) {}

  public async createOrderFromCart(params: {
    userId: string;
    addressId: string;
    paymentProvider: PaymentProvider;
    idempotencyKey: string;
    couponCode?: string;
  }): Promise<{
    masterOrder: IMasterOrder;
    sellerOrders: ISellerOrder[];
    paymentClientSecret: string;
  }> {
    const { userId, addressId, paymentProvider, idempotencyKey, couponCode: _couponCode } = params;

    // 1. Validate customer & address
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError("Customer not found");
    }

    const address = user.addresses.find((a) => a._id?.toString() === addressId);
    if (!address) {
      throw new NotFoundError("Selected shipping address not found on user profile");
    }

    // 2. Fetch cart
    const cart = await CartModel.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestError("Your cart is empty. Add products before checking out.");
    }

    // 3. Price calculation via Centralized Pricing Engine
    const pricingInputs = cart.items.map((i) => ({
      productId: i.productId,
      sku: i.sku,
      quantity: i.quantity,
    }));

    const pricingResult = await this.pricing.calculateOrderPrice(pricingInputs, 0);

    // 4. Reserve stock atomically across all items (rolls back on partial stock failure)
    const stockReservationItems = cart.items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
    }));

    await this.inventory.reserveStock(stockReservationItems);

    // 5. Generate Master Order Number: ORD-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

    const masterOrderId = new Types.ObjectId();

    // 6. Build Seller Orders (Multi-Vendor order splitting)
    const sellerOrdersToCreate: Array<Partial<ISellerOrder>> = [];

    pricingResult.sellerBreakdowns.forEach((breakdown, idx) => {
      const sellerSubOrderNumber = `${orderNumber}-S${idx + 1}`;
      
      const sellerItems: ISellerOrderItem[] = breakdown.items.map((item) => ({
        productId: new Types.ObjectId(item.productId),
        sku: item.sku,
        title: item.title,
        variantTitle: item.variantTitle,
        priceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        taxMinor: item.taxMinor,
        totalMinor: item.totalMinor,
        imageUrl: item.imageUrl,
      }));

      sellerOrdersToCreate.push({
        _id: new Types.ObjectId(),
        masterOrderId,
        sellerId: new Types.ObjectId(breakdown.sellerId),
        subOrderNumber: sellerSubOrderNumber,
        items: sellerItems,
        subtotalMinor: breakdown.subtotalMinor,
        taxMinor: breakdown.taxMinor,
        shippingMinor: breakdown.shippingMinor,
        totalMinor: breakdown.totalMinor,
        commissionMinor: breakdown.commissionMinor,
        sellerPayoutMinor: breakdown.sellerPayoutMinor,
        status: "PENDING",
        statusHistory: [
          {
            status: "PENDING",
            timestamp: new Date(),
            note: "Order created, waiting for payment confirmation",
          },
        ],
      });
    });

    // 7. Save SellerOrders in database
    const createdSellerOrders = await this.repository.createSellerOrders(sellerOrdersToCreate);

    // 8. Create & Save MasterOrder
    const masterOrderData: Partial<IMasterOrder> = {
      _id: masterOrderId,
      orderNumber,
      customerId: user._id,
      subOrderIds: createdSellerOrders.map((so) => so._id),
      totalItemsCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalMinor: pricingResult.subtotalMinor,
      taxMinor: pricingResult.taxMinor,
      shippingMinor: pricingResult.shippingMinor,
      discountMinor: pricingResult.discountMinor,
      grandTotalMinor: pricingResult.grandTotalMinor,
      currency: "INR",
      paymentStatus: "PENDING",
      shippingAddress: {
        label: address.label,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        phone: address.phone,
      },
    };

    const savedMasterOrder = await this.repository.createMasterOrder(masterOrderData);

    // 9. Empty customer cart
    cart.items = [];
    await cart.save();

    // 10. Initiate Payment Gateway session
    try {
      const paymentResult = await this.payment.initiatePayment({
        orderId: savedMasterOrder._id.toString(),
        orderNumber: savedMasterOrder.orderNumber,
        amountMinor: savedMasterOrder.grandTotalMinor,
        currency: savedMasterOrder.currency,
        customerId: user._id.toString(),
        customerEmail: user.email,
        idempotencyKey,
        provider: paymentProvider,
      });

      this.eventBus.publish("order.created", {
        orderId: savedMasterOrder._id.toString(),
        orderNumber: savedMasterOrder.orderNumber,
        customerId: user._id.toString(),
        totalMinor: savedMasterOrder.grandTotalMinor,
      });

      return {
        masterOrder: savedMasterOrder,
        sellerOrders: createdSellerOrders,
        paymentClientSecret: paymentResult.clientSecret,
      };
    } catch (paymentErr: any) {
      logger.error(
        { err: paymentErr, orderId: savedMasterOrder._id },
        "Payment initiation failed during checkout, rolling back reserved inventory"
      );
      // Compensatory rollback of reserved stock
      await this.inventory.rollbackReservation(stockReservationItems);
      throw paymentErr;
    }
  }

  public async getCustomerOrders(
    customerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: IMasterOrder[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.repository.findMasterOrdersByCustomer(customerId, { skip, limit }),
      this.repository.countMasterOrdersByCustomer(customerId),
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

  public async getOrderByNumber(
    userId: string,
    orderNumber: string,
    userRole: string = "CUSTOMER"
  ): Promise<IMasterOrder> {
    const order = await this.repository.findMasterOrderByNumber(orderNumber);
    if (!order) {
      throw new NotFoundError(`Order ${orderNumber} not found`);
    }

    if (userRole !== "ADMIN" && order.customerId.toString() !== userId) {
      throw new ForbiddenError("You are not authorized to view this order");
    }

    return order;
  }

  public async getSellerOrders(
    sellerUserId: string,
    filter: { status?: string },
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: ISellerOrder[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const seller = await SellerModel.findOne({ userId: sellerUserId });
    if (!seller) {
      throw new ForbiddenError("Seller profile not found for this account");
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.repository.findSellerOrdersBySeller(seller._id, filter, { skip, limit }),
      this.repository.countSellerOrdersBySeller(seller._id, filter),
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

  public async updateSellerOrderStatus(params: {
    sellerUserId: string;
    subOrderId: string;
    newStatus: SellerOrderStatus;
    note?: string;
    tracking?: IShippingTracking;
  }): Promise<ISellerOrder> {
    const { sellerUserId, subOrderId, newStatus, note, tracking } = params;

    const seller = await SellerModel.findOne({ userId: sellerUserId });
    if (!seller) {
      throw new ForbiddenError("Seller profile not found");
    }

    const subOrder = await this.repository.findSellerOrderById(subOrderId);
    if (!subOrder) {
      throw new NotFoundError("Seller sub-order not found");
    }

    if (subOrder.sellerId.toString() !== seller._id.toString()) {
      throw new ForbiddenError("You do not have permission to manage this sub-order");
    }

    // Finite State Machine validation
    const allowedNextStatuses = ALLOWED_SELLER_STATUS_TRANSITIONS[subOrder.status] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${subOrder.status}' to '${newStatus}'. Allowed transitions: ${allowedNextStatuses.join(", ") || "None"}`
      );
    }

    // Tracking timestamps
    const updatedTracking = tracking ? { ...tracking } : subOrder.tracking;
    if (newStatus === "SHIPPED" && updatedTracking) {
      updatedTracking.shippedAt = new Date();
    } else if (newStatus === "DELIVERED" && updatedTracking) {
      updatedTracking.deliveredAt = new Date();
    }

    const updated = await this.repository.updateSellerOrderStatus(
      subOrderId,
      newStatus,
      note,
      updatedTracking
    );

    if (!updated) {
      throw new NotFoundError("Sub-order not found during update");
    }

    this.eventBus.publish("order.suborder_updated", {
      subOrderId: updated._id.toString(),
      subOrderNumber: updated.subOrderNumber,
      sellerId: seller._id.toString(),
      newStatus,
    });

    return updated;
  }
}

export const orderService = new OrderService();
