import { Types } from "mongoose";
import { CartModel, ICart } from "../model/cart.model.js";

export class CartRepository {
  public async findByUserId(userId: string | Types.ObjectId): Promise<ICart | null> {
    return CartModel.findOne({ userId });
  }

  public async findByGuestToken(guestToken: string): Promise<ICart | null> {
    return CartModel.findOne({ guestToken });
  }

  public async create(data: Partial<ICart>): Promise<ICart> {
    const cart = new CartModel({
      ...data,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day TTL
    });
    return cart.save();
  }

  public async deleteById(id: string | Types.ObjectId): Promise<void> {
    await CartModel.findByIdAndDelete(id);
  }
}

export const cartRepository = new CartRepository();
