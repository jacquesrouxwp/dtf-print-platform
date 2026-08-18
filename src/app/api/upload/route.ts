import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { inspectArtwork, printSizeFromTrim } from "@/lib/inspect-artwork";
import { putObject } from "@/lib/storage";
import { getServerConfig } from "@/lib/server-config";
import { usableWidthMm } from "@/lib/units";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    return NextResponse.json(
      { error: "PDF is not accepted until page-box parsing ships. Use PNG or TIFF." },
      { status: 415 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let inspect;
  try {
    inspect = await inspectArtwork(buf);
  } catch {
    return NextResponse.json({ error: "unreadable image" }, { status: 422 });
  }

  const id = randomUUID();
  const storageKey = await putObject(`${id}.bin`, buf);
  const previewKey = await putObject(`${id}-preview.png`, inspect.previewPng);
  const config = await getServerConfig();
  const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
  const size = printSizeFromTrim(inspect.trimBox, config.outputDpi);
  const widthMm = Math.min(usable, size.widthMm);
  const heightMm = Math.round(widthMm / size.aspectRatio);

  return NextResponse.json({
    id,
    name: file.name,
    storageKey,
    previewKey,
    previewUrl: `/api/files?key=${encodeURIComponent(previewKey)}`,
    mime: file.type || "image/png",
    pixelW: inspect.trimBox.w,
    pixelH: inspect.trimBox.h,
    naturalPxW: inspect.naturalPxW,
    naturalPxH: inspect.naturalPxH,
    trimBox: inspect.trimBox,
    hasAlpha: inspect.hasAlpha,
    hasSemiTransparency: inspect.hasSemiTransparency,
    whiteBackground: inspect.whiteBackground,
    widthMm,
    heightMm,
    aspectRatio: size.aspectRatio,
  });
}
