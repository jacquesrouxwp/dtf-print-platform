import type { RollConfig } from "./roll";
import { billedLengthMm, usableWidthMm } from "./units";

export type NestInstance = {
  id: string;
  locked?: boolean;
  xMm?: number;
  yMm?: number;
  rotation?: 0 | 90;
  widthMm?: number;
  heightMm?: number;
  flipX?: boolean;
};

export type NestSource = {
  designId: string;
  widthMm: number;
  heightMm: number;
  qty: number;
  allowRotate?: boolean;
  locked?: boolean;
  xMm?: number;
  yMm?: number;
  rotation?: 0 | 90;
  instances?: NestInstance[];
};

export type PlacedItem = {
  id: string;
  designId: string;
  widthMm: number;
  heightMm: number;
  xMm: number;
  yMm: number;
  rotation: 0 | 90;
  locked: boolean;
  flipX?: boolean;
};

export type PlacedPiece = PlacedItem;

export type Layout = {
  items: PlacedItem[];
  usedLengthMm: number;
  billedLengthMm: number;
  rejected: string[];
};

export type NestResult = {
  placed: PlacedPiece[];
  lengthMm: number;
  overflow: string[];
};

type Rect = { x: number; y: number; w: number; h: number };

const EPS = 1e-6;
const TALL = 1_000_000;

function intersects(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.w <= b.x + EPS ||
    b.x + b.w <= a.x + EPS ||
    a.y + a.h <= b.y + EPS ||
    b.y + b.h <= a.y + EPS
  );
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    outer.x <= inner.x + EPS &&
    outer.y <= inner.y + EPS &&
    outer.x + outer.w >= inner.x + inner.w - EPS &&
    outer.y + outer.h >= inner.y + inner.h - EPS
  );
}

function splitByPlaced(fr: Rect, used: Rect): Rect[] {
  if (!intersects(fr, used)) return [fr];
  const next: Rect[] = [];
  if (used.x > fr.x + EPS) {
    next.push({ x: fr.x, y: fr.y, w: used.x - fr.x, h: fr.h });
  }
  if (used.x + used.w < fr.x + fr.w - EPS) {
    next.push({
      x: used.x + used.w,
      y: fr.y,
      w: fr.x + fr.w - (used.x + used.w),
      h: fr.h,
    });
  }
  if (used.y > fr.y + EPS) {
    next.push({ x: fr.x, y: fr.y, w: fr.w, h: used.y - fr.y });
  }
  if (used.y + used.h < fr.y + fr.h - EPS) {
    next.push({
      x: fr.x,
      y: used.y + used.h,
      w: fr.w,
      h: fr.y + fr.h - (used.y + used.h),
    });
  }
  return next.filter((r) => r.w > EPS && r.h > EPS);
}

function prune(rects: Rect[]): Rect[] {
  const kept: Rect[] = [];
  for (let i = 0; i < rects.length; i++) {
    let swallowed = false;
    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue;
      if (contains(rects[j], rects[i])) {
        swallowed = true;
        break;
      }
    }
    if (!swallowed) kept.push(rects[i]);
  }
  return kept;
}

type Candidate = {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: 0 | 90;
  short: number;
  long: number;
};

function bestFit(
  free: Rect[],
  w: number,
  h: number,
  allowRotate: boolean
): Candidate | null {
  let best: Candidate | null = null;
  const orients: { w: number; h: number; rot: 0 | 90 }[] = [
    { w, h, rot: 0 },
  ];
  if (allowRotate && Math.abs(w - h) > EPS) {
    orients.push({ w: h, h: w, rot: 90 });
  }
  for (const fr of free) {
    for (const o of orients) {
      if (o.w > fr.w + EPS || o.h > fr.h + EPS) continue;
      const leftoverW = fr.w - o.w;
      const leftoverH = fr.h - o.h;
      const short = Math.min(leftoverW, leftoverH);
      const long = Math.max(leftoverW, leftoverH);
      if (
        !best ||
        short < best.short - EPS ||
        (Math.abs(short - best.short) < EPS && long < best.long - EPS) ||
        (Math.abs(short - best.short) < EPS &&
          Math.abs(long - best.long) < EPS &&
          (fr.y < best.y - EPS ||
            (Math.abs(fr.y - best.y) < EPS && fr.x < best.x)))
      ) {
        best = {
          x: fr.x,
          y: fr.y,
          w: o.w,
          h: o.h,
          rot: o.rot,
          short,
          long,
        };
      }
    }
  }
  return best;
}

function packMaxRects(
  pieces: { id: string; designId: string; w: number; h: number; allowRotate: boolean }[],
  binW: number,
  occupied: Rect[]
): { placed: { id: string; designId: string; x: number; y: number; w: number; h: number; rot: 0 | 90 }[]; rejected: string[] } {
  let free: Rect[] = [{ x: 0, y: 0, w: binW, h: TALL }];
  const placed: {
    id: string;
    designId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rot: 0 | 90;
  }[] = [];
  const rejected: string[] = [];

  for (const occ of occupied) {
    const next: Rect[] = [];
    for (const fr of free) next.push(...splitByPlaced(fr, occ));
    free = prune(next);
  }

  for (const piece of pieces) {
    const fit = bestFit(free, piece.w, piece.h, piece.allowRotate);
    if (!fit) {
      rejected.push(piece.designId);
      continue;
    }
    const used: Rect = { x: fit.x, y: fit.y, w: fit.w, h: fit.h };
    placed.push({
      id: piece.id,
      designId: piece.designId,
      x: fit.x,
      y: fit.y,
      w: fit.w,
      h: fit.h,
      rot: fit.rot,
    });
    const next: Rect[] = [];
    for (const fr of free) next.push(...splitByPlaced(fr, used));
    free = prune(next);
  }

  return { placed, rejected };
}

