/**
 * A piece that is a few millimetres too wide leaves a stripe of film unused
 * down both sides of the roll — paid for, printed on, thrown away. This works
 * out how much smaller it would have to be for one more copy to stand beside
 * it, and only says so when the sacrifice is small.
 */

export type AcrossSuggestion = {
  /** The width to take, in millimetres, and the height that keeps the aspect. */
  widthMm: number;
  heightMm: number;
  /** Copies across the roll now, and after. */
  fromAcross: number;
  toAcross: number;
  /** How much smaller the artwork gets, and how much more film fills up. */
  shrinkPct: number;
  gainPct: number;
};

export function copiesAcross(widthMm: number, usableMm: number, gapMm: number): number {
  if (!(widthMm > 0) || !(usableMm > 0)) return 0;
  return Math.max(0, Math.floor((usableMm + gapMm) / (widthMm + gapMm)));
}

export function suggestAcross(input: {
  widthMm: number;
  heightMm: number;
  usableMm: number;
  gapMm: number;
  /** Never propose losing more than this share of the size. */
  maxShrinkPct?: number;
  /** Below this the offer is noise: the customer gains nothing worth a tap. */
  minShrinkPct?: number;
}): AcrossSuggestion | null {
  const { widthMm, heightMm, usableMm, gapMm } = input;
  const maxShrink = input.maxShrinkPct ?? 12;
  const minShrink = input.minShrinkPct ?? 0.5;
  if (!(widthMm > 0) || !(heightMm > 0) || !(usableMm > 0)) return null;

  const fromAcross = copiesAcross(widthMm, usableMm, gapMm);
  // Nothing to offer when it does not fit at all, or when the row is already
  // packed tight enough that one more copy would mean halving the artwork.
  if (fromAcross < 1) return null;

  const toAcross = fromAcross + 1;
  const target = (usableMm + gapMm) / toAcross - gapMm;
  if (!(target > 0) || target >= widthMm) return null;

  const shrinkPct = (1 - target / widthMm) * 100;
  if (shrinkPct < minShrink || shrinkPct > maxShrink) return null;

  const nextWidth = Math.floor(target * 10) / 10;
  if (copiesAcross(nextWidth, usableMm, gapMm) < toAcross) return null;

  return {
    widthMm: nextWidth,
    heightMm: Number(((heightMm / widthMm) * nextWidth).toFixed(1)),
    fromAcross,
    toAcross,
    shrinkPct: Number(shrinkPct.toFixed(1)),
    gainPct: Number((((toAcross - fromAcross) / fromAcross) * 100).toFixed(0)),
  };
}
