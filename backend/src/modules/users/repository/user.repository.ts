import { Types } from "mongoose";
import { UserModel, IUser, UserRole } from "../model/user.model.js";

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export class UserRepository {
  public async create(data: CreateUserDto): Promise<IUser> {
    const user = new UserModel({
      ...data,
      role: data.role || "CUSTOMER",
    });
    return user.save();
  }

  public async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
  }

  public async findById(id: string | Types.ObjectId): Promise<IUser | null> {
    return UserModel.findById(id);
  }

  public async incrementTokenVersion(userId: string | Types.ObjectId): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      { $inc: { tokenVersion: 1 } },
      { new: true }
    );
  }

  public async updatePassword(
    userId: string | Types.ObjectId,
    passwordHash: string
  ): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(
      userId,
      {
        passwordHash,
        $inc: { tokenVersion: 1 }, // Invalidate all existing tokens on password change
      },
      { new: true }
    );
  }
}

export const userRepository = new UserRepository();
