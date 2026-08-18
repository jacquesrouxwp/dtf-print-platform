import { NextResponse } from "next/server";
import { defaultConfig } from "@/lib/site-config";
import { authoritativeQuote } from "@/lib/server-quote";
import { rollFromSite } from "@/lib/roll";
import { writeProductionQueue } from "@/lib/print-output";
import type { NestSource } from "@/lib/nesting";

export async function POST(request: Request) {
  const body = await request.json();
  const sources = (body.items ?? []) as NestSource[];
  const { layout, quote } = authoritativeQuote(sources, defaultConfig, {
    trade: Boolean(body.trade),
    rush: Boolean(body.rush),
    includeShipping: !body.pickup,
  });

  const orderId =
    typeof body.orderId === "string" && body.orderId.startsWith("HLV-")
      ? body.orderId
      : `HLV-${Date.now().toString(36).toUpperCase()}`;

  const charged = quote.totalIncl;
  const clientAmount = Number(body.amount);
  const ignoredClientPrice =
    Number.isFinite(clientAmount) && Math.abs(clientAmount - charged) > 0.009;

  const files = await writeProductionQueue({
    orderId,
    roll: rollFromSite(defaultConfig),
    layout,
    customer: {
      name: body.customer?.name,
      email: body.customer?.email,
    },
    priceExVat: quote.subtotalExcl,
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
        ignoredClientPrice,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    orderId,
    demo: !key,
    quote,
    billedLengthMm: layout.billedLengthMm,
    ignoredClientPrice,
    files: {
      printWidthPx: files.printWidthPx,
      printHeightPx: files.printHeightPx,
      manifestPath: files.manifestPath,
    },
  });
}
