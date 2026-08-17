import type { SiteConfig } from "./site-config";
import { formatCutoff, rollWidthCm } from "./site-config";
import { money } from "./pricing";

export function copyVars(config: SiteConfig, locale: string) {
  return {
    cutoff: formatCutoff(config, locale),
    width: String(rollWidthCm(config)),
    temp: String(config.pressTempC),
    time: String(config.pressTimeSec),
    peel: config.peel,
    wash: String(config.washCycles),
    line: String(config.minLineMm),
    text: String(config.minTextPt),
    round: String(config.roundingM),
    min: String(config.minOrderM),
    ship: money(config.shippingCost, locale),
    free: money(config.freeShippingFrom, locale),
    pct: String(Math.round(config.tradeDiscount * 100)),
  };
}

export function fill(template: string, config: SiteConfig, locale: string) {
  const vars = copyVars(config, locale);
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key as keyof typeof vars] !== undefined
      ? String(vars[key as keyof typeof vars])
      : `{${key}}`
  );
}
