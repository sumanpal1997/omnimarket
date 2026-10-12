import { Types } from "mongoose";
import { sellerRepository, SellerRepository } from "../repository/seller.repository.js";
import { userRepository, UserRepository } from "../../users/repository/user.repository.js";
import { auditLogService, AuditLogService } from "../../admins/service/audit-log.service.js";
import { domainEventBus, DomainEventBus } from "../../../core/events/event-bus.js";
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../../../core/errors/app-error.js";
import {
  SellerApplicationInput,
  ReviewSellerApplicationInput,
  UpdateSellerStatusInput,
} from "../validation/seller.validation.js";
import { ISeller, SellerStatus } from "../model/seller.model.js";

export class SellerService {
  constructor(
    private sellerRepo: SellerRepository = sellerRepository,
    private userRepo: UserRepository = userRepository,
    private auditLogs: AuditLogService = auditLogService,
    private eventBus: DomainEventBus = domainEventBus
  ) {}

  public async apply(userId: string, input: SellerApplicationInput): Promise<ISeller> {
    const existing = await this.sellerRepo.findByUserId(userId);
    if (existing) {
      if (existing.status === "PENDING") {
        throw new ConflictError("You already have a pending seller application under review");
      }
      if (existing.status === "ACTIVE" || existing.status === "APPROVED") {
        throw new ConflictError("You are already an active registered seller on OmniMarket");
      }
      if (existing.status === "BLOCKED") {
        throw new ForbiddenError("Your merchant account has been permanently blocked");
      }
    }

    // Generate unique slug from storeName
    const baseSlug = input.storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await this.sellerRepo.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Mask bank account number for security (storing only last 4 digits plainly)
    const rawAccount = input.bankAccount.accountNumber;
    const maskedAccount = `••••••••${rawAccount.slice(-4)}`;

    const seller = await this.sellerRepo.create({
      userId: new Types.ObjectId(userId),
      storeName: input.storeName,
      slug,
      description: input.description,
      logoUrl: input.logoUrl,
      bannerUrl: input.bannerUrl,
      businessInfo: input.businessInfo,
      bankAccount: {
        bankName: input.bankAccount.bankName,
        accountNumberMasked: maskedAccount,
        routingCode: input.bankAccount.routingCode,
      },
      status: "PENDING",
      commissionRate: 10, // 10% standard platform commission
    });

    // Notify administrators via Domain Event
    this.eventBus.publish("seller.applied", {
      sellerId: seller._id.toString(),
      userId,
      storeName: seller.storeName,
    });

    return seller;
  }

  public async getMyProfile(userId: string): Promise<ISeller> {
    const seller = await this.sellerRepo.findByUserId(userId);
    if (!seller) {
      throw new NotFoundError("Seller profile not found. Please submit an application.");
    }
    return seller;
  }

  public async getById(sellerId: string): Promise<ISeller> {
    const seller = await this.sellerRepo.findById(sellerId);
    if (!seller) {
      throw new NotFoundError("Seller not found");
    }
    return seller;
  }

  public async reviewApplication(
    adminId: string,
    sellerId: string,
    input: ReviewSellerApplicationInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ISeller> {
    const seller = await this.sellerRepo.findById(sellerId);
    if (!seller) {
      throw new NotFoundError("Seller application not found");
    }

    // State machine guard: Only PENDING applications can be APPROVED or REJECTED
    if (seller.status !== "PENDING") {
      throw new BadRequestError(
        `Cannot review an application that is already in '${seller.status}' state`
      );
    }

    const newStatus: SellerStatus = input.status === "APPROVED" ? "ACTIVE" : "REJECTED";

    const updatedSeller = await this.sellerRepo.updateStatus(sellerId, newStatus, {
      rejectionReason: input.rejectionReason,
    });

    // If approved, update user's primary role to SELLER
    if (newStatus === "ACTIVE") {
      const user = await this.userRepo.findById(seller.userId);
      if (user) {
        user.role = "SELLER";
        await user.save();
      }
    }

    // Record formal administrative audit log
    await this.auditLogs.record({
      actorId: adminId,
      actorRole: "ADMIN",
      action: input.status === "APPROVED" ? "SELLER_APPROVED" : "SELLER_REJECTED",
      resource: "Seller",
      resourceId: seller._id,
      metadata: {
        storeName: seller.storeName,
        previousStatus: seller.status,
        newStatus,
        rejectionReason: input.rejectionReason,
      },
      ipAddress,
      userAgent,
    });

    // Publish domain event for transactional email / notifications
    this.eventBus.publish(
      input.status === "APPROVED" ? "seller.approved" : "seller.rejected",
      {
        sellerId: seller._id.toString(),
        userId: seller.userId.toString(),
        reason: input.rejectionReason,
      }
    );

    return updatedSeller!;
  }

  public async updateStatus(
    adminId: string,
    sellerId: string,
    input: UpdateSellerStatusInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ISeller> {
    const seller = await this.sellerRepo.findById(sellerId);
    if (!seller) {
      throw new NotFoundError("Seller not found");
    }

    // State machine transition validation
    if (seller.status === "BLOCKED") {
      throw new BadRequestError("Permanently blocked merchants cannot be re-activated");
    }

    const updatedSeller = await this.sellerRepo.updateStatus(sellerId, input.status, {
      suspendedReason: input.reason,
    });

    await this.auditLogs.record({
      actorId: adminId,
      actorRole: "ADMIN",
      action: `SELLER_STATUS_${input.status}`,
      resource: "Seller",
      resourceId: seller._id,
      metadata: {
        previousStatus: seller.status,
        newStatus: input.status,
        reason: input.reason,
      },
      ipAddress,
      userAgent,
    });

    return updatedSeller!;
  }

  public async listApplications(
    status?: SellerStatus,
    page = 1,
    limit = 20
  ): Promise<{ items: ISeller[]; total: number; totalPages: number }> {
    const { items, total } = await this.sellerRepo.listApplications(status, page, limit);
    return {
      items,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const sellerService = new SellerService();
