import { describe, expect, it } from "vitest";
import { copiesAcross, suggestAcross } from "./fit-across";

// A 550mm roll with a 10mm edge each side leaves 530mm of usable film.
const usableMm = 530;
const gapMm = 3;

describe("copiesAcross", () => {
  it("counts what stands side by side, gaps included", () => {
    // 200 + 3 = 203; 533 / 203 = 2.6 → two across.
    expect(copiesAcross(200, usableMm, gapMm)).toBe(2);
    expect(copiesAcross(100, usableMm, gapMm)).toBe(5);
  });

  it("is zero for a piece wider than the film", () => {
    expect(copiesAcross(600, usableMm, gapMm)).toBe(0);
    expect(copiesAcross(0, usableMm, gapMm)).toBe(0);
  });
});

describe("suggestAcross", () => {
  it("offers the trade when a few millimetres buy another copy", () => {
    // 180mm fits twice (183 * 2 = 366, 533 / 183 = 2.9). Three across needs
    // 533 / 3 - 3 = 174.6mm — under 3% smaller.
    const offer = suggestAcross({ widthMm: 180, heightMm: 90, usableMm, gapMm });
    expect(offer).not.toBeNull();
    expect(offer?.fromAcross).toBe(2);
    expect(offer?.toAcross).toBe(3);
    expect(offer?.widthMm).toBeLessThan(180);
    expect(copiesAcross(offer!.widthMm, usableMm, gapMm)).toBe(3);
    expect(offer?.shrinkPct).toBeLessThan(12);
  });

  it("keeps the aspect ratio", () => {
    const offer = suggestAcross({ widthMm: 180, heightMm: 90, usableMm, gapMm });
    expect(offer!.heightMm / offer!.widthMm).toBeCloseTo(0.5, 2);
  });

  it("stays quiet when the sacrifice is too big", () => {
    // 260mm fits twice with room to spare; three across would mean 174.6mm,
    // a third of the artwork gone. Not an offer worth making.
    expect(suggestAcross({ widthMm: 260, heightMm: 130, usableMm, gapMm })).toBeNull();
  });

  it("stays quiet for a piece that does not fit at all", () => {
    expect(suggestAcross({ widthMm: 600, heightMm: 300, usableMm, gapMm })).toBeNull();
  });

  it("stays quiet when the row is already exact", () => {
    // Five across at 103.6mm; a sixth would mean 85.8mm — 17% gone, too much.
    const exact = (usableMm + gapMm) / 5 - gapMm;
    expect(suggestAcross({ widthMm: exact, heightMm: exact, usableMm, gapMm })).toBeNull();
  });
});
