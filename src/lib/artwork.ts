export type ArtworkWarning = {
  level: "amber" | "red" | "info";
  code:
    | "dpi_low"
    | "dpi_fail"
    | "jpeg"
    | "white_bg"
    | "cmyk"
    | "too_wide"
    | "file_huge";
  messageKey: string;
};

export function effectiveDpi(pixelWidth: number, printWidthMm: number): number {
  if (printWidthMm <= 0) return 0;
  const inches = printWidthMm / 25.4;
  return pixelWidth / inches;
}

export function dpiWarnings(dpi: number): ArtworkWarning[] {
  if (dpi < 150) {
    return [{ level: "red", code: "dpi_fail", messageKey: "builder.warnDpiFail" }];
  }
  if (dpi < 200) {
    return [{ level: "amber", code: "dpi_low", messageKey: "builder.warnDpiLow" }];
  }
  return [];
}

export function isLikelyCmykPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function inspectImageTransparency(
  file: File
): Promise<{ hasAlpha: boolean; whiteBackground: boolean; width: number; height: number }> {
  const isJpeg =
    file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
  if (isJpeg) {
    const dims = await readImageSize(file);
    return { hasAlpha: false, whiteBackground: true, ...dims };
  }

  const bitmap = await fileToImage(file);
  const canvas = document.createElement("canvas");
  const w = Math.min(bitmap.width, 240);
  const h = Math.min(bitmap.height, 240);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return {
      hasAlpha: !isJpeg,
      whiteBackground: false,
      width: bitmap.width,
      height: bitmap.height,
    };
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let opaque = 0;
  let white = 0;
  let alphaPixels = 0;
  const step = 16;
  for (let i = 0; i < data.length; i += 4 * step) {
    const a = data[i + 3];
    if (a < 250) alphaPixels += 1;
    else {
      opaque += 1;
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) white += 1;
    }
  }
  const hasAlpha = alphaPixels > 4;
  const whiteBackground = !hasAlpha && opaque > 0 && white / opaque > 0.35;
  return {
    hasAlpha,
    whiteBackground,
    width: bitmap.width,
    height: bitmap.height,
  };
}

export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return fileToImage(file).then((img) => ({ width: img.width, height: img.height }));
}

export function fileToImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export async function previewDataUrl(file: File, maxEdge = 1600): Promise<string> {
  const img = await fileToImage(file);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/webp",
];
