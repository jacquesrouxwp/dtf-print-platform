import { describe, expect, it } from "vitest";
import { nest, nestBlocks } from "./nesting";

const roll = {
  widthMm: 550,
  edgeMarginMm: 10,
  itemGapMm: 3,
  lengthIncrementMm: 100,
  minOrderMm: 0,
  outputDpi: 300,
};

const piece = (designId: string, qty: number) => ({ designId, widthMm: 100, heightMm: 100, qty });

describe("nest: quantity is a count", () => {
  it("places nothing for a quantity of zero", () => {
    expect(nest([piece("a", 0)], roll).items).toHaveLength(0);
  });

  it("places nothing for a negative or unreadable quantity", () => {
    expect(nest([piece("a", -3)], roll).items).toHaveLength(0);
    expect(nest([piece("a", Number.NaN)], roll).items).toHaveLength(0);
  });

  it("rounds a fractional quantity down, never up", () => {
    expect(nest([piece("a", 2.9)], roll).items).toHaveLength(2);
  });

  it("does not count a zeroed design as rejected — it was not asked for", () => {
    expect(nest([piece("a", 0)], roll).rejected).toEqual([]);
  });

  it("prices both layouts the same when one design is zeroed", () => {
    const mixed = nest([piece("a", 0), piece("b", 4)], roll);
    const blocks = nestBlocks([piece("a", 0), piece("b", 4)], roll);
    expect(mixed.items.every((p) => p.designId === "b")).toBe(true);
    expect(blocks.items.every((p) => p.designId === "b")).toBe(true);
    expect(mixed.items).toHaveLength(blocks.items.length);
  });

  it("still honours explicit instances whatever the quantity field says", () => {
    const layout = nest(
      [
        {
          ...piece("a", 0),
          instances: [
            { id: "a:0", locked: true, xMm: 10, yMm: 10, rotation: 0 as const, widthMm: 100, heightMm: 100 },
          ],
        },
      ],
      roll
    );
    expect(layout.items).toHaveLength(1);
  });
});
