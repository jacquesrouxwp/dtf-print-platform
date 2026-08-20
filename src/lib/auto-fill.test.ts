import { describe, expect, it } from "vitest";
import { autoFill } from "./auto-fill";
import { nest, type NestSource } from "./nesting";
import type { RollConfig } from "./roll";

const roll: RollConfig = {
  widthMm: 550,
  edgeMarginMm: 10,
  itemGapMm: 4,
  lengthIncrementMm: 100,
  minOrderMm: 500,
  outputDpi: 300,
};

function source(designId: string, widthMm: number, heightMm: number, qty: number): NestSource {
  return { designId, widthMm, heightMm, qty, allowRotate: true };
}

describe("autoFill", () => {
  it("fills the minimum order with copies the customer already paid for", () => {
    const sources = [source("a", 100, 100, 1)];
    const before = nest(sources, roll);
    expect(before.billedLengthMm).toBe(500);

    const result = autoFill(sources, "a", roll);
    expect(result.extraCopies).toBeGreaterThan(0);
    expect(result.billedLengthMm).toBe(500);

    // The promise is the whole point: the price must not move.
    const after = nest([source("a", 100, 100, 1 + result.extraCopies)], roll);
    expect(after.billedLengthMm).toBe(500);
  });

  it("stops before the next billed increment", () => {
    const sources = [source("a", 100, 100, 1)];
    const { extraCopies } = autoFill(sources, "a", roll);
    const oneTooMany = nest([source("a", 100, 100, 1 + extraCopies + 1)], roll);
    expect(oneTooMany.billedLengthMm).toBeGreaterThan(500);
  });

  it("leaves other designs untouched", () => {
    const sources = [source("a", 100, 100, 1), source("b", 200, 150, 2)];
    const { extraCopies } = autoFill(sources, "a", roll);
    const after = nest(
      [source("a", 100, 100, 1 + extraCopies), source("b", 200, 150, 2)],
      roll
    );
    expect(after.items.filter((i) => i.designId === "b")).toHaveLength(2);
  });

  it("reports no room when the film is already full", () => {
    // One piece just under the usable width, tall enough to consume the minimum.
    const sources = [source("wide", 520, 480, 1)];
    const result = autoFill(sources, "wide", roll);
    expect(result.extraCopies).toBe(0);
  });

  it("returns nothing for a design that is not in the layout", () => {
    const result = autoFill([source("a", 100, 100, 1)], "ghost", roll);
    expect(result.extraCopies).toBe(0);
  });

  it("reports the unused film so the UI can offer the fill", () => {
    const result = autoFill([source("a", 100, 100, 1)], "a", roll);
    expect(result.freeLengthMm).toBeGreaterThanOrEqual(0);
    expect(result.freeLengthMm).toBeLessThan(roll.minOrderMm);
  });
});
