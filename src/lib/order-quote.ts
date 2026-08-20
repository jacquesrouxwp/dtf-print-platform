import { nest, type Layout, type NestSource } from "./nesting";
import { quoteFilm, rateForMeters, type PriceBreakdown } from "./pricing";
import { rollFromSite } from "./roll";
import type { SiteConfig } from "./site-config";

export type OrderFilm = {
  id: string;
  sources: NestSource[];
  /** Gap the customer chose for this film; clamped, never trusted raw. */
  gapMm?: number;
};

export type FilmQuote = {
  id: string;
  layout: Layout;
  quote: PriceBreakdown;
};

export type OrderQuote = {
  films: FilmQuote[];
  /** Combined, authoritative total for the whole order. */
  total: PriceBreakdown;
  rejected: string[];
};

export type QuoteOptions = {
  trade?: boolean;
  rush?: boolean;
  includeShipping?: boolean;
};

/**
 * An order is one or more films, and each film is printed on its own strip of
 * material. They must be nested, billed and rendered separately: a film's
 * piece coordinates are relative to that film, so merging them puts artwork on
 * top of artwork, and the per-film minimum order is lost.
 *
 * Shipping and BTW belong to the order, not to a film, so they are applied
 * once over the summed subtotals.
 */
export function authoritativeOrderQuote(
  films: OrderFilm[],
  config: SiteConfig,
  opts?: QuoteOptions
): OrderQuote {
  const priced: FilmQuote[] = films.map((film) => {
    // Each film carries its own gap, so one loosely spaced sheet cannot quietly
    // reprice the rest of the order.
    const roll = rollFromSite(config, { gapMm: film.gapMm });
    const layout = nest(film.sources, roll);
    return {
      id: film.id,
      layout,
      // Per film: no shipping, it is charged once for the order below.
      quote: quoteFilm(layout.usedLengthMm, config, { ...opts, includeShipping: false }),
    };
  });

  const subtotalExcl = round2(
    priced.reduce((sum, f) => sum + f.quote.subtotalExcl, 0)
  );
  const billedMeters = Number(
    priced.reduce((sum, f) => sum + f.quote.billedMeters, 0).toFixed(3)
  );
  const lengthMm = priced.reduce((sum, f) => sum + f.layout.billedLengthMm, 0);

  const includeShipping = opts?.includeShipping !== false;
  const shipping =
    includeShipping && subtotalExcl > 0 && subtotalExcl < config.freeShippingFrom
      ? config.shippingCost
      : 0;
  const btw = round2(subtotalExcl * config.btwRate);
  const shippingBtw = round2(shipping * config.btwRate);

  const total: PriceBreakdown = {
    lengthMm,
    billedMeters,
    // The order spans several films, so a single per-metre rate would be a
    // fiction. Report the rate the summed length lands on, for the label only.
    rate: rateForMeters(billedMeters, config).rate,
    tierLabel: rateForMeters(billedMeters, config).tierLabel,
    subtotalExcl,
    btw,
    shipping,
    totalExcl: round2(subtotalExcl + shipping),
    totalIncl: round2(subtotalExcl + btw + shipping + shippingBtw),
    tradeApplied: Boolean(opts?.trade),
  };

  return {
    films: priced,
    total,
    rejected: priced.flatMap((f) => f.layout.rejected),
  };
}

function round2(n: number) {
  return Number(n.toFixed(2));
}
