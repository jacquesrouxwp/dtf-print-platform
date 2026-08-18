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

export async function inspectArtwork(input: Buffer): Promise<ArtworkInspect> {
  const meta = await sharp(input).metadata();
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

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

  const trimBox: TrimBox =
    maxX < 0
      ? { x: 0, y: 0, w, h }
      : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };

  const previewPng = await sharp(input)
    .extract({
      left: trimBox.x,
      top: trimBox.y,
      width: trimBox.w,
      height: trimBox.h,
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
    naturalPxW: meta.width ?? w,
    naturalPxH: meta.height ?? h,
    trimBox,
    hasAlpha,
    hasSemiTransparency,
    whiteBackground: !hasAlpha && opaque > 0 && white / opaque > 0.35,
    previewPng,
  };
}

export function printSizeFromTrim(trim: TrimBox, dpi = 300) {
  const widthMm = Math.max(10, Math.round((trim.w / dpi) * 25.4));
  const heightMm = Math.max(10, Math.round((trim.h / trim.w) * widthMm));
  return { widthMm, heightMm, aspectRatio: trim.w / trim.h };
}
