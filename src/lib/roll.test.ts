import { describe, expect, it } from "vitest";
import { clampGapMm, GAP_MAX_MM, GAP_MIN_MM, rollFromSite } from "./roll";
import { defaultConfig } from "./site-config";

describe("clampGapMm", () => {
  it("keeps a sensible gap", () => {
    expect(clampGapMm(2, 4)).toBe(2);
    expect(clampGapMm(2.5, 4)).toBe(2.5);
  });

  it("pulls an extreme back into range", () => {
    expect(clampGapMm(0, 4)).toBe(GAP_MIN_MM);
    expect(clampGapMm(-30, 4)).toBe(GAP_MIN_MM);
    expect(clampGapMm(500, 4)).toBe(GAP_MAX_MM);
  });

  it("falls back on nonsense rather than throwing", () => {
    expect(clampGapMm("wide", 4)).toBe(4);
    expect(clampGapMm(undefined, 4)).toBe(4);
    expect(clampGapMm(NaN, 4)).toBe(4);
  });

  it("rounds to a tenth of a millimetre", () => {
    expect(clampGapMm(3.14159, 4)).toBe(3.1);
  });
});

describe("rollFromSite", () => {
  it("uses the shop default when nothing is asked for", () => {
    expect(rollFromSite(defaultConfig).itemGapMm).toBe(defaultConfig.gapMm);
  });

  it("takes a customer's gap, clamped", () => {
    expect(rollFromSite(defaultConfig, { gapMm: 2 }).itemGapMm).toBe(2);
    expect(rollFromSite(defaultConfig, { gapMm: 999 }).itemGapMm).toBe(GAP_MAX_MM);
  });

  it("leaves everything else alone", () => {
    const roll = rollFromSite(defaultConfig, { gapMm: 2 });
    expect(roll.widthMm).toBe(defaultConfig.rollWidthMm);
    expect(roll.minOrderMm).toBe(defaultConfig.minOrderMm);
  });
});
