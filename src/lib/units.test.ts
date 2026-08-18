import { describe, expect, it } from "vitest";
import { billedLengthMm, mmToPx, roundUp } from "./units";

describe("geometry", () => {
  it("100 mm at 300 dpi is 1181 px", () => {
    expect(mmToPx(100, 300)).toBe(1181);
  });

  it("x=12 mm lands at 142 px from the left", () => {
    expect(mmToPx(12, 300)).toBe(142);
  });

  it("550 mm roll width is exact output pixels", () => {
    expect(mmToPx(550, 300)).toBe(6496);
  });

  it("2347 mm used with 100 mm increment bills 2400", () => {
    expect(roundUp(2347, 100)).toBe(2400);
    expect(billedLengthMm(2347, 100, 500)).toBe(2400);
  });

  it("below minOrder bills at minOrder", () => {
    expect(billedLengthMm(120, 100, 500)).toBe(500);
  });

  it("empty film bills zero, not the minimum", () => {
    expect(billedLengthMm(0, 100, 500)).toBe(0);
  });
});
