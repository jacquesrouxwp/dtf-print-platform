import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server-config";
import { authoritativeOrderQuote, type OrderFilm } from "@/lib/order-quote";
import { fulfillPaidOrder } from "@/lib/fulfill-order";
import { parseOrderCustomer, savePendingOrder, type PendingFilm } from "@/lib/pending-order";
import type { NestSource } from "@/lib/nesting";
import { assignOrderId, testOrdersEnabled } from "@/lib/test-order";
import { siteBaseUrl } from "@/lib/queue-files";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const config = await getServerConfig();
  const films = filmsFromBody(body as { films?: CheckoutFilm[]; items?: CheckoutItem[] });
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

  if (
    sources.some(
      (s) => Array.isArray(s.instances) && s.instances.length > 0 && s.instances.length !== s.qty
    )
  ) {
    return NextResponse.json({ error: "qty_mismatch" }, { status: 422 });
  }

  const pickup = Boolean(body.pickup);
  const order = authoritativeOrderQuote(films, config, {
    trade: false,
    rush: Boolean(body.rush),
    includeShipping: !pickup,
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

  if (sources.some((s) => !s.storageKey)) {
    return NextResponse.json(
      { error: "artwork_missing", message: "No stored originals. Re-upload designs." },
      { status: 422 }
    );
  }

  const staffTest = testOrdersEnabled();
  const orderId = assignOrderId(
    staffTest,
    typeof body.orderId === "string" ? body.orderId : undefined
  );

  const pendingFilms: PendingFilm[] = films.map((f) => ({
    id: f.id,
    sources: f.sources as PendingFilm["sources"],
    gapMm: f.gapMm,
  }));

  const customer = parseOrderCustomer(body.customer);
  if (!pickup && !customer.address) {
    return NextResponse.json({ error: "address_required" }, { status: 422 });
  }

  const pending = {
    orderId,
    status: "pending" as const,
    films: pendingFilms,
    customer,
    trade: false,
    rush: Boolean(body.rush),
    pickup,
    charged,
    createdAt: new Date().toISOString(),
    test: staffTest,
  };

  if (staffTest) {
    await savePendingOrder({ ...pending, status: "paid" });
    const written = await fulfillPaidOrder({ ...pending, status: "paid" });
    return NextResponse.json({
      ok: true,
      test: true,
      orderId,
      quote,
      films: written.films,
      files: written.films[0]
        ? { manifestPath: `queue/${written.films[0].filmId}.json` }
        : undefined,
      airtable: "airtable" in written ? written.airtable : undefined,
    });
  }

  const key = process.env.MOLLIE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "payments_unavailable", message: "Payments coming soon." },
      { status: 503 }
    );
  }

  await savePendingOrder(pending);

  const site = siteBaseUrl();
  const locale =
    typeof body.locale === "string" && /^(nl|en|uk|fr|de|ar)$/.test(body.locale)
      ? body.locale
      : "nl";
  const res = await fetch("https://api.mollie.com/v2/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: { currency: "EUR", value: charged.toFixed(2) },
      description: `DTF Studio ${orderId}`,
      redirectUrl: `${site}/${locale}/checkout?paid=${orderId}`,
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

  return NextResponse.json(
    { error: "mollie_failed", orderId, quote },
    { status: 502 }
  );
}
