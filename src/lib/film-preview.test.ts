import { describe, expect, it } from "vitest";
import { previewFileName, previewScale } from "./film-preview";

describe("previewScale", () => {
  it("draws a short film at the target width", () => {
    // 550mm wide, 1m long: 1000px / 550mm, nowhere near the pixel budget.
    expect(previewScale(550, 1000)).toBeCloseTo(1000 / 550, 6);
  });

  it("pulls back rather than asking for a gigapixel canvas", () => {
    const scale = previewScale(550, 20000);
    const pixels = 550 * scale * (20000 * scale);
    expect(scale).toBeLessThan(1000 / 550);
    expect(pixels).toBeLessThanOrEqual(24_000_000 + 1);
  });

  it("survives an empty film", () => {
    expect(previewScale(550, 0)).toBeGreaterThan(0);
    expect(Number.isFinite(previewScale(0, 0))).toBe(true);
  });
});

describe("previewFileName", () => {
  it("names the file after the length", () => {
    expect(previewFileName(2400)).toBe("dtf-film-2.4m-preview.jpg");
    expect(previewFileName(0)).toBe("dtf-film-0.0m-preview.jpg");
  });
});
