"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  dpiWarnings,
  effectiveDpi,
  type ArtworkWarning,
} from "@/lib/artwork";
import { nest, type PlacedPiece } from "@/lib/nesting";
import { rollFromSite } from "@/lib/roll";
import { usableWidthMm } from "@/lib/units";
import type { SiteConfig } from "@/lib/site-config";

export type Design = {
  id: string;
  name: string;
  src: string;
  storageKey?: string;
  mime: string;
  pixelW: number;
  pixelH: number;
  widthMm: number;
  heightMm: number;
  aspectRatio: number;
  qty: number;
  warnings: ArtworkWarning[];
  hasAlpha: boolean;
  hasSemiTransparency: boolean;
  whiteBackground: boolean;
  uploadError?: string;
};

type BuilderState = {
  designs: Design[];
  placed: PlacedPiece[];
  lengthMm: number;
  rejected: string[];
  selectedId: string | null;
  adding: boolean;
  addFiles: (files: File[], config: SiteConfig) => Promise<void>;
  addDesigns: (designs: Design[], config: SiteConfig) => void;
  updateDesign: (
    id: string,
    patch: Partial<Design>,
    config: SiteConfig
  ) => void;
  removeDesign: (id: string, config: SiteConfig) => void;
  select: (id: string | null) => void;
  autoArrange: (config: SiteConfig) => void;
  movePiece: (id: string, xMm: number, yMm: number, config: SiteConfig) => void;
  patchCopies: (
    designId: string,
    patch: Partial<PlacedPiece>,
    config: SiteConfig
  ) => void;
  loadSnapshot: (json: string, config: SiteConfig) => void;
  snapshot: () => string;
  reset: () => void;
};

function recomputeWarnings(d: Design, config: SiteConfig): ArtworkWarning[] {
  const dpi = effectiveDpi(d.pixelW, d.widthMm);
  const warnings = [...dpiWarnings(dpi)];
  if (d.mime === "image/jpeg" || /\.jpe?g$/i.test(d.name)) {
    warnings.push({ level: "amber", code: "jpeg", messageKey: "builder.warnJpeg" });
  }
  if (d.whiteBackground) {
    warnings.push({
      level: "red",
      code: "white_bg",
      messageKey: "builder.warnWhite",
    });
  }
  if (d.hasSemiTransparency) {
    warnings.push({
      level: "amber",
      code: "jpeg",
      messageKey: "builder.warnWhite",
    });
  }
  const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
  if (d.widthMm > usable && d.heightMm > usable) {
    warnings.push({ level: "red", code: "too_wide", messageKey: "builder.warnWide" });
  }
  return warnings;
}

function syncPlaced(designs: Design[], existing: PlacedPiece[]): PlacedPiece[] {
  const next: PlacedPiece[] = [];
  for (const d of designs) {
    const copies = existing.filter((p) => p.designId === d.id);
    const qty = Math.max(1, d.qty);
    for (let i = 0; i < qty; i++) {
      const prev = copies[i];
      next.push({
        id: prev?.id ?? `${d.id}:${i}`,
        designId: d.id,
        widthMm: d.widthMm,
        heightMm: d.heightMm,
        xMm: prev?.xMm ?? 0,
        yMm: prev?.yMm ?? 0,
        rotation: prev?.rotation ?? 0,
        locked: prev?.locked ?? false,
      });
    }
  }
  return next;
}

