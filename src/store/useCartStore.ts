"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/lib/safe-storage";
import { cartFingerprint, upsertLine, type CartLine } from "@/lib/cart-lines";

export { cartFingerprint };
export type { CartLine };

/** One-shot: keep a real unpaid cart, then drop the old key so it cannot double-count. */
function adoptLegacyCart() {
  if (typeof window === "undefined") return;
  try {
    if (!window.localStorage.getItem("dtf-cart")) {
      const prev = window.localStorage.getItem("hlv-cart");
      if (prev) window.localStorage.setItem("dtf-cart", prev);
    }
    window.localStorage.removeItem("hlv-cart");
  } catch {
    /* ignore */
  }
}
adoptLegacyCart();

export type DraftLayout = {
  id: string;
  name: string;
  savedAt: string;
  payload: string;
};

type CartState = {
  lines: CartLine[];
  drafts: DraftLayout[];
  /** Adds a film, or replaces its line if that film is already in the cart. */
  addLine: (line: CartLine) => void;
  removeLine: (id: string) => void;
  clear: () => void;
  saveDraft: (draft: DraftLayout) => void;
  removeDraft: (id: string) => void;
};

function slimPayload(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as {
      designs?: { src?: string }[];
      placed?: unknown;
      lengthMm?: number;
    };
    return JSON.stringify({
      ...parsed,
      designs: (parsed.designs ?? []).map((d) => ({
        ...d,
        src: typeof d.src === "string" && d.src.startsWith("data:") ? "" : d.src,
      })),
    });
  } catch {
    return payload.slice(0, 8000);
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      drafts: [],
      addLine: (line) =>
        set((s) => {
          const lines = upsertLine(s.lines, line);
          return lines === s.lines ? s : { lines };
        }),
      removeLine: (id) =>
        set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
      saveDraft: (draft) =>
        set((s) => ({
          drafts: [
            { ...draft, payload: slimPayload(draft.payload) },
            ...s.drafts.filter((d) => d.id !== draft.id),
          ].slice(0, 5),
        })),
      removeDraft: (id) =>
        set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
    }),
    {
      name: "dtf-cart",
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
