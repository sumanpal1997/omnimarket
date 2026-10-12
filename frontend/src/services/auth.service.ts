import { apiClient, setAccessToken } from "@/lib/api-client";
import { ApiResponse, Role } from "@/types/api";
import { LoginFormData } from "@/schemas/auth.schema";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: string;
  isEmailVerified: boolean;
}

export interface AuthResponseData {
  user: UserProfile;
  accessToken: string;
}

export const authService = {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: "CUSTOMER" | "SELLER";
  }): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>("/auth/register", data);
    setAccessToken(response.data.data.accessToken);
    return response.data.data;
  },

  async login(credentials: LoginFormData): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>("/auth/login", credentials);
    setAccessToken(response.data.data.accessToken);
    return response.data.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      setAccessToken(null);
    }
  },

  async getMe(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<{ user: UserProfile }>>("/auth/me");
    return response.data.data.user;
  },
};
