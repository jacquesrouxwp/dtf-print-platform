import { NextResponse } from "next/server";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const data = await getObject(key);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
