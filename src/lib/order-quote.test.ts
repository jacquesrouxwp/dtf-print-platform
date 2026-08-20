import { describe, expect, it } from "vitest";
import { authoritativeOrderQuote, type OrderFilm } from "./order-quote";
import { authoritativeQuote } from "./server-quote";
import { quoteFilm } from "./pricing";
import { defaultConfig } from "./site-config";

const cfg = defaultConfig;

/** Two films, each holding one locked piece at the same spot on its own film. */
function twoFilms(): OrderFilm[] {
  const piece = (id: string) => ({
    designId: id,
    widthMm: 200,
    heightMm: 150,
    qty: 1,
    instances: [
      { id: `${id}1`, locked: true, xMm: 10, yMm: 10, rotation: 0 as const, widthMm: 200, heightMm: 150 },
    ],
  });
  return [
    { id: "film-a", sources: [piece("a")] },
    { id: "film-b", sources: [piece("b")] },
  ];
}

describe("authoritativeOrderQuote", () => {
  it("bills each film separately, matching what the builder showed", () => {
    const order = authoritativeOrderQuote(twoFilms(), cfg, { includeShipping: false });
    const one = quoteFilm(170, cfg, { includeShipping: false });
    expect(order.total.subtotalExcl).toBeCloseTo(one.subtotalExcl * 2, 2);
    expect(order.films).toHaveLength(2);
  });

  it("does not merge films into one sheet", () => {
    const order = authoritativeOrderQuote(twoFilms(), cfg, { includeShipping: false });
    for (const film of order.films) {
      expect(film.layout.items).toHaveLength(1);
    }
  });

  it("keeps the per-film minimum order instead of pooling it", () => {
    const order = authoritativeOrderQuote(twoFilms(), cfg, { includeShipping: false });
    for (const film of order.films) {
      expect(film.layout.billedLengthMm).toBeGreaterThanOrEqual(cfg.minOrderMm);
    }
  });

  it("charges shipping once for the order, not once per film", () => {
    const order = authoritativeOrderQuote(twoFilms(), cfg, { includeShipping: true });
    expect(order.total.shipping).toBe(
      order.total.subtotalExcl < cfg.freeShippingFrom ? cfg.shippingCost : 0
    );
  });

  it("is the fix for the merged-sheet undercharge", () => {
    const films = twoFilms();
    const flat = films.flatMap((f) => f.sources);
    const merged = authoritativeQuote(flat, cfg, { includeShipping: false });
    const perFilm = authoritativeOrderQuote(films, cfg, { includeShipping: false });

    // The old path nests both films onto one sheet — same billed length as a
    // single film, so the order is charged for half of what was quoted.
    expect(merged.quote.subtotalExcl).toBeLessThan(perFilm.total.subtotalExcl);

    // And it stacks the two pieces on the same coordinates.
    const [p, q] = merged.layout.items;
    const overlaps =
      p.xMm < q.xMm + q.widthMm &&
      q.xMm < p.xMm + p.widthMm &&
      p.yMm < q.yMm + q.heightMm &&
      q.yMm < p.yMm + p.heightMm;
    expect(overlaps).toBe(true);
  });

  it("surfaces rejected designs from every film", () => {
    const order = authoritativeOrderQuote(
      [
        { id: "ok", sources: [{ designId: "a", widthMm: 100, heightMm: 100, qty: 1 }] },
        { id: "bad", sources: [{ designId: "huge", widthMm: 9000, heightMm: 9000, qty: 1 }] },
      ],
      cfg,
      { includeShipping: false }
    );
    expect(order.rejected).toContain("huge");
  });

  it("returns a zero order for no films", () => {
    const order = authoritativeOrderQuote([], cfg, { includeShipping: true });
    expect(order.total.subtotalExcl).toBe(0);
    expect(order.total.totalIncl).toBe(0);
    expect(order.total.shipping).toBe(0);
  });
});
