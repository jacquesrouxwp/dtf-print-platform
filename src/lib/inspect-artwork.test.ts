import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { inspectArtwork, printSizeFromPixels, trimToPng } from "./inspect-artwork";

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

  it("trimToPng does not throw when the box sits past the image edge", async () => {
    const buf = await sharp({
      create: { width: 40, height: 40, channels: 4, background: { r: 226, g: 43, b: 18, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const out = await trimToPng(buf, { x: 40, y: 40, w: 10, h: 10 });
    const meta = await sharp(out).metadata();
    expect(meta.width).toBeGreaterThan(0);
    expect(meta.height).toBeGreaterThan(0);
  });

  it("print size at 300 dpi is millimetres, not pixels", () => {
    const size = printSizeFromPixels(1181, 1181, 300);
    expect(size.widthMm).toBe(100);
  });
});

