"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { effectiveDpi } from "@/lib/artwork";
import { makeDemoDesigns } from "@/lib/demo-art";
import { localizedPath } from "@/lib/i18n-config";
import { interpolate } from "@/lib/interpolate";
import { metersLabel, money, quoteFilm } from "@/lib/pricing";
import { fill } from "@/lib/tokens";
import { useBuilderStore, type Design } from "@/store/useBuilderStore";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSessionStore } from "@/store/useSessionStore";
import { Panel } from "../panel";
import { useI18n } from "../providers";

const BuilderCanvas = dynamic(
  () => import("./builder-canvas").then((m) => m.BuilderCanvas),
  { ssr: false, loading: () => <div className="h-[420px] border border-rule bg-paper-2" /> }
);

export function BuilderApp() {
  const { locale, t } = useI18n();
  const config = useSettingsStore((s) => s.config);
  const incl = useSettingsStore((s) => s.btwInclusive);
  const designs = useBuilderStore((s) => s.designs);
  const placed = useBuilderStore((s) => s.placed);
  const lengthMm = useBuilderStore((s) => s.lengthMm);
  const selectedId = useBuilderStore((s) => s.selectedId);
  const adding = useBuilderStore((s) => s.adding);
  const addFiles = useBuilderStore((s) => s.addFiles);
  const addDesigns = useBuilderStore((s) => s.addDesigns);
  const autoArrange = useBuilderStore((s) => s.autoArrange);
  const snapshot = useBuilderStore((s) => s.snapshot);
  const addLine = useCartStore((s) => s.addLine);
  const saveDraft = useCartStore((s) => s.saveDraft);
  const email = useSessionStore((s) => s.email);
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);
  const [trade, setTrade] = useState(false);

  const quote = useMemo(
    () => quoteFilm(lengthMm, config, { trade, includeShipping: true }),
    [lengthMm, config, trade]
  );

  const displayTotal = incl ? quote.totalIncl : quote.totalExcl;
  const displaySub = incl ? quote.subtotalExcl + quote.btw : quote.subtotalExcl;

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    await addFiles(Array.from(list), config);
  }

  function addToCart() {
    if (!designs.length) return;
    addLine({
      id: crypto.randomUUID(),
      lengthMm,
      billedMeters: quote.billedMeters,
      rate: quote.rate,
      subtotalExcl: quote.subtotalExcl,
      trade,
      rush: false,
      designs: designs.map((d) => ({
        name: d.name,
        qty: d.qty,
        widthMm: d.widthMm,
        heightMm: d.heightMm,
      })),
      placed,
      preview: designs[0]?.src,
      createdAt: new Date().toISOString(),
    });
    setAdded(true);
  }

  function onSave() {
    saveDraft({
      id: crypto.randomUUID(),
      name: email ? `${email} · ${designs.length}` : `draft-${Date.now()}`,
      savedAt: new Date().toISOString(),
      payload: snapshot(),
    });
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 md:px-4">
      <Panel className="px-4 py-5 md:px-6 md:py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="num text-[11px] uppercase tracking-[0.22em] text-muted">
            {config.rollWidthMm / 10} cm
          </p>
          <h1 className="font-display text-4xl md:text-5xl">{t.builder.title}</h1>
        </div>
        <p className="num text-3xl text-accent">{money(displayTotal, locale)}</p>
      </div>

      <p className="mb-4 text-sm text-muted md:hidden">{t.builder.mobileNote}</p>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside className="grid gap-3 self-start">
          <label className="grid cursor-pointer place-items-center border border-dashed border-ink px-4 py-8 text-center text-sm">
            <span>{t.builder.drop}</span>
            <span className="mt-2 text-xs text-muted">{t.builder.or}</span>
            <span className="mt-2 underline">{t.builder.browse}</span>
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.tif,.tiff,.pdf,.webp"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
          <button
            type="button"
            className="border border-rule px-3 py-2 text-sm"
            onClick={() => addDesigns(makeDemoDesigns(), config)}
          >
            {t.builder.demo}
          </button>
          {adding && <p className="text-xs text-muted">{t.common.sending}</p>}
          {designs.length === 0 && (
            <p className="text-sm text-muted">
              {fill(t.builder.empty, config, locale)}
            </p>
          )}
          <ul className="grid gap-3">
            {designs.map((d) => (
              <DesignCard
                key={d.id}
                design={d}
                selected={selectedId === d.id}
              />
            ))}
          </ul>
        </aside>

        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
        >
          <BuilderCanvas interactive />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="bg-ink px-3 py-2 text-sm text-paper"
              onClick={() => autoArrange(config)}
            >
              {t.builder.auto}
            </button>
            <button type="button" className="border border-rule px-3 py-2 text-sm" onClick={onSave}>
              {saved ? t.builder.saved : t.builder.save}
            </button>
          </div>
        </section>

        <aside className="border border-rule p-4 self-start lg:sticky lg:top-28">
          <p className="num text-[11px] uppercase tracking-[0.2em] text-muted">
            {t.builder.priceLive}
          </p>
          <p className="num mt-2 text-4xl text-accent">{money(displayTotal, locale)}</p>
          <dl className="mt-5 grid gap-2 text-sm">
            <Row k={t.builder.metersUsed} v={(lengthMm / 1000).toFixed(3) + " m"} />
            <Row k={t.builder.billed} v={metersLabel(quote.billedMeters, locale)} />
            <Row k={t.builder.rate} v={`${money(quote.rate, locale)} / m · ${quote.tierLabel}`} />
            <Row k={t.builder.subtotal} v={money(displaySub, locale)} />
            <Row
              k={interpolate(t.builder.btw, { pct: Math.round(config.btwRate * 100) })}
              v={money(quote.btw, locale)}
            />
            <Row k={t.builder.shipping} v={money(quote.shipping, locale)} />
            <Row k={t.builder.total} v={money(displayTotal, locale)} />
          </dl>
          <label className="mt-4 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={trade}
              onChange={(e) => setTrade(e.target.checked)}
            />
            {t.checkout.trade}
          </label>
          <button
            type="button"
            disabled={!designs.length}
            onClick={addToCart}
            className="mt-4 w-full bg-accent py-3 text-sm text-white disabled:opacity-40"
          >
            {added ? t.builder.added : t.builder.addCart}
          </button>
          {added && (
            <Link
              href={localizedPath(locale, "/checkout")}
              className="mt-2 block w-full border border-ink py-3 text-center text-sm"
            >
              {t.builder.checkout}
            </Link>
          )}
        </aside>
      </div>
      </Panel>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-rule pt-2">
      <dt className="text-muted">{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  );
}