type SortKey = "area" | "long" | "height";

function sortPieces<T extends { w: number; h: number; id: string }>(
  pieces: T[],
  key: SortKey
): T[] {
  return [...pieces].sort((a, b) => {
    const va =
      key === "area"
        ? a.w * a.h
        : key === "long"
          ? Math.max(a.w, a.h)
          : a.h;
    const vb =
      key === "area"
        ? b.w * b.h
        : key === "long"
          ? Math.max(b.w, b.h)
          : b.h;
    if (vb !== va) return vb - va;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function usedFromItems(items: PlacedItem[], edgeMm: number): number {
  if (items.length === 0) return 0;
  const maxY = Math.max(...items.map((p) => p.yMm + p.heightMm));
  return Number((maxY + edgeMm).toFixed(3));
}

/**
 * Pure strip packer. Same input → same layout. No Math.random, no DOM.
 * Origin of x/y is the top-left of the usable area, then offset by edge margin
 * for roll coordinates.
 */
export function nest(sources: NestSource[], config: RollConfig): Layout {
  const usable = usableWidthMm(config.widthMm, config.edgeMarginMm);
  const gap = config.itemGapMm;
  const edge = config.edgeMarginMm;
  const rejected: string[] = [];

  const lockedItems: PlacedItem[] = [];
  const unlocked: {
    id: string;
    designId: string;
    w: number;
    h: number;
    allowRotate: boolean;
  }[] = [];

  sources.forEach((src) => {
    if (!Number.isFinite(src.widthMm) || !Number.isFinite(src.heightMm) || src.widthMm <= 0 || src.heightMm <= 0) {
      rejected.push(src.designId);
      return;
    }
    const tooWide = src.widthMm > usable + EPS && src.heightMm > usable + EPS;
    if (tooWide) {
      rejected.push(src.designId);
      return;
    }
    const instances =
      src.instances && src.instances.length > 0
        ? src.instances
        : Array.from({ length: Math.max(1, Math.floor(src.qty)) }, (_, i) => ({
            id: `${src.designId}:${i}`,
            locked: src.locked,
            xMm: src.xMm,
            yMm: src.yMm,
            rotation: src.rotation,
            widthMm: src.widthMm,
            heightMm: src.heightMm,
            flipX: undefined as boolean | undefined,
          }));

    for (const inst of instances) {
      if (inst.locked) {
        const rotation = inst.rotation ?? 0;
        lockedItems.push({
          id: inst.id,
          designId: src.designId,
          widthMm: inst.widthMm && inst.widthMm > 0 ? inst.widthMm : src.widthMm,
          heightMm: inst.heightMm && inst.heightMm > 0 ? inst.heightMm : src.heightMm,
          xMm: inst.xMm ?? edge,
          yMm: inst.yMm ?? edge,
          rotation,
          locked: true,
          flipX: inst.flipX,
        });
        continue;
      }
      unlocked.push({
        id: inst.id,
        designId: src.designId,
        w: src.widthMm + gap,
        h: src.heightMm + gap,
        allowRotate: src.allowRotate !== false,
      });
    }
  });

  const occupied: Rect[] = lockedItems.map((p) => ({
    x: p.xMm - edge,
    y: p.yMm - edge,
    w: p.widthMm + gap,
    h: p.heightMm + gap,
  }));

  let bestItems: PlacedItem[] = [...lockedItems];
  let bestUsed = Number.POSITIVE_INFINITY;
  let bestRejected = [...rejected];

  for (const key of ["area", "long", "height"] as SortKey[]) {
    const packed = packMaxRects(sortPieces(unlocked, key), usable, occupied);
    const items: PlacedItem[] = [
      ...lockedItems,
      ...packed.placed.map((p) => ({
        id: p.id,
        designId: p.designId,
        widthMm: p.w - gap,
        heightMm: p.h - gap,
        xMm: p.x + edge,
        yMm: p.y + edge,
        rotation: p.rot,
        locked: false,
      })),
    ];
    const used = usedFromItems(items, edge);
    if (
      used < bestUsed - EPS ||
      (Math.abs(used - bestUsed) < EPS && items.length > bestItems.length)
    ) {
      bestUsed = used;
      bestItems = items;
      bestRejected = [...rejected, ...packed.rejected];
    }
  }

  const usedLengthMm = Number.isFinite(bestUsed) ? bestUsed : 0;
  return {
    items: bestItems,
    usedLengthMm,
    billedLengthMm: billedLengthMm(
      usedLengthMm,
      config.lengthIncrementMm,
      config.minOrderMm
    ),
    rejected: [...new Set(bestRejected)],
  };
}

export function nestDesigns(
  sources: NestSource[],
  rollWidthMm: number,
  gapMm: number,
  edgeMm: number
): NestResult {
  const layout = nest(sources, {
    widthMm: rollWidthMm,
    edgeMarginMm: edgeMm,
    itemGapMm: gapMm,
    lengthIncrementMm: 100,
    minOrderMm: 0,
    outputDpi: 300,
  });
  return {
    placed: layout.items,
    lengthMm: layout.usedLengthMm,
    overflow: layout.rejected,
  };
}

export function lengthFromPlaced(placed: PlacedPiece[], edgeMm: number): number {
  return usedFromItems(placed, edgeMm);
}
