import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server-config";
import { authoritativeOrderQuote, type OrderFilm } from "@/lib/order-quote";
import { fulfillPaidOrder } from "@/lib/fulfill-order";
import {
  deferPrintUntilPaid,
  savePendingOrder,
  type PendingFilm,
} from "@/lib/pending-order";
import type { NestSource } from "@/lib/nesting";

export const runtime = "nodejs";

type CheckoutItem = NestSource & {
  storageKey?: string;
  trimBox?: { x: number; y: number; w: number; h: number };
};

type CheckoutFilm = { id?: string; items?: CheckoutItem[]; gapMm?: number };

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
        gapMm: film.gapMm,
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

  if (sources.every((s) => !s.storageKey)) {
    return NextResponse.json(
      { error: "artwork_missing", message: "No stored originals. Re-upload designs." },
      { status: 422 }
    );
  }

  const orderId =
    typeof body.orderId === "string" && body.orderId.startsWith("HLV-")
      ? body.orderId
      : `HLV-${Date.now().toString(36).toUpperCase()}`;

  const pendingFilms: PendingFilm[] = films.map((f) => ({
    id: f.id,
    sources: f.sources as PendingFilm["sources"],
    gapMm: f.gapMm,
  }));

  const pending = {
    orderId,
    status: "pending" as const,
    films: pendingFilms,
    customer: {
      name: typeof body.customer?.name === "string" ? body.customer.name : undefined,
      email: typeof body.customer?.email === "string" ? body.customer.email : undefined,
    },
    trade: Boolean(body.trade),
    rush: Boolean(body.rush),
    pickup: Boolean(body.pickup),
    charged,
    createdAt: new Date().toISOString(),
  };

  await savePendingOrder(pending);

  const key = process.env.MOLLIE_API_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const method = typeof body.method === "string" ? body.method : "ideal";

  if (deferPrintUntilPaid(key, method)) {
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
        webhookUrl: `${site}/api/mollie`,
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
        pending: true,
      });
    }
  }

  const written = await fulfillPaidOrder({ ...pending, status: "paid" });

  return NextResponse.json({
    ok: true,
    orderId,
    demo: !key,
    mollie: Boolean(key),
    quote,
    billedLengthMm: quote.lengthMm,
    films: written.films,
    files: written.films[0]
      ? {
          printWidthPx: undefined,
          printHeightPx: undefined,
          manifestPath: `queue/${written.films[0].filmId}.json`,
        }
      : undefined,
  });
}
