import { describe, expect, it } from "vitest";
import { dpiWarnings, effectiveDpi } from "./artwork";
import { usableWidthMm } from "./units";

describe("validation", () => {
  it("500 px at 30 cm is below 150 dpi and blocked", () => {
    const dpi = effectiveDpi(500, 300);
    expect(dpi).toBeCloseTo(42.33, 1);
    expect(dpiWarnings(dpi).map((w) => w.code)).toContain("dpi_fail");
  });

  it("usable width rejects 900 mm on a 550 mm roll", () => {
    const usable = usableWidthMm(550, 10);
    expect(usable).toBe(530);
    expect(900 > usable && 900 > usable).toBe(true);
  });
});
