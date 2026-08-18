import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { nest } from "./nesting";
import { renderPrintPng } from "./print-output";
import { defaultConfig } from "./site-config";
import { rollFromSite } from "./roll";
import { mmToPx } from "./units";

describe("print output", () => {
  it("PNG width equals rollWidthMm/25.4*300 and has a real alpha channel", async () => {
    const roll = rollFromSite(defaultConfig);
    const layout = nest(
      [{ designId: "a", widthMm: 100, heightMm: 100, qty: 1 }],
      roll
    );
    const buf = await renderPrintPng(roll, layout.billedLengthMm, layout.items);
    const meta = await sharp(buf).metadata();
    expect(meta.width).toBe(mmToPx(roll.widthMm, roll.outputDpi));
    expect(meta.height).toBe(mmToPx(layout.billedLengthMm, roll.outputDpi));
    expect(meta.channels).toBe(4);
    expect(meta.hasAlpha).toBe(true);

    const { data } = await sharp(buf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
  });

  it("item at x=12 mm is composited at 142 px", async () => {
    expect(mmToPx(12, 300)).toBe(142);
  });

  it("composited artwork produces non-transparent pixels", async () => {
    const roll = rollFromSite(defaultConfig);
    const red = await sharp({
      create: { width: 40, height: 40, channels: 4, background: { r: 220, g: 30, b: 20, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const layout = nest(
      [{ designId: "mark", widthMm: 40, heightMm: 40, qty: 1 }],
      roll
    );
    const buf = await renderPrintPng(
      roll,
      layout.billedLengthMm,
      layout.items,
      new Map([["mark", red]])
    );
    const { data } = await sharp(buf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 10) opaque += 1;
    }
    expect(opaque).toBeGreaterThan(100);
  });
});
