import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types/api";

export interface Address {
  _id: string;
  label: "HOME" | "WORK" | "OTHER";
  isDefault: boolean;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface FullUserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  addresses: Address[];
}

export const userService = {
  async getProfile(): Promise<FullUserProfile> {
    const response = await apiClient.get<ApiResponse<{ user: FullUserProfile }>>("/users/profile");
    return response.data.data.user;
  },

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<FullUserProfile> {
    const response = await apiClient.patch<ApiResponse<{ user: FullUserProfile }>>(
      "/users/profile",
      data
    );
    return response.data.data.user;
  },

  async getAddresses(): Promise<Address[]> {
    const response = await apiClient.get<ApiResponse<{ addresses: Address[] }>>(
      "/users/addresses"
    );
    return response.data.data.addresses;
  },

  async addAddress(address: Omit<Address, "_id">): Promise<Address[]> {
    const response = await apiClient.post<ApiResponse<{ addresses: Address[] }>>(
      "/users/addresses",
      address
    );
    return response.data.data.addresses;
  },

  async setDefaultAddress(addressId: string): Promise<Address[]> {
    const response = await apiClient.patch<ApiResponse<{ addresses: Address[] }>>(
      `/users/addresses/${addressId}/default`
    );
    return response.data.data.addresses;
  },

  async deleteAddress(addressId: string): Promise<Address[]> {
    const response = await apiClient.delete<ApiResponse<{ addresses: Address[] }>>(
      `/users/addresses/${addressId}`
    );
    return response.data.data.addresses;
  },
};
