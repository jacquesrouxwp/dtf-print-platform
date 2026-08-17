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
};

export type PlacedPiece = {
  id: string;
  designId: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation: 0 | 90;
  locked: boolean;
};

export type NestResult = {
  placed: PlacedPiece[];
  lengthMm: number;
  overflow: string[];
};

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function overlaps(a: Box, b: Box, gap: number): boolean {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values.map((v) => Number(v.toFixed(3))))].sort((a, b) => a - b);
}

function findSlot(
  w: number,
  h: number,
  occupied: Box[],
  rollWidthMm: number,
  edgeMm: number,
  gapMm: number
): { x: number; y: number } | null {
  const maxX = rollWidthMm - edgeMm - w;
  if (maxX < edgeMm - 0.01) return null;

  const xs = uniqueSorted([
    edgeMm,
    ...occupied.flatMap((o) => [o.x, o.x + o.w + gapMm]),
  ]).filter((x) => x <= maxX + 0.01);

  const ys = uniqueSorted([
    edgeMm,
    ...occupied.flatMap((o) => [o.y, o.y + o.h + gapMm]),
  ]);

  let best: { x: number; y: number } | null = null;
  for (const y of ys) {
    for (const x of xs) {
      if (x > maxX + 0.01) continue;
      const cand: Box = { x, y, w, h };
      const hit = occupied.some((o) => overlaps(cand, o, gapMm));
      if (hit) continue;
      if (
        !best ||
        y < best.y - 0.01 ||
        (Math.abs(y - best.y) < 0.01 && x < best.x)
      ) {
        best = { x, y };
      }
    }
  }
  return best;
}

function usedLength(placed: PlacedPiece[], edgeMm: number): number {
  if (placed.length === 0) return 0;
  const maxY = Math.max(...placed.map((p) => p.yMm + p.heightMm));
  return Number((maxY + edgeMm).toFixed(3));
}

export function nestDesigns(
  sources: NestSource[],
  rollWidthMm: number,
  gapMm: number,
  edgeMm: number
): NestResult {
  const placed: PlacedPiece[] = [];
  const overflow: string[] = [];
  const usable = rollWidthMm - 2 * edgeMm;

  sources.forEach((src, srcIndex) => {
    if (!src.locked) return;
    const rotation = src.rotation ?? 0;
    const widthMm = rotation === 90 ? src.heightMm : src.widthMm;
    const heightMm = rotation === 90 ? src.widthMm : src.heightMm;
    for (let i = 0; i < src.qty; i++) {
      placed.push({
        id: `${src.designId}-lock-${srcIndex}-${i}`,
        designId: src.designId,
        xMm: src.xMm ?? edgeMm,
        yMm: src.yMm ?? edgeMm,
        widthMm,
        heightMm,
        rotation,
        locked: true,
      });
    }
  });

  const unlocked = sources
    .filter((s) => !s.locked)
    .flatMap((src) =>
      Array.from({ length: Math.max(1, src.qty) }, (_, i) => ({ src, i }))
    )
    .sort((a, b) => {
      const aa = Math.max(a.src.widthMm, a.src.heightMm);
      const bb = Math.max(b.src.widthMm, b.src.heightMm);
      return bb - aa;
    });

  unlocked.forEach(({ src, i }) => {
    const allowRotate = src.allowRotate !== false;
    const orients: { w: number; h: number; rot: 0 | 90 }[] = [
      { w: src.widthMm, h: src.heightMm, rot: 0 },
    ];
    if (allowRotate && src.widthMm !== src.heightMm) {
      orients.push({ w: src.heightMm, h: src.widthMm, rot: 90 });
    }

    const viable = orients.filter((o) => o.w <= usable + 0.01);
    if (viable.length === 0) {
      overflow.push(src.designId);
      placed.push({
        id: `${src.designId}-${i}`,
        designId: src.designId,
        xMm: edgeMm,
        yMm: usedLength(placed, edgeMm) || edgeMm,
        widthMm: usable,
        heightMm: src.heightMm * (usable / src.widthMm),
        rotation: 0,
        locked: false,
      });
      return;
    }

    const occupied: Box[] = placed.map((p) => ({
      x: p.xMm,
      y: p.yMm,
      w: p.widthMm,
      h: p.heightMm,
    }));

    let chosen: { x: number; y: number; w: number; h: number; rot: 0 | 90 } | null =
      null;
    for (const o of viable) {
      const slot = findSlot(o.w, o.h, occupied, rollWidthMm, edgeMm, gapMm);
      if (!slot) continue;
      if (
        !chosen ||
        slot.y < chosen.y - 0.01 ||
        (Math.abs(slot.y - chosen.y) < 0.01 && slot.x < chosen.x)
      ) {
        chosen = { ...slot, w: o.w, h: o.h, rot: o.rot };
      }
    }

    if (!chosen) {
      const o = viable[0];
      chosen = {
        x: edgeMm,
        y: (usedLength(placed, 0) || edgeMm) + (placed.length ? gapMm : 0),
        w: o.w,
        h: o.h,
        rot: o.rot,
      };
    }

    placed.push({
      id: `${src.designId}-${i}`,
      designId: src.designId,
      xMm: chosen.x,
      yMm: chosen.y,
      widthMm: chosen.w,
      heightMm: chosen.h,
      rotation: chosen.rot,
      locked: false,
    });
  });

  return {
    placed,
    lengthMm: usedLength(placed, edgeMm),
    overflow: [...new Set(overflow)],
  };
}

export function lengthFromPlaced(placed: PlacedPiece[], edgeMm: number): number {
  return usedLength(placed, edgeMm);
}
