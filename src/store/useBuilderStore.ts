"use client";

import { create } from "zustand";
import {
  dpiWarnings,
  effectiveDpi,
  inspectImageTransparency,
  isLikelyCmykPdf,
  MAX_FILE_BYTES,
  previewDataUrl,
  type ArtworkWarning,
} from "@/lib/artwork";
import { nest, type PlacedPiece } from "@/lib/nesting";
import { rollFromSite } from "@/lib/roll";
import type { SiteConfig } from "@/lib/site-config";

export type Design = {
  id: string;
  name: string;
  src: string;
  mime: string;
  pixelW: number;
  pixelH: number;
  widthMm: number;
  heightMm: number;
  qty: number;
  locked: boolean;
  xMm?: number;
  yMm?: number;
  rotation: 0 | 90;
  warnings: ArtworkWarning[];
  hasAlpha: boolean;
  whiteBackground: boolean;
};

type BuilderState = {
  designs: Design[];
  placed: PlacedPiece[];
  lengthMm: number;
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
  loadSnapshot: (json: string, config: SiteConfig) => void;
  snapshot: () => string;
  reset: () => void;
};

function recomputeWarnings(d: Design, config: SiteConfig): ArtworkWarning[] {
  const printW = d.rotation === 90 ? d.heightMm : d.widthMm;
  const dpi = effectiveDpi(d.pixelW, printW);
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
  if (d.mime === "application/pdf") {
    warnings.push({ level: "info", code: "cmyk", messageKey: "builder.warnCmyk" });
  }
  const usable = config.rollWidthMm - 2 * config.edgeMm;
  if (d.widthMm > usable && d.heightMm > usable) {
    warnings.push({ level: "red", code: "too_wide", messageKey: "builder.warnWide" });
  }
  return warnings;
}

function pack(designs: Design[], config: SiteConfig) {
  return nest(
    designs.map((d) => ({
      designId: d.id,
      widthMm: d.widthMm,
      heightMm: d.heightMm,
      qty: d.qty,
      allowRotate: !d.locked,
      locked: d.locked,
      xMm: d.xMm,
      yMm: d.yMm,
      rotation: d.rotation,
    })),
    rollFromSite(config)
  );
}

function applyPack(designs: Design[], config: SiteConfig) {
  const result = pack(designs, config);
  const next = designs.map((d) => {
    const piece = result.items.find((p) => p.designId === d.id);
    return {
      ...d,
      warnings: recomputeWarnings(d, config),
      xMm: piece?.xMm ?? d.xMm,
      yMm: piece?.yMm ?? d.yMm,
      rotation: piece?.rotation ?? d.rotation,
    };
  });
  return { designs: next, placed: result.items, lengthMm: result.usedLengthMm };
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  designs: [],
  placed: [],
  lengthMm: 0,
  selectedId: null,
  adding: false,

  addFiles: async (files, config) => {
    set({ adding: true });
    const created: Design[] = [];
    for (const file of files) {
      try {
        const huge = file.size > MAX_FILE_BYTES;
        const pdf = isLikelyCmykPdf(file);
        if (pdf) {
          const id = crypto.randomUUID();
          created.push({
            id,
            name: file.name,
            src: "",
            mime: file.type || "application/pdf",
            pixelW: 3508,
            pixelH: 2480,
            widthMm: 210,
            heightMm: 148,
            qty: 1,
            locked: false,
            rotation: 0,
            warnings: [],
            hasAlpha: false,
            whiteBackground: false,
          });
          continue;
        }
        const preview = await previewDataUrl(file);
        const inspect = await inspectImageTransparency(file);
        const defaultWidth = Math.min(
          config.rollWidthMm - 2 * config.edgeMm,
          Math.round((inspect.width / 300) * 25.4)
        );
        const ratio = inspect.height / inspect.width || 1;
        const widthMm = Math.max(10, defaultWidth);
        const heightMm = Math.max(10, Math.round(widthMm * ratio));
        const id = crypto.randomUUID();
        const design: Design = {
          id,
          name: file.name,
          src: preview,
          mime: file.type || "image/png",
          pixelW: inspect.width,
          pixelH: inspect.height,
          widthMm,
          heightMm,
          qty: 1,
          locked: false,
          rotation: 0,
          warnings: huge
            ? [
                {
                  level: "red",
                  code: "file_huge",
                  messageKey: "builder.warnHuge",
                },
              ]
            : [],
          hasAlpha: inspect.hasAlpha,
          whiteBackground: inspect.whiteBackground,
        };
        created.push(design);
      } catch {
        /* skip unreadable file */
      }
    }
    const designs = [...get().designs, ...created];
    set({ ...applyPack(designs, config), adding: false, selectedId: created[0]?.id ?? get().selectedId });
  },

  addDesigns: (incoming, config) => {
    const designs = [...get().designs, ...incoming];
    set({ ...applyPack(designs, config), selectedId: incoming[0]?.id ?? get().selectedId });
  },

  updateDesign: (id, patch, config) => {
    const designs = get().designs.map((d) => {
      if (d.id !== id) return d;
      const next = { ...d, ...patch };
      if (patch.widthMm && !patch.heightMm && d.widthMm > 0) {
        const ratio = d.heightMm / d.widthMm;
        next.heightMm = Number((patch.widthMm * ratio).toFixed(1));
      }
      if (patch.heightMm && !patch.widthMm && d.heightMm > 0) {
        const ratio = d.widthMm / d.heightMm;
        next.widthMm = Number((patch.heightMm * ratio).toFixed(1));
      }
      return next;
    });
    const shouldRepack =
      patch.widthMm !== undefined ||
      patch.heightMm !== undefined ||
      patch.qty !== undefined ||
      patch.rotation !== undefined ||
      patch.locked !== undefined;
    if (shouldRepack) set(applyPack(designs, config));
    else set({ designs: designs.map((d) => ({ ...d, warnings: recomputeWarnings(d, config) })) });
  },

  removeDesign: (id, config) => {
    const designs = get().designs.filter((d) => d.id !== id);
    set({
      ...applyPack(designs, config),
      selectedId: get().selectedId === id ? null : get().selectedId,
    });
  },

  select: (id) => set({ selectedId: id }),

  autoArrange: (config) => {
    const unlocked = get().designs.map((d) =>
      d.locked ? d : { ...d, xMm: undefined, yMm: undefined }
    );
    set(applyPack(unlocked, config));
  },

  movePiece: (id, xMm, yMm, config) => {
    const placed = get().placed.map((p) =>
      p.id === id || p.designId === id ? { ...p, xMm, yMm } : p
    );
    const lengthMm =
      placed.length === 0
        ? 0
        : Math.max(...placed.map((p) => p.yMm + p.heightMm)) + config.edgeMm;
    const designs = get().designs.map((d) =>
      d.id === id || placed.some((p) => p.id === id && p.designId === d.id)
        ? { ...d, xMm, yMm, locked: true }
        : d
    );
    set({ placed, lengthMm, designs });
  },

  loadSnapshot: (json, config) => {
    try {
      const parsed = JSON.parse(json) as { designs: Design[] };
      if (!Array.isArray(parsed.designs)) return;
      set(applyPack(parsed.designs, config));
    } catch {
      /* ignore */
    }
  },

  snapshot: () =>
    JSON.stringify({
      designs: get().designs,
      placed: get().placed,
      lengthMm: get().lengthMm,
    }),

  reset: () =>
    set({ designs: [], placed: [], lengthMm: 0, selectedId: null, adding: false }),
}));
