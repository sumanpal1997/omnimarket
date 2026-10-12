import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserProfile, authService } from "@/services/auth.service";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ isLoading: loading }),
      checkAuth: async () => {
        try {
          const user = await authService.getMe();
          set({ user });
        } catch {
          // If token expired or guest session, keep current user or null
        }
      },
      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // ignore logout network errors
        } finally {
          set({ user: null });
        }
      },
    }),
    {
      name: "omnimarket-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
