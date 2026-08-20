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
