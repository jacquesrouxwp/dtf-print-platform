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

  it("crops to the trim box so a centered logo is not shrunk", async () => {
    const roll = rollFromSite(defaultConfig);
    const canvas = await sharp({
      create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 80, height: 80, channels: 4, background: { r: 0, g: 200, b: 40, alpha: 1 } },
          })
            .png()
            .toBuffer(),
          left: 160,
          top: 160,
        },
      ])
      .png()
      .toBuffer();
    const layout = nest([{ designId: "logo", widthMm: 40, heightMm: 40, qty: 1 }], roll);
    const withTrim = await renderPrintPng(
      roll,
      layout.billedLengthMm,
      layout.items,
      new Map([["logo", canvas]]),
      new Map([["logo", { x: 160, y: 160, w: 80, h: 80 }]])
    );
    const withoutTrim = await renderPrintPng(
      roll,
      layout.billedLengthMm,
      layout.items,
      new Map([["logo", canvas]])
    );
    const count = async (buf: Buffer) => {
      const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let n = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 10) n += 1;
      return n;
    };
    expect(await count(withTrim)).toBeGreaterThan((await count(withoutTrim)) * 2);
  });
});
