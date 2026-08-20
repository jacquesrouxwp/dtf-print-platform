import type { SiteConfig } from "./site-config";

export type RollConfig = {
  widthMm: number;
  edgeMarginMm: number;
  itemGapMm: number;
  lengthIncrementMm: number;
  minOrderMm: number;
  outputDpi: number;
};

/** Widest and tightest gap a customer may ask for, whatever the shop default is. */
export const GAP_MIN_MM = 1;
export const GAP_MAX_MM = 20;

/**
 * The gap between pieces is the customer's to tune — tighter packing is less
 * film — but it is also an input to the price, so every path that quotes has to
 * agree on it. Clamping lives here so the server can accept a number from a
 * browser without trusting it.
 */
export function clampGapMm(mm: unknown, fallback: number): number {
  const n = Number(mm);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(GAP_MAX_MM, Math.max(GAP_MIN_MM, Math.round(n * 10) / 10));
}

export function rollFromSite(config: SiteConfig, overrides?: { gapMm?: number }): RollConfig {
  return {
    widthMm: config.rollWidthMm,
    edgeMarginMm: config.edgeMm,
    itemGapMm:
      overrides?.gapMm === undefined
        ? config.gapMm
        : clampGapMm(overrides.gapMm, config.gapMm),
    lengthIncrementMm: config.lengthIncrementMm,
    minOrderMm: config.minOrderMm,
    outputDpi: config.outputDpi,
  };
}
