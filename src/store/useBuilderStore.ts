"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/lib/safe-storage";
import {
  dpiWarnings,
  printDpi,
  type ArtworkWarning,
} from "@/lib/artwork";
import type { TrimBox } from "@/lib/inspect-artwork";
import { localImageMeta, persistableSrc, readResponseJson } from "@/lib/local-artwork";
import { nest, type PlacedPiece } from "@/lib/nesting";
import { alignedPosition, duplicateOffset, type AlignEdge } from "@/lib/piece-ops";
import { rasterizeText, type TextSpec } from "@/lib/raster-text";
import { rollFromSite } from "@/lib/roll";
import { clampPieceSize, printSizeFromPixels, usableWidthMm } from "@/lib/units";
import type { SiteConfig } from "@/lib/site-config";

export type Design = {
  id: string;
  name: string;
  src: string;
  /** Server-served preview that survives navigation, unlike a blob: URL. */
  previewUrl?: string;
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
  allowRotate: boolean;
  uploadError?: string;
  trimBox?: TrimBox;
  /** Set when the piece is copy the customer typed, so it stays editable. */
  text?: TextSpec;
};

type BuilderSnap = {
  designs: Design[];
  placed: PlacedPiece[];
  lengthMm: number;
  rejected: string[];
};

type BuilderState = {
  designs: Design[];
  placed: PlacedPiece[];
  lengthMm: number;
  rejected: string[];
  selectedId: string | null;
  adding: boolean;
  history: BuilderSnap[];
  future: BuilderSnap[];
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
  resizePiece: (
    id: string,
    widthMm: number,
    heightMm: number,
    config: SiteConfig,
    origin?: { xMm: number; yMm: number }
  ) => void;
  patchCopies: (
    designId: string,
    patch: Partial<PlacedPiece>,
    config: SiteConfig
  ) => void;
  loadSnapshot: (json: string, config: SiteConfig) => void;
  snapshot: () => string;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  patchPiece: (id: string, patch: Partial<PlacedPiece>, config: SiteConfig) => void;
  flipPiece: (id: string) => void;
  rotatePiece: (id: string) => void;
  removePiece: (id: string, config: SiteConfig) => void;
  duplicatePiece: (id: string, config: SiteConfig) => void;
  copyPiece: (id: string) => void;
  pastePiece: (config: SiteConfig) => void;
  alignPiece: (id: string, edge: AlignEdge, config: SiteConfig) => void;
  setDesignText: (id: string, spec: TextSpec) => void;
  updateTextDesign: (
    id: string,
    patch: Partial<TextSpec>,
    config: SiteConfig
  ) => Promise<void>;
  clipboard: string | null;
};

function snapOf(s: { designs: Design[]; placed: PlacedPiece[]; lengthMm: number; rejected: string[] }): BuilderSnap {
  return {
    designs: s.designs,
    placed: s.placed,
    lengthMm: s.lengthMm,
    rejected: s.rejected,
  };
}

/** Bump this whenever the persisted Design/PlacedPiece shape changes. */
const PERSIST_VERSION = 2;

/**
 * Coerces one persisted design back into a valid Design.
 * Every array and number is guaranteed, so the UI can never deref undefined.
 */
function hydrateDesign(raw: unknown): Design | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<Design>;
  if (typeof d.id !== "string" || !d.id) return null;
  const widthMm = Number(d.widthMm);
  const heightMm = Number(d.heightMm);
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return null;
  return {
    id: d.id,
    name: typeof d.name === "string" ? d.name : "artwork",
    src:
      persistableSrc(typeof d.src === "string" ? d.src : "") ||
      (typeof d.previewUrl === "string" ? d.previewUrl : ""),
    previewUrl: typeof d.previewUrl === "string" ? d.previewUrl : undefined,
    storageKey: typeof d.storageKey === "string" ? d.storageKey : undefined,
    mime: typeof d.mime === "string" ? d.mime : "image/png",
    pixelW: Number.isFinite(Number(d.pixelW)) ? Number(d.pixelW) : 0,
    pixelH: Number.isFinite(Number(d.pixelH)) ? Number(d.pixelH) : 0,
    widthMm,
    heightMm,
    aspectRatio:
      Number.isFinite(Number(d.aspectRatio)) && Number(d.aspectRatio) > 0
        ? Number(d.aspectRatio)
        : widthMm / Math.max(1, heightMm),
    qty: Number.isFinite(Number(d.qty)) ? Math.max(1, Math.floor(Number(d.qty))) : 1,
    warnings: Array.isArray(d.warnings) ? d.warnings : [],
    hasAlpha: Boolean(d.hasAlpha),
    hasSemiTransparency: Boolean(d.hasSemiTransparency),
    whiteBackground: Boolean(d.whiteBackground),
    allowRotate: d.allowRotate !== false,
    uploadError: typeof d.uploadError === "string" ? d.uploadError : undefined,
    trimBox: d.trimBox,
  };
}

