export type PriceTier = {
  upToMeters: number | null;
  pricePerMeter: number;
};

export type SiteConfig = {
  brandName: string;
  legalName: string;
  tagline: string;
  city: string;
  country: string;
  countryCode: string;
  email: string;
  phone: string;
  /** WhatsApp number; falls back to `phone` when empty. */
  whatsapp: string;
  addressLine: string;
  kvk: string;
  btwNumber: string;
  rollWidthMm: number;
  cutoffHour: number;
  cutoffMinute: number;
  timezone: string;
  priceTiers: PriceTier[];
  btwRate: number;
  minOrderM: number;
  roundingM: number;
  minOrderMm: number;
  lengthIncrementMm: number;
  outputDpi: number;
  gapMm: number;
  edgeMm: number;
  pressTempC: number;
  pressTimeSec: number;
  peel: "cold" | "hot";
  washCycles: number;
  minLineMm: number;
  minTextPt: number;
  shippingCost: number;
  /** Prepaid metre bundles: pay for `meters`, receive `meters + freeMeters`. */
  bundles: { meters: number; freeMeters: number }[];
  freeShippingFrom: number;
  tradeDiscount: number;
  rushSurcharge: number;
  pickupEnabled: boolean;
  uvDtfAtLaunch: boolean;
  placeholdersConfirmed: boolean;
};

/** Working defaults until the client confirms section-14 answers. */
export const defaultConfig: SiteConfig = {
  brandName: "HLV",
  legalName: "HLV Transfers",
  tagline: "Where art meets industry.",
  city: "Hilversum",
  country: "Netherlands",
  countryCode: "NL",
  email: "orders@hlv.film",
  phone: "+31 35 000 0000",
  whatsapp: "+31 6 0000 0000",
  addressLine: "Hilversum, Netherlands",
  kvk: "00000000",
  btwNumber: "NL000000000B01",
  rollWidthMm: 550,
  cutoffHour: 16,
  cutoffMinute: 0,
  timezone: "Europe/Amsterdam",
  priceTiers: [
    // Benchmarked against the Madrid trade rate, plus 10%.
    { upToMeters: 10, pricePerMeter: 11.0 },
    { upToMeters: 30, pricePerMeter: 10.45 },
    { upToMeters: 50, pricePerMeter: 9.9 },
    { upToMeters: 100, pricePerMeter: 9.35 },
    { upToMeters: null, pricePerMeter: 8.25 },
  ],
  btwRate: 0.21,
  minOrderM: 0.5,
  roundingM: 0.1,
  minOrderMm: 500,
  lengthIncrementMm: 100,
  outputDpi: 300,
  gapMm: 4,
  edgeMm: 10,
  pressTempC: 150,
  pressTimeSec: 15,
  peel: "cold",
  washCycles: 50,
  minLineMm: 0.5,
  minTextPt: 6,
  shippingCost: 6.95,
  bundles: [
    { meters: 5, freeMeters: 0 },
    { meters: 10, freeMeters: 1 },
    { meters: 30, freeMeters: 3 },
    { meters: 50, freeMeters: 5 },
    { meters: 100, freeMeters: 10 },
  ],
  freeShippingFrom: 200,
  tradeDiscount: 0.1,
  rushSurcharge: 0.2,
  pickupEnabled: true,
  uvDtfAtLaunch: false,
  placeholdersConfirmed: false,
};

export const CONFIG_STORAGE_KEY = "hlv-site-config";

/** Merge a partial/stale persisted config onto defaults. Empty strings must not win. */
export function sanitizeConfig(partial?: Partial<SiteConfig> | null): SiteConfig {
  const next: SiteConfig = { ...defaultConfig, ...(partial ?? {}) };
  (Object.keys(defaultConfig) as (keyof SiteConfig)[]).forEach((key) => {
    const value = next[key];
    if (value === "" || value === undefined || value === null) {
      (next as Record<string, unknown>)[key as string] = defaultConfig[key];
    }
  });
  if (!Number.isFinite(next.rollWidthMm) || next.rollWidthMm <= 0) {
    next.rollWidthMm = defaultConfig.rollWidthMm;
  }
  if (!Number.isFinite(next.cutoffHour)) next.cutoffHour = defaultConfig.cutoffHour;
  if (!Number.isFinite(next.cutoffMinute)) next.cutoffMinute = defaultConfig.cutoffMinute;
  if (!Array.isArray(next.priceTiers) || next.priceTiers.length === 0) {
    next.priceTiers = defaultConfig.priceTiers;
  }
  return next;
}

export function formatCutoff(config: SiteConfig, locale: string): string {
  const h = String(config.cutoffHour).padStart(2, "0");
  const m = String(config.cutoffMinute).padStart(2, "0");
  return locale === "nl" ? `${h}:${m}` : `${h}:${m}`;
}

export function rollWidthCm(config: SiteConfig): number {
  return config.rollWidthMm / 10;
}
