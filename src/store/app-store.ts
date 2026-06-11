"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale, SearchFilters } from "@/types";

interface AppState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  searchFilters: SearchFilters;
  setSearchFilters: (filters: Partial<SearchFilters>) => void;
  resetSearchFilters: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
      searchFilters: {},
      setSearchFilters: (filters) =>
        set((state) => ({
          searchFilters: { ...state.searchFilters, ...filters },
        })),
      resetSearchFilters: () => set({ searchFilters: {} }),
    }),
    { name: "safar-sathi-store", skipHydration: true }
  )
);

interface BookingCartState {
  serviceType: string;
  serviceId: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  guests: number;
  amount: number;
  setCart: (data: Partial<BookingCartState>) => void;
  clearCart: () => void;
}

const initialCart = {
  serviceType: "",
  serviceId: "",
  serviceName: "",
  startDate: "",
  endDate: "",
  guests: 1,
  amount: 0,
};

export const useBookingCart = create<BookingCartState>()((set) => ({
  ...initialCart,
  setCart: (data) => set((state) => ({ ...state, ...data })),
  clearCart: () => set(initialCart),
}));
