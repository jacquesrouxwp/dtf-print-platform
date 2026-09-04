"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/lib/safe-storage";

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
import type { PlacedPiece } from "@/lib/nesting";

export type CartLine = {
  id: string;
  lengthMm: number;
  billedMeters: number;
  rate: number;
  subtotalExcl: number;
  trade: boolean;
  rush: boolean;
  /** Gap this film was laid out and priced with. */
  gapMm?: number;
  designs: {
    id: string;
    name: string;
    storageKey?: string;
    qty: number;
    widthMm: number;
    heightMm: number;
    trimBox?: { x: number; y: number; w: number; h: number };
  }[];
  placed: PlacedPiece[];
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

export function cartFingerprint(line: {
  lengthMm: number;
  gapMm?: number;
  designs: { id: string; qty: number; widthMm: number; heightMm: number; storageKey?: string }[];
  placed?: { id: string; xMm: number; yMm: number; rotation: number; flipX?: boolean }[];
}): string {
  const designs = line.designs
    .map((d) => `${d.id}:${d.qty}:${d.widthMm}x${d.heightMm}:${d.storageKey ?? ""}`)
    .join(",");
  const placed = (line.placed ?? [])
    .map((p) => `${p.id}:${p.xMm}:${p.yMm}:${p.rotation}:${p.flipX ? 1 : 0}`)
    .join(",");
  return `${line.lengthMm}|${line.gapMm ?? ""}|${designs}|${placed}`;
}

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
          const fp = cartFingerprint(line);
          if (s.lines.some((l) => cartFingerprint(l) === fp)) return s;
          return {
            lines: [
              ...s.lines,
              {
                ...line,
                designs: line.designs.map((d) => ({ ...d })),
              },
            ],
          };
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