function DesignCard({ design, selected }: { design: Design; selected: boolean }) {
  const { t } = useI18n();
  const config = useSettingsStore((s) => s.config);
  const updateDesign = useBuilderStore((s) => s.updateDesign);
  const removeDesign = useBuilderStore((s) => s.removeDesign);
  const select = useBuilderStore((s) => s.select);
  const dpi = Math.round(effectiveDpi(design.pixelW, design.widthMm));

  return (
    <li
      className={`border p-3 ${selected ? "border-accent" : "border-rule"}`}
      onClick={() => select(design.id)}
    >
      <div className="flex gap-3">
        <div className="checker h-14 w-14 overflow-hidden">
          {design.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.src} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="grid h-full place-items-center text-[10px]">PDF</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs">{design.name}</p>
          <p className="num text-[10px] text-muted">
            {t.builder.dpi} {dpi}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <label>
          {t.builder.width}
          <input
            type="number"
            min={1}
            step={0.1}
            value={Number((design.widthMm / 10).toFixed(1))}
            className="num mt-1 w-full border border-rule bg-paper px-1 py-1"
            onChange={(e) =>
              updateDesign(design.id, { widthMm: Number(e.target.value) * 10 }, config)
            }
          />
          <span className="text-muted"> {t.builder.cm}</span>
        </label>
        <label>
          {t.builder.height}
          <input
            type="number"
            min={1}
            step={0.1}
            value={Number((design.heightMm / 10).toFixed(1))}
            className="num mt-1 w-full border border-rule bg-paper px-1 py-1"
            onChange={(e) =>
              updateDesign(design.id, { heightMm: Number(e.target.value) * 10 }, config)
            }
          />
        </label>
        <label>
          {t.builder.qty}
          <input
            type="number"
            min={1}
            value={design.qty}
            className="num mt-1 w-full border border-rule bg-paper px-1 py-1"
            onChange={(e) =>
              updateDesign(design.id, { qty: Math.max(1, Number(e.target.value)) }, config)
            }
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        <button
          type="button"
          onClick={() =>
            updateDesign(
              design.id,
              { rotation: design.rotation === 90 ? 0 : 90 },
              config
            )
          }
        >
          {t.builder.rotate}
        </button>
        <button
          type="button"
          onClick={() => updateDesign(design.id, { locked: !design.locked }, config)}
        >
          {design.locked ? t.builder.unlock : t.builder.lock}
        </button>
        <button
          type="button"
          onClick={() =>
            updateDesign(design.id, { qty: design.qty + 1 }, config)
          }
        >
          {t.builder.duplicate}
        </button>
        <button type="button" onClick={() => removeDesign(design.id, config)}>
          {t.builder.remove}
        </button>
      </div>
      {design.warnings.map((w) => (
        <p
          key={w.code}
          className={`mt-2 text-[11px] ${
            w.level === "red" ? "text-bad" : w.level === "amber" ? "text-warn" : "text-muted"
          }`}
        >
          {t.builder[w.messageKey.replace("builder.", "") as keyof typeof t.builder] as string}
        </p>
      ))}
    </li>
  );
}
