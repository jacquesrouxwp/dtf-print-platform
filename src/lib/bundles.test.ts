import { describe, expect, it } from "vitest";
import { bundleOffer, bundleOffers } from "./bundles";
import { rateForMeters } from "./pricing";
import { defaultConfig } from "./site-config";

const cfg = defaultConfig;

describe("bundleOffer", () => {
  it("charges the tier rate the whole length earns", () => {
    const offer = bundleOffer({ meters: 30, freeMeters: 3 }, cfg);
    expect(offer.rate).toBe(rateForMeters(33, cfg).rate);
    expect(offer.priceExcl).toBeCloseTo(30 * offer.rate, 2);
  });

  it("hands over the free metres on top", () => {
    expect(bundleOffer({ meters: 50, freeMeters: 5 }, cfg).totalMeters).toBe(55);
  });

  it("works out what a metre really costs", () => {
    const offer = bundleOffer({ meters: 10, freeMeters: 1 }, cfg);
    expect(offer.effectiveRate).toBeCloseTo(offer.priceExcl / 11, 2);
    expect(offer.effectiveRate).toBeLessThan(offer.rate);
  });

  it("a bundle with no free metres is simply prepayment", () => {
    const offer = bundleOffer({ meters: 5, freeMeters: 0 }, cfg);
    expect(offer.effectiveRate).toBe(offer.rate);
    expect(offer.savingExcl).toBe(0);
  });

  it("adds BTW on top rather than folding it in", () => {
    const offer = bundleOffer({ meters: 10, freeMeters: 1 }, cfg);
    expect(offer.btw).toBeCloseTo(offer.priceExcl * cfg.btwRate, 2);
    expect(offer.priceIncl).toBeCloseTo(offer.priceExcl + offer.btw, 2);
  });

  it("is never worse than buying the same film ad hoc", () => {
    for (const offer of bundleOffers(cfg)) {
      expect(offer.savingExcl).toBeCloseTo(offer.freeMeters * offer.rate, 2);
      expect(offer.effectiveRate).toBeLessThanOrEqual(offer.rate);
    }
  });

  it("offers every bundle in the config, in order", () => {
    const offers = bundleOffers(cfg);
    expect(offers).toHaveLength(cfg.bundles.length);
    expect(offers.map((o) => o.meters)).toEqual(cfg.bundles.map((b) => b.meters));
  });
});
