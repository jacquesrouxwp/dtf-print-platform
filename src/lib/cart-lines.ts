import type { PlacedPiece } from "./nesting";
import { quoteFilm } from "./pricing";
import type { SiteConfig } from "./site-config";

export type CartLineDesign = {
  id: string;
  name: string;
  storageKey?: string;
  /** A preview the cart can still load tomorrow — never a blob: or data: URL. */
  previewUrl?: string;
  qty: number;
  widthMm: number;
  heightMm: number;
  trimBox?: { x: number; y: number; w: number; h: number };
};

export type CartLine = {
  /** The builder film's id: one film is one line, however often it is added. */
  id: string;
  /** The film's name in the builder, so the cart can say which film is which. */
  name?: string;
  lengthMm: number;
  billedMeters: number;
  rate: number;
  subtotalExcl: number;
  trade: boolean;
  rush: boolean;
  /** Gap this film was laid out and priced with. */
  gapMm?: number;
  designs: CartLineDesign[];
  placed: PlacedPiece[];
  createdAt: string;
};

/** The part of a builder film a cart line is made from. */
export type FilmLike = {
  id: string;
  name: string;
  lengthMm: number;
  payload: string;
  designCount: number;
};

/**
 * What the print depends on — sizes, quantities, files, positions, gap. A
 * renamed film or a refreshed preview is the same order; a moved piece is not.
 */
export function cartFingerprint(line: {
  lengthMm: number;
  gapMm?: number;
  designs: { id: string; qty: number; widthMm: number; heightMm: number; storageKey?: string }[];
  placed?: { id: string; xMm: number; yMm: number; rotation: number; flipX?: boolean }[];
}): string {
  const designs = line.designs
    .map((d) => `${d.id}:${d.qty}:${d.widthMm}x${d.heightMm}:${d.storageKey ?? ""}`)
    .join(",");
  const placed = (line.placed ?? [])
    .map((p) => `${p.id}:${p.xMm}:${p.yMm}:${p.rotation}:${p.flipX ? 1 : 0}`)
    .join(",");
  return `${line.lengthMm}|${line.gapMm ?? ""}|${designs}|${placed}`;
}

function durable(src?: string): string | undefined {
  if (!src || src.startsWith("blob:") || src.startsWith("data:")) return undefined;
  return src;
}

type SnapshotDesign = {
  id: string;
  name?: string;
  storageKey?: string;
  src?: string;
  previewUrl?: string;
  qty: number;
  widthMm: number;
  heightMm: number;
  trimBox?: { x: number; y: number; w: number; h: number };
};

/**
 * A builder film, priced and ready to sit in the cart. Null when there is
 * nothing to buy.
 *
 * A film saved without its own gap was laid out with the shop's default, and
 * that is the gap it keeps here. There is deliberately no way to pass another:
 * handing it the gap of whichever film happened to be open made every other
 * film look changed — and rewrote their lines — the moment one gap moved.
 */
export function lineFromFilm(
  film: FilmLike,
  config: SiteConfig,
  now: Date = new Date()
): CartLine | null {
  if (film.designCount <= 0 || film.lengthMm <= 0) return null;
  let parsed: { designs?: SnapshotDesign[]; placed?: PlacedPiece[]; gapMm?: number | null };
  try {
    parsed = JSON.parse(film.payload);
  } catch {
    return null;
  }
  const designs = parsed.designs ?? [];
  if (!designs.length) return null;
  const q = quoteFilm(film.lengthMm, config, { trade: false, includeShipping: false });
  return {
    id: film.id,
    name: film.name,
    lengthMm: film.lengthMm,
    billedMeters: q.billedMeters,
    rate: q.rate,
    subtotalExcl: q.subtotalExcl,
    trade: false,
    rush: false,
    gapMm: parsed.gapMm ?? config.gapMm,
    designs: designs.map((d) => ({
      id: d.id,
      name: d.name ?? "",
      storageKey: d.storageKey,
      previewUrl: durable(d.previewUrl) ?? durable(d.src),
      qty: d.qty,
      widthMm: d.widthMm,
      heightMm: d.heightMm,
      trimBox: d.trimBox,
    })),
    placed: parsed.placed ?? [],
    createdAt: now.toISOString(),
  };
}

export type CartStatus<F extends FilmLike> = {
  /** Films with something to buy that are not in the cart at all. */
  toAdd: F[];
  /** Films in the cart that have changed since they were added. */
  toUpdate: F[];
  /** Films in the cart exactly as they are now. */
  inCart: F[];
};

/**
 * Where each builder film stands against the cart. The add-to-cart button is
 * drawn from this rather than from a "was pressed once" flag — a flag cannot
 * know that the customer started a second film, or changed the first.
 */
export function cartStatus<F extends FilmLike>(
  films: (F | null | undefined)[],
  lines: CartLine[],
  config: SiteConfig
): CartStatus<F> {
  const out: CartStatus<F> = { toAdd: [], toUpdate: [], inCart: [] };
  const seen = new Set<string>();
  for (const film of films) {
    if (!film || seen.has(film.id)) continue;
    seen.add(film.id);
    const line = lineFromFilm(film, config);
    if (!line) continue;
    const fp = cartFingerprint(line);
    const own = lines.find((l) => l.id === film.id);
    if (own) {
      (cartFingerprint(own) === fp ? out.inCart : out.toUpdate).push(film);
      continue;
    }
    // Lines added before a line carried its film's id: identical content is
    // already in the cart, whatever its id says.
    if (lines.some((l) => cartFingerprint(l) === fp)) out.inCart.push(film);
    else out.toAdd.push(film);
  }
  return out;
}

/**
 * Put a film in the cart. The same film again replaces its own line, in place,
 * instead of sitting beside the old version — two versions of one film is a
 * double charge. Identical content under another id is not added twice.
 */
export function upsertLine(lines: CartLine[], line: CartLine): CartLine[] {
  const fp = cartFingerprint(line);
  const copy = { ...line, designs: line.designs.map((d) => ({ ...d })) };
  const i = lines.findIndex((l) => l.id === line.id);
  if (i >= 0) {
    const next = lines.slice();
    next[i] = { ...copy, createdAt: lines[i].createdAt };
    // An older line with the same content under another id is now a double.
    return next.filter((l, j) => j === i || cartFingerprint(l) !== fp);
  }
  if (lines.some((l) => cartFingerprint(l) === fp)) return lines;
  return [...lines, copy];
}
