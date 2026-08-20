import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server-config";
import { authoritativeOrderQuote, type OrderFilm } from "@/lib/order-quote";
import type { NestSource } from "@/lib/nesting";

type PriceFilm = { id?: string; items?: NestSource[] };

/** A flat `items` array is a single film. Films are never merged. */
function filmsFromBody(body: { films?: PriceFilm[]; items?: NestSource[] }): OrderFilm[] {
  if (Array.isArray(body.films) && body.films.length) {
    return body.films
      .map((film, i) => ({
        id: typeof film.id === "string" ? film.id : `film-${i + 1}`,
        sources: film.items ?? [],
      }))
      .filter((film) => film.sources.length > 0);
  }
  const items = body.items ?? [];
  return items.length ? [{ id: "film-1", sources: items }] : [];
}

export async function POST(request: Request) {
  const body = await request.json();
  const config = await getServerConfig();
  const films = filmsFromBody(body);

  const order = authoritativeOrderQuote(films, config, {
    trade: Boolean(body.trade),
    rush: Boolean(body.rush),
    includeShipping: body.includeShipping !== false,
  });

  const first = order.films[0];

  return NextResponse.json({
    quote: order.total,
    rejected: order.rejected,
    films: order.films.map((f) => ({
      id: f.id,
      usedLengthMm: f.layout.usedLengthMm,
      billedLengthMm: f.layout.billedLengthMm,
      subtotalExcl: f.quote.subtotalExcl,
      items: f.layout.items,
    })),
    // Kept for single-film callers that read these at the top level.
    usedLengthMm: first ? first.layout.usedLengthMm : 0,
    billedLengthMm: first ? first.layout.billedLengthMm : 0,
    items: first ? first.layout.items : [],
  });
}
