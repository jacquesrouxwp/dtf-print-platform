export type TextStyle = {
  fill: string;
  fontFamily: string;
  fontPx: number;
};

/** Rasterize copy to a transparent PNG so it nests and prints like any other piece. */
export async function rasterizeText(text: string, style: TextStyle): Promise<File> {
  const raw = text.replace(/\r/g, "").replace(/\s+$/g, "");
  if (!raw.trim()) throw new Error("empty");
  const lines = raw.split("\n");
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) throw new Error("canvas");
  const font = `700 ${style.fontPx}px ${style.fontFamily}`;
  probe.font = font;
  const pad = Math.max(8, Math.round(style.fontPx * 0.18));
  const lineH = style.fontPx * 1.2;
  const textW = Math.max(1, ...lines.map((l) => probe.measureText(l.length ? l : " ").width));
  const w = Math.ceil(textW + pad * 2);
  const h = Math.ceil(lineH * lines.length + pad * 2);
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, w, h);
  ctx.font = font;
  ctx.fillStyle = style.fill;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  lines.forEach((line, i) => {
    ctx.fillText(line, pad, pad + i * lineH);
  });
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/png");
  });
  const slug =
    raw
      .slice(0, 28)
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\-]+/g, "")
      .replace(/-+/g, "-") || "text";
  return new File([blob], `${slug}.png`, { type: "image/png" });
}
