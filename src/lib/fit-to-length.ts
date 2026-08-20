import { nest, type NestSource } from "./nesting";
import type { RollConfig } from "./roll";
import { MIN_PIECE_MM } from "./units";

export type FitResult = {
  /** Uniform factor applied to every piece, 1 means nothing had to change. */
  scale: number;
  /** Film actually used once scaled. */
  usedLengthMm: number;
  /** Film that would have been used at full size. */
  originalLengthMm: number;
};

export type FitOptions = {
  /** Refuse to shrink further than this — artwork has a size the customer chose. */
  minScale?: number;
  /** Stop refining once the answer is this close. */
  tolerance?: number;
};

const DEFAULT_MIN_SCALE = 0.85;

function scaled(sources: NestSource[], scale: number): NestSource[] {
  return sources.map((s) => ({
    ...s,
    widthMm: Math.max(MIN_PIECE_MM, s.widthMm * scale),
    heightMm: Math.max(MIN_PIECE_MM, s.heightMm * scale),
    // Positions were chosen for the old size; let the packer place everything
    // again rather than shrink pieces around stale coordinates.
    instances: undefined,
  }));
}

function lengthAt(sources: NestSource[], roll: RollConfig, scale: number): number | null {
  const layout = nest(scaled(sources, scale), roll);
  if (layout.rejected.length) return null;
  return layout.usedLengthMm;
}

/**
 * A gang sheet that spills a few centimetres past a whole metre costs the
 * customer the next whole increment for almost nothing. This finds the largest
 * uniform scale that still fits the target, so the order lands on the metre
 * instead of just over it.
 *
 * Uniform, because scaling one design and not its neighbour changes the
 * proportions the customer set between them.
 */
export function fitToLength(
  sources: NestSource[],
  roll: RollConfig,
  targetLengthMm: number,
  opts?: FitOptions
): FitResult | null {
  if (!sources.length || targetLengthMm <= 0) return null;

  const minScale = Math.min(1, Math.max(0.1, opts?.minScale ?? DEFAULT_MIN_SCALE));
  const tolerance = Math.max(0.0005, opts?.tolerance ?? 0.002);

  const originalLengthMm = lengthAt(sources, roll, 1);
  if (originalLengthMm === null) return null;
  // Already inside the target: nothing to gain, and shrinking would only make
  // the transfer smaller than the customer asked for.
  if (originalLengthMm <= targetLengthMm) {
    return { scale: 1, usedLengthMm: originalLengthMm, originalLengthMm };
  }

  const shortest = lengthAt(sources, roll, minScale);
  if (shortest === null || shortest > targetLengthMm) return null;

  let low = minScale;
  let high = 1;
  let best = { scale: minScale, usedLengthMm: shortest };

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const used = lengthAt(sources, roll, mid);
    if (used !== null && used <= targetLengthMm) {
      best = { scale: mid, usedLengthMm: used };
      low = mid;
    } else {
      high = mid;
    }
  }

  return { ...best, originalLengthMm };
}

/**
 * The metre this layout is spilling over. 1.06 m wants 1 m; 0.4 m has no whole
 * metre to fall back to and is left alone.
 */
export function previousWholeMetreMm(usedLengthMm: number): number | null {
  const metres = Math.floor((usedLengthMm - 0.01) / 1000);
  return metres >= 1 ? metres * 1000 : null;
}
