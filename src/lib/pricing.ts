import type { SiteConfig } from "./site-config";

export type PriceBreakdown = {
  lengthMm: number;
  billedMeters: number;
  rate: number;
  tierLabel: string;
  subtotalExcl: number;
  btw: number;
  shipping: number;
  totalExcl: number;
  totalIncl: number;
  tradeApplied: boolean;
};

export function metersFromLength(lengthMm: number, config: SiteConfig): number {
  const rawM = Math.max(0, lengthMm) / 1000;
  const increment = config.roundingM > 0 ? config.roundingM : 0.1;
  const rounded = Math.ceil(rawM / increment - 1e-9) * increment;
  return Math.max(config.minOrderM, Number(rounded.toFixed(3)));
}

export function rateForMeters(meters: number, config: SiteConfig): {
  rate: number;
  tierLabel: string;
} {
  let lower = 0;
  for (const tier of config.priceTiers) {
    const upper = tier.upToMeters;
    if (upper === null || meters <= upper) {
      const label = upper === null ? `${lower}+ m` : `${lower}–${upper} m`;
      return { rate: tier.pricePerMeter, tierLabel: label };
    }
    lower = upper;
  }
  const last = config.priceTiers[config.priceTiers.length - 1];
  return { rate: last.pricePerMeter, tierLabel: `${lower}+ m` };
}

export function quoteFilm(lengthMm: number, config: SiteConfig, opts?: {
  trade?: boolean;
  rush?: boolean;
  includeShipping?: boolean;
}): PriceBreakdown {
  const billedMeters = metersFromLength(lengthMm, config);
  const { rate: baseRate, tierLabel } = rateForMeters(billedMeters, config);
  const tradeApplied = Boolean(opts?.trade);
  let rate = baseRate;
  if (tradeApplied) rate = Number((rate * (1 - config.tradeDiscount)).toFixed(4));
  if (opts?.rush) rate = Number((rate * (1 + config.rushSurcharge)).toFixed(4));

  const subtotalExcl = Number((billedMeters * rate).toFixed(2));
  const btw = Number((subtotalExcl * config.btwRate).toFixed(2));
  const includeShipping = opts?.includeShipping !== false;
  const shipping =
    includeShipping && subtotalExcl > 0 && subtotalExcl < config.freeShippingFrom
      ? config.shippingCost
      : 0;
  const totalExcl = Number((subtotalExcl + shipping).toFixed(2));
  const shippingBtw = Number((shipping * config.btwRate).toFixed(2));
  const totalIncl = Number((subtotalExcl + btw + shipping + shippingBtw).toFixed(2));

  return {
    lengthMm,
    billedMeters,
    rate,
    tierLabel,
    subtotalExcl,
    btw,
    shipping,
    totalExcl,
    totalIncl,
    tradeApplied,
  };
}

export function money(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function metersLabel(value: number, locale: string): string {
  return `${new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-NL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)} m`;
}
