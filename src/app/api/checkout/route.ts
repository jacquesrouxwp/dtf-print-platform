import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server-config";
import { authoritativeOrderQuote, type OrderFilm } from "@/lib/order-quote";
import { rollFromSite } from "@/lib/roll";
import { writeProductionQueue } from "@/lib/print-output";
import { getObject } from "@/lib/storage";
import type { NestSource } from "@/lib/nesting";

export const runtime = "nodejs";

type CheckoutItem = NestSource & {
  storageKey?: string;
  trimBox?: { x: number; y: number; w: number; h: number };
};

type CheckoutFilm = { id?: string; items?: CheckoutItem[] };

/**
 * An order is a list of films. Older clients posted a flat `items` array; that
 * is one film, not a licence to merge everything onto one sheet.
 */
function filmsFromBody(body: {
  films?: CheckoutFilm[];
  items?: CheckoutItem[];
}): OrderFilm[] {
  if (Array.isArray(body.films) && body.films.length) {
    return body.films
      .map((film, i) => ({
        id: typeof film.id === "string" ? film.id : `film-${i + 1}`,
        sources: (film.items ?? []) as NestSource[],
      }))
      .filter((film) => film.sources.length > 0);
  }
  const items = (body.items ?? []) as CheckoutItem[];
  return items.length ? [{ id: "film-1", sources: items as NestSource[] }] : [];
}

export async function POST(request: Request) {
  const body = await request.json();
  const config = await getServerConfig();
  const films = filmsFromBody(body);
  const sources = films.flatMap((f) => f.sources) as CheckoutItem[];

  if (!films.length) {
    return NextResponse.json({ error: "empty_order" }, { status: 422 });
  }

  const usableWidth = config.rollWidthMm - 2 * config.edgeMm;
  if (sources.some((s) => s.widthMm > usableWidth && s.heightMm > usableWidth)) {
    return NextResponse.json(
      {
        error: "rejected_designs",
        rejected: sources.filter((s) => s.widthMm > usableWidth).map((s) => s.designId),
      },
      { status: 422 }
    );
  }

  const order = authoritativeOrderQuote(films, config, {
    trade: Boolean(body.trade),
    rush: Boolean(body.rush),
    includeShipping: !body.pickup,
  });
  const quote = order.total;

  if (order.rejected.length) {
    return NextResponse.json(
      { error: "rejected_designs", rejected: order.rejected, quote },
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
        billedLengthMm: quote.lengthMm,
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

  const trims = new Map(
    sources
      .filter((s) => s.trimBox && s.trimBox.w > 0)
      .map((s) => [s.designId, s.trimBox!])
  );

  // One print file per film — the operator prints them on separate strips.
  const written = [];
  for (const [i, film] of order.films.entries()) {
    const filmId = order.films.length > 1 ? `${orderId}-${i + 1}` : orderId;
    const files = await writeProductionQueue({
      orderId: filmId,
      roll: rollFromSite(config),
      layout: film.layout,
      customer: { name: body.customer?.name, email: body.customer?.email },
      priceExVat: film.quote.subtotalExcl,
      images,
      trims,
    });
    written.push({
      filmId,
      billedLengthMm: film.layout.billedLengthMm,
      printWidthPx: files.printWidthPx,
      printHeightPx: files.printHeightPx,
      manifestPath: files.manifestPath,
    });
  }

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
    billedLengthMm: quote.lengthMm,
    films: written,
    files: written[0]
      ? {
          printWidthPx: written[0].printWidthPx,
          printHeightPx: written[0].printHeightPx,
          manifestPath: written[0].manifestPath,
        }
      : undefined,
  });
}
