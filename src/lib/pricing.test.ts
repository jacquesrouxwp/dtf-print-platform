import { describe, expect, it } from "vitest";
import { quoteFilm, rateForMeters } from "./pricing";
import { defaultConfig } from "./site-config";
import { billedLengthMm } from "./units";

describe("pricing", () => {
  it("2,347 mm used with 100 mm increment bills 2,400 mm", () => {
    expect(billedLengthMm(2347, 100, 500)).toBe(2400);
    const q = quoteFilm(2347, defaultConfig, { includeShipping: false });
    expect(q.billedMeters).toBe(2.4);
  });

  it("below minOrderMm bills at minOrderMm", () => {
    const q = quoteFilm(80, defaultConfig, { includeShipping: false });
    expect(q.billedMeters).toBe(0.5);
  });

  it("tier boundary 5.0 m and 5.01 m land correctly", () => {
    expect(rateForMeters(5, defaultConfig).rate).toBe(9.45);
    expect(rateForMeters(5.01, defaultConfig).rate).toBe(8.95);
  });

  it("ignores a client-supplied price — server recomputes", () => {
    const tampered = 0.01;
    const server = quoteFilm(2347, defaultConfig, { includeShipping: false });
    expect(server.subtotalExcl).not.toBe(tampered);
    expect(server.subtotalExcl).toBeCloseTo(2.4 * 9.45, 2);
  });
});
