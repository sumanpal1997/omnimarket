import { Types } from "mongoose";
import { RefreshTokenModel, IRefreshToken } from "../model/refresh-token.model.js";

export interface CreateRefreshTokenDto {
  userId: Types.ObjectId | string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class RefreshTokenRepository {
  public async create(data: CreateRefreshTokenDto): Promise<IRefreshToken> {
    const refreshToken = new RefreshTokenModel(data);
    return refreshToken.save();
  }

  public async findByTokenHash(tokenHash: string): Promise<IRefreshToken | null> {
    return RefreshTokenModel.findOne({ tokenHash });
  }

  /**
   * Revokes the entire token family when reuse/theft is detected
   */
  public async revokeFamily(familyId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ familyId }, { isRevoked: true });
  }

  /**
   * Revokes a single token upon replacement during rotation
   */
  public async revokeById(id: string | Types.ObjectId): Promise<void> {
    await RefreshTokenModel.findByIdAndUpdate(id, { isRevoked: true });
  }

  /**
   * Revokes all tokens belonging to a user (used during global logout)
   */
  public async revokeAllForUser(userId: string | Types.ObjectId): Promise<void> {
    await RefreshTokenModel.updateMany({ userId }, { isRevoked: true });
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
