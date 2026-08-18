import { nest, type NestSource } from "./nesting";
import { quoteFilm, type PriceBreakdown } from "./pricing";
import { rollFromSite } from "./roll";
import type { SiteConfig } from "./site-config";

export function authoritativeQuote(
  sources: NestSource[],
  config: SiteConfig,
  opts?: { trade?: boolean; rush?: boolean; includeShipping?: boolean }
): { layout: ReturnType<typeof nest>; quote: PriceBreakdown } {
  const layout = nest(sources, rollFromSite(config));
  const quote = quoteFilm(layout.usedLengthMm, config, opts);
  return { layout, quote };
}
