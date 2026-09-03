"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { migrateStorageKey, safeStorage } from "@/lib/safe-storage";

migrateStorageKey("hlv-session", "dtf-session");

export type LocalOrder = {
  id: string;
  email: string;
  createdAt: string;
  totalIncl: number;
  billedMeters: number;
  manifest: string;
};

type SessionState = {
  email: string | null;
  login: (email: string) => void;
  logout: () => void;
  orders: LocalOrder[];
  addOrder: (order: LocalOrder) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      email: null,
      login: (email) => set({ email }),
      logout: () => set({ email: null }),
      orders: [],
      addOrder: (order) =>
        set((s) => ({ orders: [order, ...s.orders].slice(0, 40) })),
    }),
    { name: "dtf-session", storage: createJSONStorage(() => safeStorage) }
  )
);
