import { describe, expect, it } from "vitest";
import { cartFingerprint, cartStatus, lineFromFilm, upsertLine, type FilmLike } from "./cart-lines";
import { defaultConfig } from "./site-config";

const cfg = defaultConfig;

function film(
  id: string,
  opts: { qty?: number; x?: number; name?: string; src?: string; gapMm?: number | null } = {}
): FilmLike {
  const qty = opts.qty ?? 2;
  return {
    id,
    name: opts.name ?? `Film ${id}`,
    lengthMm: 300,
    designCount: 1,
    payload: JSON.stringify({
      designs: [
        {
          id: `${id}-logo`,
          name: "logo.png",
          storageKey: `${id}-logo.png`,
          src: opts.src ?? "/api/files?key=logo-preview.png",
          qty,
          widthMm: 80,
          heightMm: 80,
        },
      ],
      placed: Array.from({ length: qty }, (_, i) => ({
        id: `${id}-p${i}`,
        designId: `${id}-logo`,
        xMm: (opts.x ?? 10) + i * 90,
        yMm: 10,
        widthMm: 80,
        heightMm: 80,
        rotation: 0,
      })),
      gapMm: opts.gapMm === undefined ? 4 : opts.gapMm,
    }),
  };
}

describe("lineFromFilm", () => {
  it("makes one line carrying the film's own id and name", () => {
    const line = lineFromFilm(film("f1", { name: "Film 1" }), cfg)!;
    expect(line.id).toBe("f1");
    expect(line.name).toBe("Film 1");
    expect(line.designs).toHaveLength(1);
    expect(line.placed).toHaveLength(2);
    expect(line.subtotalExcl).toBeGreaterThan(0);
  });

  it("keeps a durable preview for the cart and drops a blob URL", () => {
    expect(lineFromFilm(film("f1"), cfg)!.designs[0].previewUrl).toBe(
      "/api/files?key=logo-preview.png"
    );
    expect(lineFromFilm(film("f2", { src: "blob:https://x/1" }), cfg)!.designs[0].previewUrl).toBeUndefined();
  });

  it("has nothing to put in the cart for an empty or unreadable film", () => {
    expect(lineFromFilm({ ...film("f1"), designCount: 0 }, cfg)).toBeNull();
    expect(lineFromFilm({ ...film("f1"), payload: "{not json" }, cfg)).toBeNull();
  });

  it("gives a film saved without its own gap the shop default it was laid out with", () => {
    expect(lineFromFilm(film("f1", { gapMm: null }), cfg)!.gapMm).toBe(cfg.gapMm);
    expect(lineFromFilm(film("f1", { gapMm: 7 }), cfg)!.gapMm).toBe(7);
  });
});

describe("cartStatus", () => {
  it("offers a film that is not in the cart", () => {
    const s = cartStatus([film("f1")], [], cfg);
    expect(s.toAdd.map((f) => f.id)).toEqual(["f1"]);
  });

  it("knows a film that is in the cart unchanged", () => {
    const lines = [lineFromFilm(film("f1"), cfg)!];
    const s = cartStatus([film("f1")], lines, cfg);
    expect(s.inCart.map((f) => f.id)).toEqual(["f1"]);
    expect(s.toAdd).toHaveLength(0);
    expect(s.toUpdate).toHaveLength(0);
  });

  it("notices a film that changed after it was added", () => {
    const lines = [lineFromFilm(film("f1", { qty: 2 }), cfg)!];
    const s = cartStatus([film("f1", { qty: 3 })], lines, cfg);
    expect(s.toUpdate.map((f) => f.id)).toEqual(["f1"]);
  });

  it("offers a second film while the first stays in the cart", () => {
    const lines = [lineFromFilm(film("f1"), cfg)!];
    const s = cartStatus([film("f1"), film("f2")], lines, cfg);
    expect(s.inCart.map((f) => f.id)).toEqual(["f1"]);
    expect(s.toAdd.map((f) => f.id)).toEqual(["f2"]);
  });

  it("does not call a default-gap film changed when another film's gap moves", () => {
    // Film 1 was saved with the shop default; the customer then set 6 mm on film 2.
    const lines = [lineFromFilm(film("f1", { gapMm: null }), cfg)!];
    const s = cartStatus([film("f1", { gapMm: null }), film("f2", { gapMm: 6 })], lines, cfg);
    expect(s.inCart.map((f) => f.id)).toEqual(["f1"]);
    expect(s.toUpdate).toHaveLength(0);
  });

  it("treats a line added before lines carried a film id as in the cart", () => {
    const legacy = { ...lineFromFilm(film("f1"), cfg)!, id: "random-uuid" };
    expect(cartStatus([film("f1")], [legacy], cfg).inCart).toHaveLength(1);
  });

  it("ignores a renamed film: the print is the same", () => {
    const lines = [lineFromFilm(film("f1", { name: "Film 1" }), cfg)!];
    expect(cartStatus([film("f1", { name: "Hoodies" })], lines, cfg).inCart).toHaveLength(1);
  });
});

describe("upsertLine", () => {
  it("adds a new film as a new line", () => {
    const a = lineFromFilm(film("f1"), cfg)!;
    const b = lineFromFilm(film("f2", { x: 20 }), cfg)!;
    expect(upsertLine(upsertLine([], a), b).map((l) => l.id)).toEqual(["f1", "f2"]);
  });

  it("replaces a changed film in place instead of keeping both versions", () => {
    const v1 = lineFromFilm(film("f1", { qty: 2 }), cfg)!;
    const other = lineFromFilm(film("f2", { x: 20 }), cfg)!;
    const v2 = lineFromFilm(film("f1", { qty: 3 }), cfg)!;
    const lines = upsertLine(upsertLine(upsertLine([], v1), other), v2);
    expect(lines.map((l) => l.id)).toEqual(["f1", "f2"]);
    expect(lines[0].placed).toHaveLength(3);
    expect(lines[0].createdAt).toBe(v1.createdAt);
  });

  it("does not add identical content twice under another id", () => {
    const a = lineFromFilm(film("f1"), cfg)!;
    expect(upsertLine([a], { ...a, id: "other" })).toHaveLength(1);
  });

  it("clears a legacy double when the film is updated", () => {
    const v1 = lineFromFilm(film("f1"), cfg)!;
    const legacy = { ...v1, id: "random-uuid" };
    const lines = upsertLine([legacy, v1], v1);
    expect(lines.map((l) => l.id)).toEqual(["f1"]);
  });

  it("fingerprints what is printed, not the paperwork", () => {
    const a = lineFromFilm(film("f1", { name: "A" }), cfg)!;
    const b = { ...a, name: "B", createdAt: "later" };
    expect(cartFingerprint(a)).toBe(cartFingerprint(b));
  });
});
