import { describe, expect, it } from "vitest";
import { remainingToCutoff } from "./cutoff";
import { layoutAlerts } from "./layout-alerts";
import { defaultConfig, sanitizeConfig } from "./site-config";
import { billedLengthMm, clampPieceSize, mmToPx, roundUp } from "./units";

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

  it("keeps aspect when a copy is clamped to the usable film width", () => {
    expect(clampPieceSize(800, 400, 530)).toEqual({ widthMm: 530, heightMm: 265 });
  });

  it("does not shrink a copy below 10 mm on either axis", () => {
    expect(clampPieceSize(4, 8, 530)).toEqual({ widthMm: 10, heightMm: 20 });
  });
});

describe("stale config", () => {
  it("detects overlapping placed items", () => {
    const hit = layoutAlerts(
      [
        { id: "a", designId: "a", widthMm: 50, heightMm: 50, xMm: 10, yMm: 10, rotation: 0, locked: false },
        { id: "b", designId: "b", widthMm: 50, heightMm: 50, xMm: 40, yMm: 20, rotation: 0, locked: false },
      ],
      550,
      10
    );
    expect(hit.overlap).toBe(true);
  });

  it("empty timezone falls back to Amsterdam and does not throw", () => {
    const config = sanitizeConfig({ timezone: "", rollWidthMm: 600 });
    expect(config.timezone).toBe("Europe/Amsterdam");
    expect(config.rollWidthMm).toBe(600);
    expect(() => remainingToCutoff({ ...defaultConfig, timezone: "" })).not.toThrow();
  });
});
