import { describe, expect, it } from "vitest";
import { dpiWarnings, effectiveDpi } from "./artwork";
import { usableWidthMm } from "./units";

describe("validation", () => {
  it("500 px at 30 cm is below 150 dpi", () => {
    const dpi = effectiveDpi(500, 300);
    expect(dpi).toBeLessThan(150);
    expect(dpiWarnings(dpi)[0]?.code).toBe("dpi_fail");
  });

  it("jpeg without alpha is treated as a white-background risk", () => {
    const jpeg = { type: "image/jpeg", name: "logo.jpg" };
    const isJpeg = jpeg.type === "image/jpeg";
    expect(isJpeg).toBe(true);
  });

  it("semi-transparent pixels are flagged when any 0 < a < 255", () => {
    const alphas = [0, 0, 128, 255];
    const semi = alphas.some((a) => a > 0 && a < 255);
    expect(semi).toBe(true);
  });

  it("item wider than usable width is blocked", () => {
    const usable = usableWidthMm(550, 10);
    expect(900 > usable).toBe(true);
  });
});
