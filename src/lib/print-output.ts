import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Layout, PlacedItem } from "./nesting";
import type { TrimBox } from "./inspect-artwork";
import type { RollConfig } from "./roll";
import { mmToPx } from "./units";
import { putObject } from "./storage";

export type ProductionFiles = {
  orderId: string;
  printPngPath: string;
  operatorPdfPath: string;
  manifestPath: string;
  printWidthPx: number;
  printHeightPx: number;
};

export function printSizePx(roll: RollConfig, billedLengthMm: number) {
  return {
    widthPx: mmToPx(roll.widthMm, roll.outputDpi),
    heightPx: mmToPx(billedLengthMm, roll.outputDpi),
  };
}

export async function renderPrintPng(
  roll: RollConfig,
  billedLengthMm: number,
  items: PlacedItem[],
  images?: Map<string, Buffer>,
  trims?: Map<string, TrimBox>
): Promise<Buffer> {
  const { widthPx, heightPx } = printSizePx(roll, billedLengthMm);
  const base = sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png();

  if (!images || images.size === 0 || items.length === 0) {
    return base.toBuffer();
  }

  const composites: { input: Buffer; left: number; top: number }[] = [];
  for (const item of items) {
    const src = images.get(item.designId);
    if (!src) continue;
    const w = Math.max(1, mmToPx(item.widthMm, roll.outputDpi));
    const h = Math.max(1, mmToPx(item.heightMm, roll.outputDpi));
    let img = sharp(src);
    const trim = trims?.get(item.designId);
    if (trim && trim.w > 0 && trim.h > 0) {
      const meta = await sharp(src).metadata();
      const nw = meta.width ?? 0;
      const nh = meta.height ?? 0;
      if (nw > trim.w + 2 || nh > trim.h + 2) {
        img = sharp(src).extract({
          left: Math.max(0, trim.x),
          top: Math.max(0, trim.y),
          width: Math.min(trim.w, Math.max(1, nw - trim.x)),
          height: Math.min(trim.h, Math.max(1, nh - trim.y)),
        });
      }
    }
    if (item.flipX) img = img.flop();
    const resized = await img
      .rotate(item.rotation || 0)
      .resize(w, h, { fit: "fill" })
      .ensureAlpha()
      .png()
      .toBuffer();
    composites.push({
      input: resized,
      left: mmToPx(item.xMm, roll.outputDpi),
      top: mmToPx(item.yMm, roll.outputDpi),
    });
  }

  if (composites.length === 0) return base.toBuffer();
  return sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

export async function renderOperatorPdf(
  orderId: string,
  roll: RollConfig,
  layout: Layout
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Courier);
  const { width, height } = page.getSize();
  page.drawText(`HLV operator sheet  ${orderId}`, {
    x: 40,
    y: height - 40,
    size: 12,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(
    `roll ${roll.widthMm} mm  billed ${layout.billedLengthMm} mm  items ${layout.items.length}`,
    { x: 40, y: height - 58, size: 9, font, color: rgb(0.2, 0.2, 0.2) }
  );

  const usableW = width - 80;
  const scale = usableW / roll.widthMm;
  const mapH = Math.min(620, layout.billedLengthMm * scale);
  const originY = height - 80 - mapH;
  page.drawRectangle({
    x: 40,
    y: originY,
    width: usableW,
    height: mapH,
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 0.8,
  });

  layout.items.forEach((item, i) => {
    const x = 40 + item.xMm * scale;
    const h = item.heightMm * scale;
    const y = originY + mapH - (item.yMm + item.heightMm) * scale;
    page.drawRectangle({
      x,
      y,
      width: item.widthMm * scale,
      height: h,
      borderColor: rgb(0.85, 0.16, 0.07),
      borderWidth: 0.6,
    });
    page.drawText(String(i + 1), {
      x: x + 2,
      y: y + Math.max(2, h - 10),
      size: 8,
      font,
      color: rgb(0.85, 0.16, 0.07),
    });
  });

  let ly = 36;
  layout.items.slice(0, 18).forEach((item, i) => {
    page.drawText(
      `${i + 1}  ${item.designId}  ${item.widthMm}x${item.heightMm}mm  @${item.xMm},${item.yMm}`,
      { x: 40, y: ly, size: 7, font, color: rgb(0.15, 0.15, 0.15) }
    );
    ly += 10;
  });

  return doc.save();
}

export function buildManifest(input: {
  orderId: string;
  customer: { name?: string; email?: string };
  roll: RollConfig;
  layout: Layout;
  priceExVat: number;
}) {
  const grouped = new Map<string, PlacedItem[]>();
  for (const item of input.layout.items) {
    const list = grouped.get(item.designId) ?? [];
    list.push(item);
    grouped.set(item.designId, list);
  }
  return {
    orderId: input.orderId,
    customer: input.customer,
    roll: {
      widthMm: input.roll.widthMm,
      billedLengthMm: input.layout.billedLengthMm,
    },
    priceExVat: input.priceExVat,
    items: [...grouped.entries()].map(([designId, copies]) => ({
      designId,
      filename: `${designId}.png`,
      widthMm: copies[0].widthMm,
      heightMm: copies[0].heightMm,
      xMm: copies[0].xMm,
      yMm: copies[0].yMm,
      rotation: copies[0].rotation,
      quantity: copies.length,
    })),
    generatedAt: new Date().toISOString(),
  };
}

export async function writeProductionQueue(args: {
  orderId: string;
  roll: RollConfig;
  layout: Layout;
  customer: { name?: string; email?: string };
  priceExVat: number;
  images?: Map<string, Buffer>;
  trims?: Map<string, TrimBox>;
}): Promise<ProductionFiles> {
  const root = process.env.VERCEL ? "/tmp" : process.cwd();
  const dir = path.join(root, ".data", "queue", args.orderId);
  await mkdir(dir, { recursive: true });
  const { widthPx, heightPx } = printSizePx(args.roll, args.layout.billedLengthMm);
  const png = await renderPrintPng(
    args.roll,
    args.layout.billedLengthMm,
    args.layout.items,
    args.images,
    args.trims
  );
  const pdf = await renderOperatorPdf(args.orderId, args.roll, args.layout);
  const manifest = buildManifest({
    orderId: args.orderId,
    customer: args.customer,
    roll: args.roll,
    layout: args.layout,
    priceExVat: args.priceExVat,
  });
  const printPngPath = path.join(dir, `${args.orderId}.png`);
  const operatorPdfPath = path.join(dir, `${args.orderId}-operator.pdf`);
  const manifestPath = path.join(dir, `${args.orderId}.json`);
  await writeFile(printPngPath, png);
  await writeFile(operatorPdfPath, pdf);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  try {
    await putObject(`queue/${args.orderId}.png`, png);
    await putObject(`queue/${args.orderId}-operator.pdf`, Buffer.from(pdf));
    await putObject(
      `queue/${args.orderId}.json`,
      Buffer.from(JSON.stringify(manifest, null, 2), "utf8")
    );
  } catch {
    /* local fs is enough when blob is unset */
  }
  return {
    orderId: args.orderId,
    printPngPath,
    operatorPdfPath,
    manifestPath,
    printWidthPx: widthPx,
    printHeightPx: heightPx,
  };
}
