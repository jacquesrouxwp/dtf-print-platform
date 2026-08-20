import type { PlacedPiece } from "./nesting";

export type AlignEdge = "left" | "center" | "right" | "top";

export type Box = { xMm: number; yMm: number; widthMm: number; heightMm: number };

/**
 * Where a duplicate should land: one gap down and to the right, so the copy is
 * visibly its own piece rather than hiding under the original. It stays inside
 * the printable width, and never above the film's top edge.
 */
export function duplicateOffset(
  piece: Box,
  usableWidthMm: number,
  gapMm: number,
  edgeMm = 0
): { xMm: number; yMm: number } {
  const step = Math.max(2, gapMm);
  const maxX = Math.max(edgeMm, edgeMm + usableWidthMm - piece.widthMm);
  return {
    xMm: Math.min(maxX, piece.xMm + step),
    yMm: Math.max(edgeMm, piece.yMm + step),
  };
}

/**
 * Snap a piece to an edge of the printable area. `center` is horizontal —
 * there is no vertical centre on a roll that grows with the layout.
 */
export function alignedPosition(
  piece: Box,
  usableWidthMm: number,
  edgeMm: number,
  edge: AlignEdge
): { xMm: number; yMm: number } {
  const left = edgeMm;
  const right = edgeMm + usableWidthMm - piece.widthMm;
  switch (edge) {
    case "left":
      return { xMm: left, yMm: piece.yMm };
    case "right":
      return { xMm: Math.max(left, right), yMm: piece.yMm };
    case "center":
      return {
        xMm: Math.max(left, edgeMm + (usableWidthMm - piece.widthMm) / 2),
        yMm: piece.yMm,
      };
    case "top":
      return { xMm: piece.xMm, yMm: edgeMm };
  }
}

/** True when two placed pieces overlap — used to warn before printing. */
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.xMm < b.xMm + b.widthMm &&
    b.xMm < a.xMm + a.widthMm &&
    a.yMm < b.yMm + b.heightMm &&
    b.yMm < a.yMm + a.heightMm
  );
}

/** Ids of every piece that sits on top of another one. */
export function overlappingIds(pieces: PlacedPiece[]): string[] {
  const hit = new Set<string>();
  for (let i = 0; i < pieces.length; i += 1) {
    for (let j = i + 1; j < pieces.length; j += 1) {
      if (overlaps(pieces[i], pieces[j])) {
        hit.add(pieces[i].id);
        hit.add(pieces[j].id);
      }
    }
  }
  return [...hit];
}
