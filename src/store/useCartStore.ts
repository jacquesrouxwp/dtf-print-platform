"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlacedPiece } from "@/lib/nesting";

export type CartLine = {
  id: string;
  lengthMm: number;
  billedMeters: number;
  rate: number;
  subtotalExcl: number;
  trade: boolean;
  rush: boolean;
  designs: {
    name: string;
    qty: number;
    widthMm: number;
    heightMm: number;
  }[];
  placed: PlacedPiece[];
  preview?: string;
  createdAt: string;
};

export type DraftLayout = {
  id: string;
  name: string;
  savedAt: string;
  payload: string;
};

type CartState = {
  lines: CartLine[];
  drafts: DraftLayout[];
  addLine: (line: CartLine) => void;
  removeLine: (id: string) => void;
  clear: () => void;
  saveDraft: (draft: DraftLayout) => void;
  removeDraft: (id: string) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      drafts: [],
      addLine: (line) => set((s) => ({ lines: [...s.lines, line] })),
      removeLine: (id) =>
        set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
      saveDraft: (draft) =>
        set((s) => ({
          drafts: [draft, ...s.drafts.filter((d) => d.id !== draft.id)].slice(
            0,
            20
          ),
        })),
      removeDraft: (id) =>
        set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
    }),
    { name: "hlv-cart" }
  )
);
