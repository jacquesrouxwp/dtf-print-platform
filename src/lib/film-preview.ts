import type { PlacedPiece } from "./nesting";

/**
 * A picture of the film for the customer, built in their own browser.
 *
 * This is deliberately not the print file. The production PNG is 550mm at
 * 300 dpi — 6496 pixels wide, and a twenty metre order is over a gigapixel,
 * which no phone and no serverless function is going to hand back. So the
 * preview is drawn small, on white, and says so on its own face: what goes to
 * the press is rebuilt at 300 dpi from the originals after payment.
 */

export type PreviewDesign = {
  id: string;
  name: string;
  src: string;
};

export type PreviewInput = {
  designs: PreviewDesign[];
  placed: PlacedPiece[];
  lengthMm: number;
  rollWidthMm: number;
  /** Drawn across the top of the image, in the customer's language. */
  caption: string;
};

/** Wide enough to judge a layout on, small enough to build and to send. */
const TARGET_WIDTH_PX = 1000;
const MAX_PIXELS = 24_000_000;
const CAPTION_PX = 34;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src || src.startsWith("data:,")) {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Pixels per millimetre for the preview: the target width, pulled back if the
 * film is long enough that the full-size image would not fit in memory.
 */
export function previewScale(rollWidthMm: number, lengthMm: number): number {
  const width = Math.max(1, rollWidthMm);
  const length = Math.max(1, lengthMm);
  const wide = TARGET_WIDTH_PX / width;
  const budget = Math.sqrt(MAX_PIXELS / (width * length));
  return Math.min(wide, budget);
}

/**
 * Draws the film and hands back a JPEG. Artwork the browser refuses to read
 * back — a cross-origin image without CORS headers would taint the canvas and
 * throw on export — is drawn as a labelled outline rather than failing the
 * whole preview.
 */
export async function renderFilmPreview(input: PreviewInput): Promise<Blob> {
  const { designs, placed, lengthMm, rollWidthMm, caption } = input;
  const scale = previewScale(rollWidthMm, lengthMm);
  const filmW = Math.max(1, Math.round(rollWidthMm * scale));
  const filmH = Math.max(1, Math.round(Math.max(lengthMm, 1) * scale));

  const canvas = document.createElement("canvas");
  canvas.width = filmW;
  canvas.height = filmH + CAPTION_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("preview: no 2d context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#161412";
  ctx.fillRect(0, 0, canvas.width, CAPTION_PX);
  ctx.fillStyle = "#efe8db";
  ctx.font = "16px ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(caption, 10, CAPTION_PX / 2);

  const images = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    designs.map(async (d) => {
      images.set(d.id, await loadImage(d.src));
    })
  );

  ctx.save();
  ctx.translate(0, CAPTION_PX);
  for (const piece of placed) {
    const img = images.get(piece.designId) ?? null;
    const x = piece.xMm * scale;
    const y = piece.yMm * scale;
    const w = Math.max(1, piece.widthMm * scale);
    const h = Math.max(1, piece.heightMm * scale);
    if (!img) {
      ctx.strokeStyle = "#b8b0a2";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      continue;
    }
    ctx.save();
    ctx.translate(x, y);
    if (piece.rotation === 90) {
      ctx.translate(w, 0);
      ctx.rotate(Math.PI / 2);
    }
    const drawW = piece.rotation === 90 ? h : w;
    const drawH = piece.rotation === 90 ? w : h;
    if (piece.flipX) {
      ctx.translate(drawW, 0);
      ctx.scale(-1, 1);
    }
    try {
      ctx.drawImage(img, 0, 0, drawW, drawH);
    } catch {
      ctx.strokeStyle = "#b8b0a2";
      ctx.strokeRect(0, 0, drawW, drawH);
    }
    ctx.restore();
  }
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("preview: export failed"))),
      "image/jpeg",
      0.82
    );
  });
}

/** `dtf-film-2.4m-preview.jpg` — the length is the thing they will look for. */
export function previewFileName(lengthMm: number): string {
  return `dtf-film-${(Math.max(0, lengthMm) / 1000).toFixed(1)}m-preview.jpg`;
}