function recomputeWarnings(d: Design, config: SiteConfig): ArtworkWarning[] {
  const { dpi } = printDpi(d.pixelW, d.pixelH, d.widthMm, d.heightMm);
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
      code: "semi",
      messageKey: "builder.warnSemi",
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
        widthMm: prev?.locked ? prev.widthMm : d.widthMm,
        heightMm: prev?.locked ? prev.heightMm : d.heightMm,
        xMm: prev?.xMm ?? 0,
        yMm: prev?.yMm ?? 0,
        rotation: prev?.rotation ?? 0,
        locked: prev?.locked ?? false,
        flipX: prev?.flipX,
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
      allowRotate: d.allowRotate !== false,
      instances: seeded
        .filter((p) => p.designId === d.id)
        .map((p) => ({
          id: p.id,
          locked: p.locked,
          xMm: p.xMm,
          yMm: p.yMm,
          rotation: p.rotation,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          flipX: p.flipX,
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
      clipboard: null,
      adding: false,
      canUndo: false,
      canRedo: false,
      history: [] as BuilderSnap[],
      future: [] as BuilderSnap[],

      addFiles: async (files, config) => {
        set({ adding: true });
        const created: Design[] = [];
        const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
        try {
          for (const file of files) {
            let localSrc = "";
            let pixelW = 0;
            let pixelH = 0;
            try {
              const local = await localImageMeta(file);
              localSrc = local.src;
              pixelW = local.pixelW;
              pixelH = local.pixelH;
            } catch {
              /* server may still decode it */
            }
            const localSize =
              pixelW > 0 && pixelH > 0
                ? printSizeFromPixels(pixelW, pixelH, config.outputDpi)
                : { widthMm: 100, heightMm: 100, aspectRatio: 1 };
            const widthMm = Math.min(usable, localSize.widthMm);
            const heightMm = Math.max(10, Math.round(widthMm / Math.max(0.01, localSize.aspectRatio)));
            const fallback: Design = {
              id: crypto.randomUUID(),
              name: file.name,
              src: localSrc,
              mime: file.type || "image/png",
              pixelW,
              pixelH,
              widthMm,
              heightMm,
              aspectRatio: localSize.aspectRatio,
              qty: 1,
              warnings: [],
              hasAlpha: false,
              hasSemiTransparency: false,
              whiteBackground: false,
              allowRotate: true,
            };
            try {
              const form = new FormData();
              form.append("file", file);
              const res = await fetch("/api/upload", { method: "POST", body: form });
              const data = await readResponseJson(res);
              if (!res.ok) {
                created.push({
                  ...fallback,
                  uploadError: String(data.error || `http ${res.status}`),
                });
                continue;
              }
              created.push({
                ...fallback,
                id: typeof data.id === "string" && data.id ? data.id : fallback.id,
                src: localSrc || persistableSrc(String(data.previewUrl ?? "")),
                previewUrl: persistableSrc(String(data.previewUrl ?? "")) || undefined,
                storageKey: typeof data.storageKey === "string" ? data.storageKey : undefined,
                mime: typeof data.mime === "string" ? data.mime : fallback.mime,
                pixelW: Number(data.pixelW) > 0 ? Number(data.pixelW) : pixelW,
                pixelH: Number(data.pixelH) > 0 ? Number(data.pixelH) : pixelH,
                widthMm: Number(data.widthMm) > 0 ? Number(data.widthMm) : widthMm,
                heightMm: Number(data.heightMm) > 0 ? Number(data.heightMm) : heightMm,
                aspectRatio:
                  Number(data.aspectRatio) > 0 ? Number(data.aspectRatio) : localSize.aspectRatio,
                hasAlpha: Boolean(data.hasAlpha),
                hasSemiTransparency: Boolean(data.hasSemiTransparency),
                whiteBackground: Boolean(data.whiteBackground),
                trimBox: data.trimBox as TrimBox | undefined,
              });
            } catch {
              created.push({ ...fallback, uploadError: "upload failed" });
            }
          }
          const designs = [...get().designs, ...created];
          const prev = snapOf(get());
          let packed;
          try {
            packed = applyPack(designs, get().placed, config);
          } catch (err) {
            console.error("applyPack", err);
            packed = { designs, placed: get().placed, lengthMm: get().lengthMm, rejected: [] as string[] };
          }
          set({
            ...packed,
            adding: false,
            selectedId:
              packed.placed.find((p) => p.designId === created[0]?.id)?.id ??
              created[0]?.id ??
              get().selectedId,
            history: [...get().history, prev].slice(-40),
            future: [],
            canUndo: true,
            canRedo: false,
          });
        } catch (err) {
          console.error("addFiles", err);
          if (created.length) {
            set({
              designs: [...get().designs, ...created],
              adding: false,
              selectedId: created[0]?.id ?? get().selectedId,
            });
          } else {
            set({ adding: false });
          }
        }
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
          const safe: Partial<Design> = { ...patch };
          if (safe.widthMm !== undefined && !(safe.widthMm > 0)) delete safe.widthMm;
          if (safe.heightMm !== undefined && !(safe.heightMm > 0)) delete safe.heightMm;
          if (safe.qty !== undefined) safe.qty = Math.max(1, Math.floor(Number(safe.qty)) || 1);
          const next = { ...d, ...safe };
          const ratio = d.aspectRatio > 0 ? d.aspectRatio : d.widthMm / Math.max(1, d.heightMm);
          if (safe.aspectRatio === undefined) next.aspectRatio = ratio;
          if (safe.widthMm !== undefined && safe.heightMm === undefined && safe.widthMm > 0) {
            next.heightMm = Number((safe.widthMm / next.aspectRatio).toFixed(1));
          }
          if (safe.heightMm !== undefined && safe.widthMm === undefined && safe.heightMm > 0) {
            next.widthMm = Number((safe.heightMm * next.aspectRatio).toFixed(1));
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

      resizePiece: (id, widthMm, heightMm, config, origin) => {
        const current = get().placed.find((p) => p.id === id);
        if (!current) return;
        const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
        const size = clampPieceSize(widthMm, heightMm, usable);
        const prev = snapOf(get());
        const placed = get().placed.map((p) =>
          p.id === id
            ? {
                ...p,
                widthMm: size.widthMm,
                heightMm: size.heightMm,
                xMm: origin?.xMm ?? p.xMm,
                yMm: origin?.yMm ?? p.yMm,
                locked: true,
              }
            : p
        );
        const lengthMm =
          placed.length === 0
            ? 0
            : Math.max(...placed.map((p) => p.yMm + p.heightMm)) + config.edgeMm;
        set({
          placed,
          lengthMm,
          history: [...get().history, prev].slice(-40),
          future: [],
          canUndo: true,
          canRedo: false,
        });
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
          designs: get().designs.map((d) => ({
            ...d,
            src: persistableSrc(d.src) || d.previewUrl || "",
          })),
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
          history: [],
          future: [],
          canUndo: false,
          canRedo: false,
        }),

      undo: () => {
        const { history, future } = get();
        if (!history.length) return;
        const prev = history[history.length - 1];
        set({
          ...prev,
          history: history.slice(0, -1),
          future: [snapOf(get()), ...future].slice(0, 40),
          canUndo: history.length > 1,
          canRedo: true,
        });
      },

      redo: () => {
        const { future, history } = get();
        if (!future.length) return;
        const next = future[0];
        set({
          ...next,
          future: future.slice(1),
          history: [...history, snapOf(get())].slice(-40),
          canUndo: true,
          canRedo: future.length > 1,
        });
      },

      patchPiece: (id, patch, config) => {
        const prev = snapOf(get());
        const placed = get().placed.map((p) => (p.id === id ? { ...p, ...patch } : p));
        const lengthMm =
          placed.length === 0
            ? 0
            : Math.max(...placed.map((p) => p.yMm + p.heightMm)) + config.edgeMm;
        set({
          placed,
          lengthMm,
          history: [...get().history, prev].slice(-40),
          future: [],
          canUndo: true,
          canRedo: false,
        });
      },

      flipPiece: (id) => {
        const prev = snapOf(get());
        set({
          placed: get().placed.map((p) => (p.id === id ? { ...p, flipX: !p.flipX } : p)),
          history: [...get().history, prev].slice(-40),
          future: [],
          canUndo: true,
          canRedo: false,
        });
      },

      rotatePiece: (id) => {
        const prev = snapOf(get());
        set({
          placed: get().placed.map((p) =>
            p.id === id
              ? {
                  ...p,
                  rotation: p.rotation === 90 ? 0 : 90,
                  widthMm: p.heightMm,
                  heightMm: p.widthMm,
                  locked: true,
                }
              : p
          ),
          history: [...get().history, prev].slice(-40),
          future: [],
          canUndo: true,
          canRedo: false,
        });
      },

      setDesignText: (id, spec) =>
        set({
          designs: get().designs.map((d) => (d.id === id ? { ...d, text: spec } : d)),
        }),

      updateTextDesign: async (id, patch, config) => {
        const design = get().designs.find((d) => d.id === id);
        if (!design?.text) return;
        const spec: TextSpec = { ...design.text, ...patch };
        if (!spec.value.trim()) return;

        let file: File;
        try {
          file = await rasterizeText(spec.value, spec);
        } catch {
          return;
        }

        // The print file comes from storage, not from the canvas, so edited copy
        // has to be re-uploaded or the shop prints the previous wording.
        let uploaded: Record<string, unknown> = {};
        let ok = false;
        try {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: form });
          uploaded = await readResponseJson(res);
          ok = res.ok;
        } catch {
          ok = false;
        }

        const local = await localImageMeta(file).catch(() => null);
        const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
        const pixelW = Number(uploaded.pixelW) > 0 ? Number(uploaded.pixelW) : local?.pixelW ?? design.pixelW;
        const pixelH = Number(uploaded.pixelH) > 0 ? Number(uploaded.pixelH) : local?.pixelH ?? design.pixelH;
        const size =
          pixelW > 0 && pixelH > 0
            ? printSizeFromPixels(pixelW, pixelH, config.outputDpi)
            : { widthMm: design.widthMm, heightMm: design.heightMm, aspectRatio: design.aspectRatio };
        const widthMm = Math.min(usable, size.widthMm);
        const heightMm = Math.max(10, Math.round(widthMm / Math.max(0.01, size.aspectRatio)));

        const prev = snapOf(get());
        const designs = get().designs.map((d) =>
          d.id === id
            ? {
                ...d,
                text: spec,
                name: `${file.name}`,
                src: local?.src || persistableSrc(String(uploaded.previewUrl ?? "")) || d.src,
                previewUrl: persistableSrc(String(uploaded.previewUrl ?? "")) || d.previewUrl,
                storageKey: ok && typeof uploaded.storageKey === "string" ? uploaded.storageKey : d.storageKey,
                uploadError: ok ? undefined : "upload failed",
                pixelW,
                pixelH,
                widthMm,
                heightMm,
                aspectRatio: size.aspectRatio,
                trimBox: (uploaded.trimBox as TrimBox | undefined) ?? undefined,
              }
            : d
        );
        set({
          ...applyPack(designs, get().placed, config),
          history: [...get().history, prev].slice(-40),
          future: [],
          canUndo: true,
          canRedo: false,
        });
      },

      duplicatePiece: (id, config) => {
        const piece = get().placed.find((p) => p.id === id);
        if (!piece) return;
        const prev = snapOf(get());
        const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
        const at = duplicateOffset(piece, usable, config.gapMm, config.edgeMm);
        const copy: PlacedPiece = {
          ...piece,
          id: crypto.randomUUID(),
          xMm: at.xMm,
          yMm: at.yMm,
          locked: true,
        };
        const designs = get().designs.map((d) =>
          d.id === piece.designId ? { ...d, qty: d.qty + 1 } : d
        );
        set({
          ...applyPack(designs, [...get().placed, copy], config),
          selectedId: copy.id,
          history: [...get().history, prev].slice(-40),
          future: [],
          canUndo: true,
          canRedo: false,
        });
      },

      copyPiece: (id) => {
        const piece = get().placed.find((p) => p.id === id);
        set({ clipboard: piece ? piece.id : null });
      },

      pastePiece: (config) => {
        const id = get().clipboard;
        if (!id) return;
        // The copied piece may be gone by now; pasting nothing is not an error.
        if (!get().placed.some((p) => p.id === id)) return;
        get().duplicatePiece(id, config);
      },

      alignPiece: (id, edge, config) => {
        const piece = get().placed.find((p) => p.id === id);
        if (!piece) return;
        const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
        const at = alignedPosition(piece, usable, config.edgeMm, edge);
        get().patchPiece(id, { xMm: at.xMm, yMm: at.yMm, locked: true }, config);
      },

      removePiece: (id, config) => {
        const piece = get().placed.find((p) => p.id === id);
        if (!piece) return;
        const copies = get().placed.filter((p) => p.designId === piece.designId);
        if (copies.length <= 1) {
          get().removeDesign(piece.designId, config);
          return;
        }
        const prev = snapOf(get());
        const remaining = get().placed.filter((p) => p.id !== id);
        const designs = get().designs.map((d) =>
          d.id === piece.designId ? { ...d, qty: Math.max(1, d.qty - 1) } : d
        );
        set({
          ...applyPack(designs, remaining, config),
          selectedId: get().selectedId === id ? piece.designId : get().selectedId,
          history: [...get().history, prev].slice(-40),
          future: [],
          canUndo: true,
          canRedo: false,
        });
      },
    }),
    {
      name: "hlv-builder",
      version: PERSIST_VERSION,
      skipHydration: true,
      storage: createJSONStorage(() => ({
        getItem(name: string) {
          const raw = safeStorage.getItem(name);
          if (!raw) return raw;
          try {
            const parsed = JSON.parse(raw) as { version?: unknown; state?: unknown };
            // Pre-v2 blobs omit `version`; zustand then skips migrate.
            if (parsed && typeof parsed === "object" && typeof parsed.version !== "number") {
              parsed.version = 0;
              return JSON.stringify(parsed);
            }
          } catch {
            /* keep raw */
          }
          return raw;
        },
        setItem: safeStorage.setItem.bind(safeStorage),
        removeItem: safeStorage.removeItem.bind(safeStorage),
      })),
      /** Any older or corrupt blob is discarded rather than rehydrated. */
      migrate: (persisted, version) =>
        version === PERSIST_VERSION ? persisted : undefined,
      // Blobs written before `version` existed have no version field; zustand
      // then skips migrate. merge() still sanitizes them.
      merge: (persisted, current) => {
        try {
          const p = persisted as Partial<BuilderState> | undefined;
          if (!p || typeof p !== "object") return current;
          const designs = Array.isArray(p.designs)
            ? p.designs.map(hydrateDesign).filter(Boolean as unknown as (d: Design | null) => d is Design)
            : current.designs;
          const ids = new Set(designs.map((d) => d.id));
          return {
            ...current,
            designs,
            placed: Array.isArray(p.placed)
              ? p.placed.filter((x) => x && typeof x.id === "string" && ids.has(x.designId))
              : current.placed,
            lengthMm: Number.isFinite(p.lengthMm) ? Number(p.lengthMm) : current.lengthMm,
            rejected: Array.isArray(p.rejected) ? p.rejected.filter((x) => typeof x === "string") : [],
            selectedId: null,
            adding: false,
            history: [],
            future: [],
            canUndo: false,
            canRedo: false,
          };
        } catch {
          return current;
        }
      },
      partialize: (s) => ({
        designs: s.designs.map((d) => ({
          ...d,
          src: persistableSrc(d.src),
        })),
        placed: s.placed,
        lengthMm: s.lengthMm,
        rejected: s.rejected,
      }),
    }
  )
);
