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
  addressLine: "Hilversum, Netherlands",
  kvk: "00000000",
  btwNumber: "NL000000000B01",
  rollWidthMm: 550,
  cutoffHour: 16,
  cutoffMinute: 0,
  timezone: "Europe/Amsterdam",
  priceTiers: [
    { upToMeters: 5, pricePerMeter: 9.45 },
    { upToMeters: 10, pricePerMeter: 8.95 },
    { upToMeters: 25, pricePerMeter: 8.45 },
    { upToMeters: 50, pricePerMeter: 7.95 },
    { upToMeters: 100, pricePerMeter: 7.45 },
    { upToMeters: null, pricePerMeter: 6.95 },
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
  freeShippingFrom: 75,
  tradeDiscount: 0.1,
  rushSurcharge: 0.2,
  pickupEnabled: true,
  uvDtfAtLaunch: false,
  placeholdersConfirmed: false,
};

export const CONFIG_STORAGE_KEY = "hlv-site-config";

export function formatCutoff(config: SiteConfig, locale: string): string {
  const h = String(config.cutoffHour).padStart(2, "0");
  const m = String(config.cutoffMinute).padStart(2, "0");
  return locale === "nl" ? `${h}:${m}` : `${h}:${m}`;
}

export function rollWidthCm(config: SiteConfig): number {
  return config.rollWidthMm / 10;
}