function applyPack(
  designs: Design[],
  existing: PlacedPiece[],
  config: SiteConfig
) {
  const seeded = syncPlaced(designs, existing);
  const result = nest(
    designs.map((d) => ({
      designId: d.id,
      widthMm: d.widthMm,
      heightMm: d.heightMm,
      qty: d.qty,
      allowRotate: true,
      instances: seeded
        .filter((p) => p.designId === d.id)
        .map((p) => ({
          id: p.id,
          locked: p.locked,
          xMm: p.xMm,
          yMm: p.yMm,
          rotation: p.rotation,
        })),
    })),
    rollFromSite(config)
  );
  return {
    designs: designs.map((d) => ({ ...d, warnings: recomputeWarnings(d, config) })),
    placed: result.items,
    lengthMm: result.usedLengthMm,
    rejected: result.rejected,
  };
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      designs: [],
      placed: [],
      lengthMm: 0,
      rejected: [],
      selectedId: null,
      adding: false,

      addFiles: async (files, config) => {
        set({ adding: true });
        const created: Design[] = [];
        for (const file of files) {
          try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) {
              created.push({
                id: crypto.randomUUID(),
                name: file.name,
                src: "",
                mime: file.type,
                pixelW: 0,
                pixelH: 0,
                widthMm: 100,
                heightMm: 100,
                aspectRatio: 1,
                qty: 1,
                warnings: [],
                hasAlpha: false,
                hasSemiTransparency: false,
                whiteBackground: false,
                uploadError: data.error || "upload failed",
              });
              continue;
            }
            created.push({
              id: data.id,
              name: data.name,
              src: data.previewUrl,
              storageKey: data.storageKey,
              mime: data.mime,
              pixelW: data.pixelW,
              pixelH: data.pixelH,
              widthMm: data.widthMm,
              heightMm: data.heightMm,
              aspectRatio: data.aspectRatio || data.pixelW / data.pixelH,
              qty: 1,
              warnings: [],
              hasAlpha: data.hasAlpha,
              hasSemiTransparency: data.hasSemiTransparency,
              whiteBackground: data.whiteBackground,
            });
          } catch {
            created.push({
              id: crypto.randomUUID(),
              name: file.name,
              src: "",
              mime: file.type,
              pixelW: 0,
              pixelH: 0,
              widthMm: 100,
              heightMm: 100,
              aspectRatio: 1,
              qty: 1,
              warnings: [],
              hasAlpha: false,
              hasSemiTransparency: false,
              whiteBackground: false,
              uploadError: "upload failed",
            });
          }
        }
        const designs = [...get().designs, ...created];
        set({
          ...applyPack(designs, get().placed, config),
          adding: false,
          selectedId: created[0]?.id ?? get().selectedId,
        });
      },

      addDesigns: (incoming, config) => {
        const designs = [...get().designs, ...incoming];
        set({
          ...applyPack(designs, get().placed, config),
          selectedId: incoming[0]?.id ?? get().selectedId,
        });
      },

      updateDesign: (id, patch, config) => {
        const designs = get().designs.map((d) => {
          if (d.id !== id) return d;
          const next = { ...d, ...patch };
          const ratio = d.aspectRatio > 0 ? d.aspectRatio : d.widthMm / Math.max(1, d.heightMm);
          next.aspectRatio = ratio;
          if (patch.widthMm !== undefined && patch.heightMm === undefined && patch.widthMm > 0) {
            next.heightMm = Number((patch.widthMm / ratio).toFixed(1));
          }
          if (patch.heightMm !== undefined && patch.widthMm === undefined && patch.heightMm > 0) {
            next.widthMm = Number((patch.heightMm * ratio).toFixed(1));
          }
          return next;
        });
        const shouldRepack =
          patch.widthMm !== undefined ||
          patch.heightMm !== undefined ||
          patch.qty !== undefined;
        if (shouldRepack) set(applyPack(designs, get().placed, config));
        else
          set({
            designs: designs.map((d) => ({ ...d, warnings: recomputeWarnings(d, config) })),
          });
      },

      removeDesign: (id, config) => {
        const designs = get().designs.filter((d) => d.id !== id);
        set({
          ...applyPack(designs, get().placed, config),
          selectedId: get().selectedId === id ? null : get().selectedId,
        });
      },

      select: (id) => set({ selectedId: id }),

      autoArrange: (config) => {
        const unlocked = get().placed.map((p) => ({ ...p, locked: false }));
        set(applyPack(get().designs, unlocked, config));
      },

      patchCopies: (designId, patch, config) => {
        const placed = get().placed.map((p) =>
          p.designId === designId ? { ...p, ...patch } : p
        );
        set(applyPack(get().designs, placed, config));
      },

      movePiece: (id, xMm, yMm, config) => {
        const placed = get().placed.map((p) =>
          p.id === id ? { ...p, xMm, yMm, locked: true } : p
        );
        const lengthMm =
          placed.length === 0
            ? 0
            : Math.max(...placed.map((p) => p.yMm + p.heightMm)) + config.edgeMm;
        set({ placed, lengthMm });
      },

      loadSnapshot: (json, config) => {
        try {
          const parsed = JSON.parse(json) as { designs: Design[]; placed?: PlacedPiece[] };
          if (!Array.isArray(parsed.designs)) return;
          set(applyPack(parsed.designs, parsed.placed ?? [], config));
        } catch {
          /* ignore */
        }
      },

      snapshot: () =>
        JSON.stringify({
          designs: get().designs.map((d) => ({ ...d, src: d.src.startsWith("data:") ? "" : d.src })),
          placed: get().placed,
          lengthMm: get().lengthMm,
        }),

      reset: () =>
        set({
          designs: [],
          placed: [],
          lengthMm: 0,
          rejected: [],
          selectedId: null,
          adding: false,
        }),
    }),
    {
      name: "hlv-builder",
      partialize: (s) => ({
        designs: s.designs.map((d) => ({
          ...d,
          src: d.src.startsWith("data:") ? "" : d.src,
        })),
        placed: s.placed,
        lengthMm: s.lengthMm,
        rejected: s.rejected,
      }),
    }
  )
);
