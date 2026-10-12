import { ClientSession, Types } from "mongoose";
import {
  MasterOrderModel,
  SellerOrderModel,
  IMasterOrder,
  ISellerOrder,
  SellerOrderStatus,
  IShippingTracking,
} from "../model/order.model.js";

export class OrderRepository {
  public async createMasterOrder(
    data: Partial<IMasterOrder>,
    session?: ClientSession
  ): Promise<IMasterOrder> {
    const order = new MasterOrderModel(data);
    return await order.save({ session });
  }

  public async createSellerOrders(
    ordersData: Partial<ISellerOrder>[],
    session?: ClientSession
  ): Promise<ISellerOrder[]> {
    if (session) {
      return (await SellerOrderModel.create(ordersData, { session })) as ISellerOrder[];
    }
    return (await SellerOrderModel.create(ordersData)) as ISellerOrder[];
  }

  public async findMasterOrderById(
    id: string | Types.ObjectId
  ): Promise<IMasterOrder | null> {
    return await MasterOrderModel.findById(id).populate("subOrderIds");
  }

  public async findMasterOrderByNumber(
    orderNumber: string
  ): Promise<IMasterOrder | null> {
    return await MasterOrderModel.findOne({ orderNumber }).populate({
      path: "subOrderIds",
      populate: { path: "sellerId", select: "storeName contactEmail" },
    });
  }

  public async findMasterOrdersByCustomer(
    customerId: string | Types.ObjectId,
    pagination: { skip: number; limit: number }
  ): Promise<IMasterOrder[]> {
    return await MasterOrderModel.find({ customerId })
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate({
        path: "subOrderIds",
        select: "subOrderNumber status items totalMinor tracking",
      });
  }

  public async countMasterOrdersByCustomer(
    customerId: string | Types.ObjectId
  ): Promise<number> {
    return await MasterOrderModel.countDocuments({ customerId });
  }

  public async findSellerOrdersBySeller(
    sellerId: string | Types.ObjectId,
    filter: { status?: string },
    pagination: { skip: number; limit: number }
  ): Promise<ISellerOrder[]> {
    const query: Record<string, any> = { sellerId };
    if (filter.status) {
      query.status = filter.status;
    }

    return await SellerOrderModel.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate({
        path: "masterOrderId",
        select: "orderNumber shippingAddress customerId paymentStatus",
      });
  }

  public async countSellerOrdersBySeller(
    sellerId: string | Types.ObjectId,
    filter: { status?: string }
  ): Promise<number> {
    const query: Record<string, any> = { sellerId };
    if (filter.status) {
      query.status = filter.status;
    }
    return await SellerOrderModel.countDocuments(query);
  }

  public async findSellerOrderById(
    id: string | Types.ObjectId
  ): Promise<ISellerOrder | null> {
    return await SellerOrderModel.findById(id).populate({
      path: "masterOrderId",
      select: "orderNumber shippingAddress paymentStatus",
    });
  }

  public async updateSellerOrderStatus(
    id: string | Types.ObjectId,
    status: SellerOrderStatus,
    note?: string,
    tracking?: IShippingTracking
  ): Promise<ISellerOrder | null> {
    const update: any = {
      $set: { status },
      $push: {
        statusHistory: {
          status,
          timestamp: new Date(),
          note: note || `Status updated to ${status}`,
        },
      },
    };

    if (tracking) {
      update.$set.tracking = tracking;
    }

    return await SellerOrderModel.findByIdAndUpdate(id, update, { new: true });
  }
}

export const orderRepository = new OrderRepository();
