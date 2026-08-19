import sharp from "sharp";

export type TrimBox = { x: number; y: number; w: number; h: number };

export type ArtworkInspect = {
  naturalPxW: number;
  naturalPxH: number;
  trimBox: TrimBox;
  hasAlpha: boolean;
  hasSemiTransparency: boolean;
  whiteBackground: boolean;
  previewPng: Buffer;
};

const ALPHA_TRIM = 16;

const SCAN_MAX = 2000;

export async function inspectArtwork(input: Buffer): Promise<ArtworkInspect> {
  const meta = await sharp(input).metadata();
  const nativeW = meta.width ?? 1;
  const nativeH = meta.height ?? 1;
  const scanScale = Math.min(1, SCAN_MAX / Math.max(nativeW, nativeH));
  const pipeline =
    scanScale < 1
      ? sharp(input)
          .resize({
            width: Math.max(1, Math.round(nativeW * scanScale)),
            height: Math.max(1, Math.round(nativeH * scanScale)),
            fit: "fill",
          })
          .ensureAlpha()
      : sharp(input).ensureAlpha();
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let hasAlpha = false;
  let hasSemiTransparency = false;
  let opaque = 0;
  let white = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 255) hasAlpha = true;
      if (a > 0 && a < 255) hasSemiTransparency = true;
      if (a > ALPHA_TRIM) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      if (a > 250) {
        opaque += 1;
        if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) white += 1;
      }
    }
  }

  const scanned: TrimBox =
    maxX < 0
      ? { x: 0, y: 0, w, h }
      : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  const inv = scanScale > 0 ? 1 / scanScale : 1;
  const trimBox: TrimBox = {
    x: Math.max(0, Math.floor(scanned.x * inv)),
    y: Math.max(0, Math.floor(scanned.y * inv)),
    w: Math.min(nativeW, Math.max(1, Math.ceil(scanned.w * inv))),
    h: Math.min(nativeH, Math.max(1, Math.ceil(scanned.h * inv))),
  };
  if (trimBox.x + trimBox.w > nativeW) trimBox.w = nativeW - trimBox.x;
  if (trimBox.y + trimBox.h > nativeH) trimBox.h = nativeH - trimBox.y;

  const previewPng = await sharp(input)
    .extract({
      left: trimBox.x,
      top: trimBox.y,
      width: Math.max(1, trimBox.w),
      height: Math.max(1, trimBox.h),
    })
    .resize({
      width: Math.min(1200, trimBox.w),
      height: Math.min(1200, trimBox.h),
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  return {
    naturalPxW: nativeW,
    naturalPxH: nativeH,
    trimBox,
    hasAlpha,
    hasSemiTransparency,
    whiteBackground: !hasAlpha && opaque > 0 && white / opaque > 0.35,
    previewPng,
  };
}

export function printSizeFromTrim(trim: TrimBox, dpi = 300) {
  const tw = Math.max(1, trim.w);
  const th = Math.max(1, trim.h);
  const widthMm = Math.max(10, Math.round((tw / dpi) * 25.4));
  const heightMm = Math.max(10, Math.round((th / tw) * widthMm));
  return { widthMm, heightMm, aspectRatio: tw / th };
}

export function printSizeFromPixels(pixelW: number, pixelH: number, dpi = 300) {
  return printSizeFromTrim({ x: 0, y: 0, w: pixelW, h: pixelH }, dpi);
}

/** Crop to the opaque box. Never throws — bad boxes fall back to the full PNG. */
export async function trimToPng(input: Buffer, box: TrimBox): Promise<Buffer> {
  try {
    const meta = await sharp(input).metadata();
    const nw = Math.max(1, meta.width ?? 1);
    const nh = Math.max(1, meta.height ?? 1);
    const left = Math.min(Math.max(0, Math.floor(box.x)), nw - 1);
    const top = Math.min(Math.max(0, Math.floor(box.y)), nh - 1);
    const width = Math.max(1, Math.min(Math.floor(box.w) || 1, nw - left));
    const height = Math.max(1, Math.min(Math.floor(box.h) || 1, nh - top));
    return await sharp(input).extract({ left, top, width, height }).png().toBuffer();
  } catch {
    return sharp(input).png().toBuffer();
  }
}
