import { NextResponse } from "next/server";
import { getObject } from "@/lib/storage";
import {
  contentTypeForQueueKey,
  filenameForQueueKey,
  safeQueueKey,
} from "@/lib/queue-files";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const key = safeQueueKey(new URL(request.url).searchParams.get("key"));
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const data = await getObject(key);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  const type = contentTypeForQueueKey(key);
  const name = filenameForQueueKey(key);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
