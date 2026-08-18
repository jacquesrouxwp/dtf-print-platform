import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server-config";
import { authoritativeQuote } from "@/lib/server-quote";
import type { NestSource } from "@/lib/nesting";

export async function POST(request: Request) {
  const body = await request.json();
  const config = await getServerConfig();
  const sources = (body.items ?? []) as NestSource[];
  const { layout, quote } = authoritativeQuote(sources, config, {
    trade: Boolean(body.trade),
    rush: Boolean(body.rush),
    includeShipping: body.includeShipping !== false,
  });
  return NextResponse.json({
    usedLengthMm: layout.usedLengthMm,
    billedLengthMm: layout.billedLengthMm,
    rejected: layout.rejected,
    quote,
    items: layout.items,
  });
}
