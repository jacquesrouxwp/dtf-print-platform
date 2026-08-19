export const MM_PER_INCH = 25.4;
export const DEFAULT_OUTPUT_DPI = 300;

/** Production pixels from millimetres. Spec: Math.round. 100 mm @ 300 dpi → 1181. */
export function mmToPx(mm: number, dpi = DEFAULT_OUTPUT_DPI): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

export function pxToMm(px: number, dpi = DEFAULT_OUTPUT_DPI): number {
  return (px / dpi) * MM_PER_INCH;
}

export function effectiveDpi(naturalPx: number, printMm: number): number {
  if (printMm <= 0) return 0;
  return naturalPx / (printMm / MM_PER_INCH);
}

/** Round value UP to the next increment. 2347 with 100 → 2400. */
export function roundUp(value: number, increment: number): number {
  if (increment <= 0) return value;
  return Math.ceil(value / increment - 1e-9) * increment;
}

export function billedLengthMm(
  usedLengthMm: number,
  incrementMm: number,
  minOrderMm: number
): number {
  if (usedLengthMm <= 0) return 0;
  const rounded = roundUp(usedLengthMm, incrementMm);
  return Math.max(minOrderMm, rounded);
}

export function usableWidthMm(widthMm: number, edgeMarginMm: number): number {
  return widthMm - 2 * edgeMarginMm;
}

/** Smallest print size the builder will accept for one copy. */
export const MIN_PIECE_MM = 10;

/**
 * Clamp one copy to a printable box: not below MIN_PIECE_MM, not wider than
 * the usable film. Aspect is kept so a mouse-resize or a single-axis field
 * cannot squash the artwork.
 */
export function clampPieceSize(
  widthMm: number,
  heightMm: number,
  maxWidthMm: number,
  minMm = MIN_PIECE_MM
): { widthMm: number; heightMm: number } {
  let w = Number(widthMm);
  let h = Number(heightMm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { widthMm: minMm, heightMm: minMm };
  }
  const ratio = w / h;
  if (w < minMm) {
    w = minMm;
    h = w / ratio;
  }
  if (h < minMm) {
    h = minMm;
    w = h * ratio;
  }
  const maxW = Math.max(minMm, maxWidthMm);
  if (w > maxW) {
    w = maxW;
    h = w / ratio;
  }
  return {
    widthMm: Number(w.toFixed(1)),
    heightMm: Number(h.toFixed(1)),
  };
}
