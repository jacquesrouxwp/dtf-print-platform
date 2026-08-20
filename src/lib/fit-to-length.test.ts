import { describe, expect, it } from "vitest";
import { fitToLength, previousWholeMetreMm } from "./fit-to-length";
import { nest, type NestSource } from "./nesting";
import { rollFromSite } from "./roll";
import { defaultConfig } from "./site-config";

const roll = rollFromSite(defaultConfig);

/** A pile of identical pieces, sized so the layout spills past a metre. */
function pile(qty: number, w: number, h: number): NestSource[] {
  return [{ designId: "a", widthMm: w, heightMm: h, qty }];
}

function lengthOf(sources: NestSource[]) {
  return nest(sources, roll).usedLengthMm;
}

describe("fitToLength", () => {
  it("leaves a layout that already fits alone", () => {
    const sources = pile(4, 150, 150);
    const target = 2000;
    const fit = fitToLength(sources, roll, target);
    expect(fit?.scale).toBe(1);
    expect(fit?.usedLengthMm).toBeLessThanOrEqual(target);
  });

  it("shrinks a layout that spills past the metre until it fits", () => {
    const sources = pile(18, 170, 170);
    const before = lengthOf(sources);
    expect(before).toBeGreaterThan(1000);

    const fit = fitToLength(sources, roll, 1000);
    expect(fit).not.toBeNull();
    expect(fit!.scale).toBeLessThan(1);
    expect(fit!.usedLengthMm).toBeLessThanOrEqual(1000);
    expect(fit!.originalLengthMm).toBe(before);
  });

  it("finds a scale close to the largest that fits", () => {
    const sources = pile(18, 170, 170);
    const fit = fitToLength(sources, roll, 1000)!;
    // A nudge upwards must break it, or the answer was not the largest.
    const bigger = nest(
      sources.map((s) => ({
        ...s,
        widthMm: s.widthMm * (fit.scale + 0.02),
        heightMm: s.heightMm * (fit.scale + 0.02),
      })),
      roll
    );
    expect(bigger.usedLengthMm).toBeGreaterThan(1000);
  });

  it("refuses rather than shrinking artwork past the floor", () => {
    // Far too much film for one metre: fitting would mean a fraction of the size.
    const fit = fitToLength(pile(120, 200, 200), roll, 1000);
    expect(fit).toBeNull();
  });

  it("honours a caller's own floor", () => {
    const gentle = fitToLength(pile(18, 170, 170), roll, 1000, { minScale: 0.99 });
    expect(gentle).toBeNull();
  });

  it("never returns a layout with rejected pieces", () => {
    const fit = fitToLength(pile(6, 400, 300), roll, 1000);
    if (fit) expect(fit.usedLengthMm).toBeLessThanOrEqual(1000);
  });

  it("has nothing to do with an empty film", () => {
    expect(fitToLength([], roll, 1000)).toBeNull();
  });
});

describe("previousWholeMetreMm", () => {
  it("names the metre a layout is spilling over", () => {
    expect(previousWholeMetreMm(1060)).toBe(1000);
    expect(previousWholeMetreMm(2340)).toBe(2000);
  });

  it("leaves a layout under a metre alone", () => {
    expect(previousWholeMetreMm(400)).toBeNull();
    expect(previousWholeMetreMm(999)).toBeNull();
  });

  it("does not ask a layout already on the metre to shrink", () => {
    expect(previousWholeMetreMm(1000)).toBeNull();
    expect(previousWholeMetreMm(2000)).toBe(1000);
  });
});
