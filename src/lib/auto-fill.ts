import { nest, type NestSource } from "./nesting";
import type { RollConfig } from "./roll";

export type AutoFillResult = {
  /** Extra copies that fit without pushing the order onto more billed film. */
  extraCopies: number;
  /** Billed length before and after — equal by construction when extraCopies > 0. */
  billedLengthMm: number;
  /** Film the customer has already paid for and is not using, in mm of length. */
  freeLengthMm: number;
};

/**
 * The customer pays for whole increments of film, and the last increment is
 * almost never full. Auto-fill answers one question: how many more copies of
 * this design fit in the space already paid for?
 *
 * The packer is deterministic, so growing the quantity one step at a time is
 * exact — no search heuristics, no guessing.
 */
export function autoFill(
  sources: NestSource[],
  designId: string,
  config: RollConfig,
  limits?: { maxCopies?: number }
): AutoFillResult {
  const maxCopies = limits?.maxCopies ?? 200;
  const base = nest(sources, config);
  const target = base.billedLengthMm;

  if (!sources.some((s) => s.designId === designId)) {
    return { extraCopies: 0, billedLengthMm: target, freeLengthMm: 0 };
  }

  let extra = 0;
  let lastUsed = base.usedLengthMm;

  for (let step = 1; step <= maxCopies; step += 1) {
    const probe = sources.map((s) =>
      s.designId === designId ? { ...s, qty: s.qty + step } : s
    );
    const layout = nest(probe, config);
    // A copy that cannot be placed at all is a dead end, not a reason to keep trying.
    if (layout.rejected.includes(designId)) break;
    if (layout.billedLengthMm > target) break;
    extra = step;
    lastUsed = layout.usedLengthMm;
  }

  return {
    extraCopies: extra,
    billedLengthMm: target,
    freeLengthMm: Math.max(0, Math.round(target - lastUsed)),
  };
}

/**
 * The other half of the question: not "what fits in what I already bought" but
 * "fill this much film with this design". One design, one size, as many copies
 * as the roll will take over `targetLengthMm`.
 *
 * Doubling first and then bisecting keeps the number of packer runs small even
 * when a small sticker fits four hundred times.
 */
export function copiesForLength(
  source: Omit<NestSource, "qty">,
  config: RollConfig,
  targetLengthMm: number,
  limits?: { maxCopies?: number }
): number {
  const maxCopies = limits?.maxCopies ?? 1000;
  if (targetLengthMm <= 0) return 0;

  const fits = (qty: number) => {
    if (qty < 1) return true;
    const layout = nest([{ ...source, qty }], config);
    if (layout.rejected.length) return false;
    return layout.usedLengthMm <= targetLengthMm;
  };

  if (!fits(1)) return 0;

  // Grow until it no longer fits, so the answer is bracketed.
  let low = 1;
  let high = 2;
  while (high <= maxCopies && fits(high)) {
    low = high;
    high *= 2;
  }
  if (high > maxCopies && fits(maxCopies)) return maxCopies;

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return low;
}
