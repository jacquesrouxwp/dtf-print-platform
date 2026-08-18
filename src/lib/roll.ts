import type { SiteConfig } from "./site-config";

export type RollConfig = {
  widthMm: number;
  edgeMarginMm: number;
  itemGapMm: number;
  lengthIncrementMm: number;
  minOrderMm: number;
  outputDpi: number;
};

export function rollFromSite(config: SiteConfig): RollConfig {
  return {
    widthMm: config.rollWidthMm,
    edgeMarginMm: config.edgeMm,
    itemGapMm: config.gapMm,
    lengthIncrementMm: config.lengthIncrementMm,
    minOrderMm: config.minOrderMm,
    outputDpi: config.outputDpi,
  };
}
