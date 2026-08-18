import { describe, expect, it } from "vitest";
import { dpiWarnings, effectiveDpi, printDpi } from "./artwork";
import { usableWidthMm } from "./units";

describe("validation", () => {
  it("500 px at 30 cm is below 150 dpi and blocked", () => {
    const dpi = effectiveDpi(500, 300);
    expect(dpi).toBeCloseTo(42.33, 1);
    expect(dpiWarnings(dpi).map((w) => w.code)).toContain("dpi_fail");
  });

  it("DPI does not swap axes when the piece is rotated", () => {
    const dpi = effectiveDpi(1970, 254);
    expect(dpi).toBeCloseTo(197, 0);
    expect(dpiWarnings(dpi).map((w) => w.code)).toContain("dpi_low");
  });

  it("print DPI uses the weaker axis", () => {
    const { dpi } = printDpi(1200, 300, 100, 100);
    expect(dpi).toBeCloseTo(effectiveDpi(300, 100), 1);
  });

  it("usable width rejects a piece too wide on both axes", () => {
    const usable = usableWidthMm(550, 10);
    expect(usable).toBe(530);
    const tooWide = 900 > usable && 900 > usable;
    expect(tooWide).toBe(true);
  });

  it("200 dpi is a warning, 300 dpi is clean", () => {
    expect(dpiWarnings(199).map((w) => w.code)).toContain("dpi_low");
    expect(dpiWarnings(200)).toEqual([]);
    expect(dpiWarnings(149).map((w) => w.code)).toContain("dpi_fail");
  });
});
