"use client";

import type { CartLine } from "@/lib/cart-lines";
import { metersLabel, money } from "@/lib/pricing";

export type CartLineLabels = {
  film: string;
  remove: string;
  pieces: string;
  excl: string;
};

/**
 * One film in the cart, shown as what it is: the layout that will be printed,
 * its length and price, and every design on it with its size and quantity.
 * "Film · 5 files" told the customer nothing they could check.
 */
export function CartLineCard({
  line,
  index,
  rollWidthMm,
  locale,
  labels,
  onRemove,
}: {
  line: CartLine;
  index: number;
  rollWidthMm: number;
  locale: string;
  labels: CartLineLabels;
  onRemove: () => void;
}) {
  const pieces = line.placed.length || line.designs.reduce((n, d) => n + d.qty, 0);
  return (
    <li className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 border border-rule p-4 sm:grid-cols-[96px_minmax(0,1fr)]">
      <FilmMiniMap line={line} rollWidthMm={rollWidthMm} />
      <div className="min-w-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base">{line.name || `${labels.film} ${index + 1}`}</p>
            <p className="num text-xs text-muted">
              {rollWidthMm / 10} × {(line.lengthMm / 10).toFixed(1)} cm ·{" "}
              {metersLabel(line.billedMeters, locale)} · {pieces} {labels.pieces}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="num text-base">{money(line.subtotalExcl, locale)}</p>
            <p className="text-[11px] text-muted">{labels.excl}</p>
          </div>
        </div>
        <ul className="divide-y divide-rule border-y border-rule">
          {line.designs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2">
              <span className="checker grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md">
                {d.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.previewUrl} alt="" className="h-full w-full object-contain" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{d.name || "—"}</span>
              <span className="num shrink-0 text-xs text-muted">
                {(d.widthMm / 10).toFixed(1)} × {(d.heightMm / 10).toFixed(1)} cm
              </span>
              <span className="num w-10 shrink-0 text-right text-sm">× {d.qty}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="min-h-11 text-sm underline" onClick={onRemove}>
          {labels.remove}
        </button>
      </div>
    </li>
  );
}

/**
 * The film at a glance, drawn from the same positions the print file uses. The
 * transform mirrors the builder canvas — translate, rotate, then flip — so a
 * rotated or mirrored piece looks here the way it will come off the roll.
 */
function FilmMiniMap({ line, rollWidthMm }: { line: CartLine; rollWidthMm: number }) {
  const length = Math.max(1, line.lengthMm + 20);
  const byId = new Map(line.designs.map((d) => [d.id, d]));
  const tall = length / Math.max(1, rollWidthMm) > 3;
  return (
    <div
      className="checker relative max-h-56 self-start overflow-hidden rounded-md border border-rule"
      aria-hidden
    >
      <svg
        viewBox={`0 0 ${rollWidthMm} ${length}`}
        className="block h-auto w-full"
        preserveAspectRatio="xMidYMin meet"
      >
        {line.placed.map((p) => {
          const d = byId.get(p.designId);
          const rotated = p.rotation === 90;
          const flip = Boolean(p.flipX);
          const drawW = rotated ? p.heightMm : p.widthMm;
          const drawH = rotated ? p.widthMm : p.heightMm;
          const kx = rotated ? p.widthMm : flip ? drawW : 0;
          if (!d?.previewUrl) {
            return (
              <rect
                key={p.id}
                x={p.xMm}
                y={p.yMm}
                width={p.widthMm}
                height={p.heightMm}
                fill="rgba(226,43,18,0.25)"
                stroke="rgba(226,43,18,0.7)"
                strokeWidth={2}
              />
            );
          }
          return (
            <image
              key={p.id}
              href={d.previewUrl}
              width={drawW}
              height={drawH}
              preserveAspectRatio="none"
              transform={`translate(${p.xMm + kx} ${p.yMm}) rotate(${rotated ? 90 : 0}) scale(${flip ? -1 : 1} 1)`}
            />
          );
        })}
      </svg>
      {tall && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper to-transparent" />
      )}
    </div>
  );
}
