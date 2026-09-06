import { describe, expect, it } from "vitest";
import { BLOCK_CUT_GAP_MM, blockCuts, nest, nestBlocks } from "./nesting";

const roll = {
  widthMm: 550,
  edgeMarginMm: 10,
  itemGapMm: 3,
  lengthIncrementMm: 100,
  minOrderMm: 0,
  outputDpi: 300,
};

const a = { designId: "a", widthMm: 100, heightMm: 100, qty: 4 };
const b = { designId: "b", widthMm: 100, heightMm: 100, qty: 4 };

describe("nestBlocks", () => {
  it("keeps every copy of a design above every copy of the next one", () => {
    const layout = nestBlocks([a, b], roll);
    const lastA = Math.max(
      ...layout.items.filter((p) => p.designId === "a").map((p) => p.yMm + p.heightMm)
    );
    const firstB = Math.min(
      ...layout.items.filter((p) => p.designId === "b").map((p) => p.yMm)
    );
    expect(layout.items).toHaveLength(8);
    expect(firstB).toBeGreaterThanOrEqual(lastA + BLOCK_CUT_GAP_MM - 0.001);
  });

  it("costs film compared with mixing the two designs", () => {
    const mixed = nest([a, b], roll);
    const blocks = nestBlocks([a, b], roll);
    expect(blocks.usedLengthMm).toBeGreaterThanOrEqual(mixed.usedLengthMm);
  });

  it("skips a design with no copies without shifting the rest", () => {
    const layout = nestBlocks([{ ...a, qty: 0 }, b], roll);
    expect(layout.items.every((p) => p.designId === "b")).toBe(true);
    expect(Math.min(...layout.items.map((p) => p.yMm))).toBe(roll.edgeMarginMm);
  });
});

describe("blockCuts", () => {
  it("reports where each block ends, in film order", () => {
    const layout = nestBlocks([a, b], roll);
    const cuts = blockCuts(layout.items, ["a", "b"]);
    expect(cuts.map((c) => c.designId)).toEqual(["a", "b"]);
    expect(cuts[0].endMm).toBeLessThan(cuts[1].endMm);
  });

  it("ignores a design that never made it onto the film", () => {
    const layout = nestBlocks([a], roll);
    expect(blockCuts(layout.items, ["a", "b"]).map((c) => c.designId)).toEqual(["a"]);
  });
});
