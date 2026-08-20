export type TextAlign = "left" | "center" | "right";

export type TextSpec = {
  value: string;
  fontId: string;
  fontFamily: string;
  fontPx: number;
  fill: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  /** Outline width in the same units as fontPx. 0 means no outline. */
  strokeWidth: number;
  stroke: string;
};

export const defaultTextSpec: TextSpec = {
  value: "",
  fontId: "sans",
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  fontPx: 72,
  fill: "#ffffff",
  bold: true,
  italic: false,
  align: "left",
  strokeWidth: 0,
  stroke: "#000000",
};

/** Text is drawn at print resolution, so a big transfer stays sharp on film. */
const SCALE = 3;

export type TextStyle = Pick<TextSpec, "fill" | "fontFamily" | "fontPx"> &
  Partial<Pick<TextSpec, "bold" | "italic" | "align" | "strokeWidth" | "stroke">>;

function cssFont(style: TextStyle): string {
  const weight = style.bold === false ? "400" : "700";
  const italic = style.italic ? "italic " : "";
  return `${italic}${weight} ${style.fontPx}px ${style.fontFamily}`;
}

/** Rasterize copy to a transparent PNG so it nests and prints like any other piece. */
export async function rasterizeText(text: string, style: TextStyle): Promise<File> {
  const raw = text.replace(/\r/g, "").replace(/\s+$/g, "");
  if (!raw.trim()) throw new Error("empty");
  const lines = raw.split("\n");

  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) throw new Error("canvas");
  const font = cssFont(style);
  probe.font = font;

  const strokeWidth = Math.max(0, style.strokeWidth ?? 0);
  // The outline grows outwards from the glyph, so the padding has to grow with it
  // or the stroke gets clipped at the edge of the film piece.
  const pad = Math.max(8, Math.round(style.fontPx * 0.18)) + Math.ceil(strokeWidth);
  const lineH = style.fontPx * 1.2;
  const textW = Math.max(1, ...lines.map((l) => probe.measureText(l.length ? l : " ").width));
  const w = Math.ceil(textW + pad * 2);
  const h = Math.ceil(lineH * lines.length + pad * 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * SCALE));
  canvas.height = Math.max(1, Math.round(h * SCALE));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.scale(SCALE, SCALE);
  ctx.clearRect(0, 0, w, h);
  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  const align = style.align ?? "left";
  lines.forEach((line, i) => {
    const lineW = probe.measureText(line.length ? line : " ").width;
    const x =
      align === "center"
        ? pad + (textW - lineW) / 2
        : align === "right"
        ? pad + (textW - lineW)
        : pad;
    const y = pad + i * lineH;
    if (strokeWidth > 0) {
      ctx.strokeStyle = style.stroke ?? "#000000";
      // A stroke is centred on the outline, so double it to get the visible width.
      ctx.lineWidth = strokeWidth * 2;
      ctx.strokeText(line, x, y);
    }
    ctx.fillStyle = style.fill;
    ctx.fillText(line, x, y);
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/png");
  });
  return new File([blob], `${textSlug(raw)}.png`, { type: "image/png" });
}

/** A filename the shop can recognise in the print queue. */
export function textSlug(raw: string): string {
  return (
    raw
      .slice(0, 28)
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "text"
  );
}
