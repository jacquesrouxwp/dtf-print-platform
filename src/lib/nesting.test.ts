import { describe, expect, it } from "vitest";
import { nest } from "./nesting";
import { defaultConfig } from "./site-config";
import { rollFromSite } from "./roll";

const roll = rollFromSite(defaultConfig);

function noOverlap(items: { xMm: number; yMm: number; widthMm: number; heightMm: number }[]) {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const gap = roll.itemGapMm;
      const hit = !(
        a.xMm + a.widthMm + gap <= b.xMm + 1e-6 ||
        b.xMm + b.widthMm + gap <= a.xMm + 1e-6 ||
        a.yMm + a.heightMm + gap <= b.yMm + 1e-6 ||
        b.yMm + b.heightMm + gap <= a.yMm + 1e-6
      );
      if (hit) return false;
    }
  }
  return true;
}

describe("nesting", () => {
  const mixed = [
    { designId: "a", widthMm: 100, heightMm: 100, qty: 10 },
    { designId: "b", widthMm: 250, heightMm: 300, qty: 5 },
    { designId: "c", widthMm: 50, heightMm: 50, qty: 20 },
  ];

  it("packs the known set under a recorded length ceiling", () => {
    const layout = nest(mixed, roll);
    expect(layout.rejected).toEqual([]);
    expect(layout.items).toHaveLength(35);
    expect(layout.usedLengthMm).toBeLessThan(1900);
  });

  it("is deterministic", () => {
    const a = nest(mixed, roll);
    const b = nest(mixed, roll);
    expect(JSON.stringify(a.items)).toBe(JSON.stringify(b.items));
    expect(a.usedLengthMm).toBe(b.usedLengthMm);
  });

  it("nests 200 items in under 300 ms", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({
      designId: `n${i}`,
      widthMm: 40 + (i % 7) * 10,
      heightMm: 40 + (i % 5) * 12,
      qty: 1,
    }));
    const t0 = performance.now();
    const layout = nest(items, roll);
    const ms = performance.now() - t0;
    expect(layout.items.length).toBe(200);
    expect(ms).toBeLessThan(300);
  });

  it("never overlaps, respects edge margin and gap", () => {
    const layout = nest(mixed, roll);
    expect(noOverlap(layout.items)).toBe(true);
    for (const item of layout.items) {
      expect(item.xMm).toBeGreaterThanOrEqual(roll.edgeMarginMm - 1e-6);
      expect(item.xMm + item.widthMm).toBeLessThanOrEqual(
        roll.widthMm - roll.edgeMarginMm + 1e-6
      );
    }
  });

  it("rejects an item wider than the usable width", () => {
    const layout = nest(
      [{ designId: "wide", widthMm: 900, heightMm: 900, qty: 1 }],
      roll
    );
    expect(layout.rejected).toContain("wide");
    expect(layout.items).toHaveLength(0);
  });
});
