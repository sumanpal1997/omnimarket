import { create } from "zustand";
import { cartService, CartData } from "@/services/cart.service";

interface CartState {
  cart: CartData | null;
  isLoading: boolean;
  totalItems: number;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, sku: string, quantity?: number) => Promise<void>;
  updateQuantity: (sku: string, quantity: number) => Promise<void>;
  removeItem: (sku: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  totalItems: 0,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const cart = await cartService.getCart();
      const totalItems = cart.pricing?.totalItemsCount ?? 0;
      set({ cart, totalItems, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (productId: string, sku: string, quantity = 1) => {
    try {
      set({ isLoading: true });
      const cart = await cartService.addItem(productId, sku, quantity);
      const totalItems = cart.pricing?.totalItemsCount ?? 0;
      set({ cart, totalItems, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  updateQuantity: async (sku: string, quantity: number) => {
    try {
      set({ isLoading: true });
      const cart = await cartService.updateItemQuantity(sku, quantity);
      const totalItems = cart.pricing?.totalItemsCount ?? 0;
      set({ cart, totalItems, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  removeItem: async (sku: string) => {
    try {
      set({ isLoading: true });
      const cart = await cartService.removeItem(sku);
      const totalItems = cart.pricing?.totalItemsCount ?? 0;
      set({ cart, totalItems, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  clearCart: async () => {
    try {
      await cartService.clearCart();
      set({ cart: null, totalItems: 0 });
    } catch (err) {
      throw err;
    }
  },
}));
