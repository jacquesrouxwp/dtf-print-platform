import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server-config";
import { authoritativeQuote } from "@/lib/server-quote";
import { rollFromSite } from "@/lib/roll";
import { writeProductionQueue } from "@/lib/print-output";
import { getObject } from "@/lib/storage";
import type { NestSource } from "@/lib/nesting";

export const runtime = "nodejs";

type CheckoutItem = NestSource & { storageKey?: string };

export async function POST(request: Request) {
  const body = await request.json();
  const config = await getServerConfig();
  const sources = (body.items ?? []) as CheckoutItem[];

  if (sources.some((s) => s.widthMm > config.rollWidthMm - 2 * config.edgeMm && s.heightMm > config.rollWidthMm - 2 * config.edgeMm)) {
    return NextResponse.json(
      { error: "rejected_designs", rejected: sources.filter((s) => s.widthMm > config.rollWidthMm - 2 * config.edgeMm).map((s) => s.designId) },
      { status: 422 }
    );
  }

  const { layout, quote } = authoritativeQuote(sources, config, {
    trade: Boolean(body.trade),
    rush: Boolean(body.rush),
    includeShipping: !body.pickup,
  });

  if (layout.rejected.length) {
    return NextResponse.json(
      { error: "rejected_designs", rejected: layout.rejected, quote, layout },
      { status: 422 }
    );
  }

  const charged = quote.totalIncl;
  const clientAmount = Number(body.amount);
  const mismatch =
    Number.isFinite(clientAmount) && Math.abs(clientAmount - charged) > 0.009;

  if (mismatch && body.confirm !== true) {
    return NextResponse.json(
      {
        requiresConfirmation: true,
        quote,
        billedLengthMm: layout.billedLengthMm,
      },
      { status: 409 }
    );
  }

  const images = new Map<string, Buffer>();
  for (const src of sources) {
    if (!src.storageKey) continue;
    const buf = await getObject(src.storageKey);
    if (buf) images.set(src.designId, buf);
  }

  if (images.size === 0) {
    return NextResponse.json(
      { error: "artwork_missing", message: "No stored originals. Re-upload designs." },
      { status: 422 }
    );
  }

  const orderId =
    typeof body.orderId === "string" && body.orderId.startsWith("HLV-")
      ? body.orderId
      : `HLV-${Date.now().toString(36).toUpperCase()}`;

  const files = await writeProductionQueue({
    orderId,
    roll: rollFromSite(config),
    layout,
    customer: {
      name: body.customer?.name,
      email: body.customer?.email,
    },
    priceExVat: quote.subtotalExcl,
    images,
  });

  const key = process.env.MOLLIE_API_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (key && body.method === "ideal") {
    const res = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: "EUR", value: charged.toFixed(2) },
        description: `HLV ${orderId}`,
        redirectUrl: `${site}/nl/checkout?paid=${orderId}`,
        method: "ideal",
        metadata: { orderId },
      }),
    });
    const payment = await res.json();
    if (payment?._links?.checkout?.href) {
      return NextResponse.json({
        redirectUrl: payment._links.checkout.href,
        orderId,
        quote,
        mollie: true,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    orderId,
    demo: !key,
    mollie: Boolean(key),
    quote,
    billedLengthMm: layout.billedLengthMm,
    files: {
      printWidthPx: files.printWidthPx,
      printHeightPx: files.printHeightPx,
      manifestPath: files.manifestPath,
    },
  });
}
