import { rateForMeters } from "./pricing";
import type { SiteConfig } from "./site-config";

export type Bundle = { meters: number; freeMeters: number };

export type BundleOffer = Bundle & {
  /** Metres the customer actually receives. */
  totalMeters: number;
  /** Rate the paid metres are charged at, from the normal tier table. */
  rate: number;
  priceExcl: number;
  btw: number;
  priceIncl: number;
  /** What a metre ends up costing once the free ones are counted. */
  effectiveRate: number;
  /** Saving against buying the same total length at the going rate. */
  savingExcl: number;
};

function round2(n: number) {
  return Number(n.toFixed(2));
}

/**
 * A bundle is prepayment, not a discount scheme: the customer pays the normal
 * tier rate for the metres they buy and receives extra metres on top. Pricing
 * it from the same tier table is what keeps it honest — no second rate card to
 * drift out of step with the first.
 */
export function bundleOffer(bundle: Bundle, config: SiteConfig): BundleOffer {
  const totalMeters = bundle.meters + bundle.freeMeters;
  // Priced at the rate the whole length earns, not the paid part: prepaying for
  // 110 metres and then being charged the 100-metre rate made the largest
  // bundle cost more than buying the same film ad hoc.
  const { rate } = rateForMeters(totalMeters, config);
  const priceExcl = round2(bundle.meters * rate);
  const btw = round2(priceExcl * config.btwRate);

  // What the same length would cost bought normally.
  const plainExcl = round2(totalMeters * rate);

  return {
    ...bundle,
    totalMeters,
    rate,
    priceExcl,
    btw,
    priceIncl: round2(priceExcl + btw),
    effectiveRate: round2(priceExcl / totalMeters),
    savingExcl: round2(Math.max(0, plainExcl - priceExcl)),
  };
}

export function bundleOffers(config: SiteConfig): BundleOffer[] {
  return config.bundles.map((b) => bundleOffer(b, config));
}
