import type { PlacedPiece } from "./nesting";

export function layoutAlerts(
  placed: PlacedPiece[],
  rollWidthMm: number,
  edgeMm: number
): { overlap: boolean; overflow: boolean } {
  let overlap = false;
  let overflow = false;
  const usable = rollWidthMm - edgeMm;
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    if (a.xMm < edgeMm - 0.5 || a.xMm + a.widthMm > usable + 0.5 || a.yMm < 0) {
      overflow = true;
    }
    for (let j = i + 1; j < placed.length; j++) {
      const b = placed[j];
      const hit =
        a.xMm < b.xMm + b.widthMm &&
        a.xMm + a.widthMm > b.xMm &&
        a.yMm < b.yMm + b.heightMm &&
        a.yMm + a.heightMm > b.yMm;
      if (hit) overlap = true;
    }
  }
  return { overlap, overflow };
}
