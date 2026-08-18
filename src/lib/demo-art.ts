import type { Design } from "@/store/useBuilderStore";

function canvasPng(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  draw(ctx, w, h);
  return canvas.toDataURL("image/png");
}

export function makeDemoDesigns(): Design[] {
  const mark = canvasPng(900, 900, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#111110";
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 380, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#111110";
    ctx.font = "700 220px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("HLV", w / 2, h / 2 + 10);
  });

  const word = canvasPng(1400, 420, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#E22B12";
    ctx.font = "700 220px ui-serif, Georgia, serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("atelier", 20, h / 2);
  });

  const badge = canvasPng(700, 700, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#111110";
    ctx.beginPath();
    ctx.moveTo(w / 2, 40);
    ctx.lineTo(w - 40, h / 2);
    ctx.lineTo(w / 2, h - 40);
    ctx.lineTo(40, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#F2EEE4";
    ctx.font = "700 72px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("55", w / 2, h / 2);
  });

  const banner = canvasPng(1600, 360, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#111110";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#F2EEE4";
    ctx.font = "600 140px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("HILVERSUM", w / 2, h / 2 + 8);
  });

  const number = canvasPng(800, 1000, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#111110";
    ctx.font = "800 620px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("88", w / 2, h / 2);
  });

  const specs: Array<Pick<Design, "name" | "src" | "pixelW" | "pixelH" | "widthMm" | "heightMm" | "qty">> = [
    { name: "hlv-mark.png", src: mark, pixelW: 900, pixelH: 900, widthMm: 80, heightMm: 80, qty: 4 },
    { name: "atelier.png", src: word, pixelW: 1400, pixelH: 420, widthMm: 180, heightMm: 54, qty: 2 },
    { name: "badge-55.png", src: badge, pixelW: 700, pixelH: 700, widthMm: 60, heightMm: 60, qty: 3 },
    { name: "hilversum.png", src: banner, pixelW: 1600, pixelH: 360, widthMm: 220, heightMm: 50, qty: 2 },
    { name: "88.png", src: number, pixelW: 800, pixelH: 1000, widthMm: 70, heightMm: 88, qty: 6 },
  ];

  return specs.map((s) => ({
    id: crypto.randomUUID(),
    mime: "image/png",
    warnings: [],
    hasAlpha: true,
    hasSemiTransparency: false,
    whiteBackground: false,
    allowRotate: true,
    aspectRatio: s.widthMm / s.heightMm,
    ...s,
  }));
}
