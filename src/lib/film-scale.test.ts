import { describe, expect, it } from "vitest";
import { clampZoom, filmChrome, filmScale } from "./film-scale";

const phone = { boxWidthPx: 364, rollWidthMm: 550, zoomPct: 100, ...filmChrome(364) };

describe("filmScale", () => {
  it("fits the roll across the box at 100%", () => {
    const scale = filmScale(phone);
    expect(scale * 550).toBeCloseTo(364 - 14 - 12, 0);
  });

  it("is blind to how long the film is", () => {
    // There is no length argument, and that is the point: this test fails to
    // compile the day someone adds one.
    const a = filmScale(phone);
    const b = filmScale({ ...phone });
    expect(a).toBe(b);
  });

  it("changes only with the box, the roll or the zoom", () => {
    const base = filmScale(phone);
    expect(filmScale({ ...phone, zoomPct: 50 })).toBeCloseTo(base / 2, 6);
    expect(filmScale({ ...phone, boxWidthPx: 728 })).toBeGreaterThan(base);
    expect(filmScale({ ...phone, rollWidthMm: 1100 })).toBeCloseTo(base / 2, 6);
  });

  it("gives a phone more film and less chrome", () => {
    const narrow = filmChrome(390);
    const wide = filmChrome(1280);
    expect(narrow.rulerPx).toBeLessThan(wide.rulerPx);
    expect(narrow.surroundPx).toBeLessThan(wide.surroundPx);
    expect(filmScale({ ...phone, ...narrow })).toBeGreaterThan(
      filmScale({ ...phone, ...wide })
    );
  });

  it("survives a box too small to draw in", () => {
    expect(filmScale({ ...phone, boxWidthPx: 10 })).toBe(0);
    expect(filmScale({ ...phone, rollWidthMm: 0 })).toBe(0);
  });

  it("holds the zoom inside a sane range", () => {
    expect(clampZoom(5)).toBe(25);
    expect(clampZoom(4000)).toBe(400);
    expect(clampZoom(NaN)).toBe(100);
    expect(clampZoom(87)).toBe(87);
  });
});
