import { Types, FilterQuery } from "mongoose";
import { SellerModel, ISeller, SellerStatus } from "../model/seller.model.js";

export class SellerRepository {
  public async create(data: Partial<ISeller>): Promise<ISeller> {
    const seller = new SellerModel(data);
    return seller.save();
  }

  public async findByUserId(userId: string | Types.ObjectId): Promise<ISeller | null> {
    return SellerModel.findOne({ userId });
  }

  public async findBySlug(slug: string): Promise<ISeller | null> {
    return SellerModel.findOne({ slug });
  }

  public async findById(id: string | Types.ObjectId): Promise<ISeller | null> {
    return SellerModel.findById(id);
  }

  public async updateStatus(
    id: string | Types.ObjectId,
    status: SellerStatus,
    reason?: { rejectionReason?: string; suspendedReason?: string }
  ): Promise<ISeller | null> {
    return SellerModel.findByIdAndUpdate(
      id,
      {
        status,
        ...(reason?.rejectionReason && { rejectionReason: reason.rejectionReason }),
        ...(reason?.suspendedReason && { suspendedReason: reason.suspendedReason }),
      },
      { new: true }
    );
  }

  public async listApplications(
    status?: SellerStatus,
    page = 1,
    limit = 20
  ): Promise<{ items: ISeller[]; total: number }> {
    const query: FilterQuery<ISeller> = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SellerModel.find(query)
        .populate("userId", "firstName lastName email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SellerModel.countDocuments(query),
    ]);

    return { items, total };
  }
}

export const sellerRepository = new SellerRepository();
