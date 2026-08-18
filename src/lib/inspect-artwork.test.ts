import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { inspectArtwork } from "./inspect-artwork";

describe("trim box", () => {
  it("nests the opaque logo, not the empty canvas", async () => {
    const canvas = sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });
    const mark = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 4,
        background: { r: 20, g: 20, b: 20, alpha: 255 },
      },
    })
      .png()
      .toBuffer();
    const composed = await canvas
      .composite([{ input: mark, left: 160, top: 160 }])
      .png()
      .toBuffer();
    const inspect = await inspectArtwork(composed);
    expect(inspect.trimBox.w).toBeLessThanOrEqual(82);
    expect(inspect.trimBox.h).toBeLessThanOrEqual(82);
    expect(inspect.trimBox.x).toBeGreaterThanOrEqual(158);
    expect(inspect.hasAlpha).toBe(true);
  });
});
