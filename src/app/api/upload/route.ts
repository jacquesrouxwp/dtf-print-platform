import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { usableWidthMm } from "@/lib/units";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "file too large" }, { status: 413 });
    }

    const filename = "name" in file && typeof file.name === "string" ? file.name : "artwork.png";
    if (filename.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "PDF is not accepted until page-box parsing ships. Use PNG or TIFF." },
        { status: 415 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { inspectArtwork, printSizeFromTrim, trimToPng } = await import("@/lib/inspect-artwork");
    const { putObject } = await import("@/lib/storage");
    const { getServerConfig } = await import("@/lib/server-config");

    let inspect;
    try {
      inspect = await inspectArtwork(buf);
    } catch {
      return NextResponse.json({ error: "unreadable image" }, { status: 422 });
    }

    const id = randomUUID();
    const trimmed = await trimToPng(buf, inspect.trimBox);
    const storageKey = await putObject(`${id}.png`, trimmed);
    const previewKey = await putObject(`${id}-preview.png`, inspect.previewPng);
    const config = await getServerConfig();
    const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
    const size = printSizeFromTrim(inspect.trimBox, config.outputDpi);
    const widthMm = Math.min(usable, size.widthMm);
    const heightMm = Math.max(10, Math.round(widthMm / size.aspectRatio));

    return NextResponse.json({
      id,
      name: filename,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
