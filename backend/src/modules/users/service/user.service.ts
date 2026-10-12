import { Types } from "mongoose";
import { UserModel, IUser, IAddress } from "../model/user.model.js";
import { NotFoundError } from "../../../core/errors/app-error.js";
import { UpdateProfileInput, AddressInput, UpdateAddressInput } from "../validation/user.validation.js";

export class UserService {
  public async getProfile(userId: string): Promise<IUser> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  public async updateProfile(userId: string, data: UpdateProfileInput): Promise<IUser> {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  public async getAddresses(userId: string): Promise<IAddress[]> {
    const user = await UserModel.findById(userId).select("addresses");
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user.addresses;
  }

  public async addAddress(userId: string, data: AddressInput): Promise<IAddress[]> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // If this is the user's first address or explicitly marked as default:
    const isFirstAddress = user.addresses.length === 0;
    const shouldBeDefault = isFirstAddress || data.isDefault;

    if (shouldBeDefault) {
      // Unset default status from any existing addresses
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const newAddress: IAddress = {
      _id: new Types.ObjectId(),
      label: data.label,
      isDefault: shouldBeDefault,
      street: data.street,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      phone: data.phone,
    };

    user.addresses.push(newAddress);
    await user.save();

    return user.addresses;
  }

  public async updateAddress(
    userId: string,
    addressId: string,
    data: UpdateAddressInput
  ): Promise<IAddress[]> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const address = user.addresses.find((a) => a._id?.toString() === addressId);
    if (!address) {
      throw new NotFoundError("Address not found");
    }

    if (data.isDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }

    Object.assign(address, data);
    await user.save();

    return user.addresses;
  }

  public async setDefaultAddress(userId: string, addressId: string): Promise<IAddress[]> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const addressExists = user.addresses.some((a) => a._id?.toString() === addressId);
    if (!addressExists) {
      throw new NotFoundError("Address not found");
    }

    // Atomic setting of default address flag
    user.addresses.forEach((a) => {
      a.isDefault = a._id?.toString() === addressId;
    });

    await user.save();
    return user.addresses;
  }

  public async deleteAddress(userId: string, addressId: string): Promise<IAddress[]> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const targetIndex = user.addresses.findIndex((a) => a._id?.toString() === addressId);
    if (targetIndex === -1) {
      throw new NotFoundError("Address not found");
    }

    const wasDefault = user.addresses[targetIndex].isDefault;
    user.addresses.splice(targetIndex, 1);

    // If the removed address was the default and addresses still remain, promote the first address
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return user.addresses;
  }
}

export const userService = new UserService();
