"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { useI18n } from "../providers";

const BuilderCanvas = dynamic(
  () => import("./builder-canvas").then((m) => m.BuilderCanvas),
  { ssr: false, loading: () => <div className="h-[420px] border border-border bg-surface" /> }
);

export function BuilderApp() {
  const { locale, t } = useI18n();
  useEffect(() => {
    void useBuilderStore.persist.rehydrate();
  }, []);
  const config = useSettingsStore((s) => s.config);
  const incl = useSettingsStore((s) => s.btwInclusive);
  const designs = useBuilderStore((s) => s.designs);
  const placed = useBuilderStore((s) => s.placed);
  const lengthMm = useBuilderStore((s) => s.lengthMm);
  const selectedId = useBuilderStore((s) => s.selectedId);
  const adding = useBuilderStore((s) => s.adding);
  const addFiles = useBuilderStore((s) => s.addFiles);
  const autoArrange = useBuilderStore((s) => s.autoArrange);
  const snapshot = useBuilderStore((s) => s.snapshot);
  const addLine = useCartStore((s) => s.addLine);
  const saveDraft = useCartStore((s) => s.saveDraft);
  const email = useSessionStore((s) => s.email);
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);
  const [trade, setTrade] = useState(false);

  const quote = useMemo(
    () => quoteFilm(designs.length ? lengthMm : 0, config, { trade, includeShipping: true }),
    [designs.length, lengthMm, config, trade]
  );

  const displayTotal = incl ? quote.totalIncl : quote.totalExcl;
  const filmRow = incl
    ? quote.subtotalExcl + Number((quote.subtotalExcl * config.btwRate).toFixed(2))
    : quote.subtotalExcl;
  const shipRow = incl
    ? quote.shipping + Number((quote.shipping * config.btwRate).toFixed(2))
    : quote.shipping;

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    try {
      await addFiles(Array.from(list), config);
    } catch (err) {
      console.error("addFiles failed", err);
    }
  }

  const rejected = useBuilderStore((s) => s.rejected) ?? [];
  const blocking = designs.some(
    (d) =>
      d.uploadError ||
      (d.warnings ?? []).some((w) => w.level === "red") ||
      rejected.includes(d.id)
  );

  function addToCart() {
    if (!designs.length || added || blocking) return;
    if (designs.some((d) => !d.storageKey)) return;
    addLine({
      id: crypto.randomUUID(),
      lengthMm,
      billedMeters: quote.billedMeters,
      rate: quote.rate,
      subtotalExcl: quote.subtotalExcl,
      trade,
      rush: false,
      designs: designs.map((d) => ({
        id: d.id,
        name: d.name,
        storageKey: d.storageKey,
        qty: d.qty,
        widthMm: d.widthMm,
        heightMm: d.heightMm,
      })),
      placed,
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

  const priceBlock = (
    <>
      <p className="num text-xs uppercase tracking-[0.2em] text-muted">{t.builder.priceLive}</p>
      <p className="num mt-3 text-3xl text-accent">{money(displayTotal, locale)}</p>
      <dl className="mt-6 grid gap-3 text-sm">
        <Row k={t.builder.metersUsed} v={(lengthMm / 1000).toFixed(3) + " m"} />
        <Row k={t.builder.billed} v={metersLabel(quote.billedMeters, locale)} />
        <Row k={t.builder.rate} v={`${money(quote.rate, locale)} / m · ${quote.tierLabel}`} />
        <Row k={t.builder.subtotal} v={money(filmRow, locale)} />
        {!incl && (
          <Row
            k={interpolate(t.builder.btw, { pct: Math.round(config.btwRate * 100) })}
            v={money(quote.btw, locale)}
          />
        )}
        <Row k={t.builder.shipping} v={money(shipRow, locale)} />
        <Row k={t.builder.total} v={money(displayTotal, locale)} />
      </dl>
      <label className="mt-3 flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={trade} onChange={(e) => setTrade(e.target.checked)} />
        {t.checkout.trade}
      </label>
      <button
        type="button"
        disabled={!designs.length || added || blocking}
        onClick={addToCart}
        className="mt-3 w-full bg-accent py-3 text-sm text-white disabled:opacity-40"
      >
        {added ? t.builder.added : t.builder.addCart}
      </button>
      {blocking && (
        <p className="mt-3 text-xs text-bad">
          Resolve red warnings or rejected files before checkout.
        </p>
      )}
      {added && (
        <Link
          href={localizedPath(locale, "/checkout")}
          className="mt-3 block w-full border border-border py-3 text-center text-sm"
        >
          {t.builder.checkout}
        </Link>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-3 pb-36 pt-8 md:px-4 lg:pb-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="num text-xs uppercase tracking-[0.2em] text-muted">
            {config.rollWidthMm / 10} cm
          </p>
          <h1 className="font-display mt-3 text-4xl md:text-5xl">{t.builder.title}</h1>
        </div>
        <p className="num text-3xl text-accent">{money(displayTotal, locale)}</p>
      </div>

      {rejected.length > 0 && (
        <p className="mb-6 border border-bad/40 bg-bad/10 px-3 py-3 text-sm text-bad">
          {rejected.length} design{rejected.length === 1 ? "" : "s"} will not fit the roll and
          cannot be checked out.
        </p>
      )}

      <p className="mb-6 text-sm text-muted md:hidden">{t.builder.mobileNote}</p>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside className="grid gap-3 self-start">
          <label className="grid cursor-pointer place-items-center border border-dashed border-border px-4 py-8 text-center text-sm">
            <span>{t.builder.drop}</span>
            <span className="mt-3 text-xs text-muted">{t.builder.or}</span>
            <span className="mt-3 bg-accent px-3 py-2 text-sm text-white">{t.builder.browse}</span>
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.tif,.tiff,.webp"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
          <button
            type="button"
            className="border border-border px-3 py-2 text-sm"
            onClick={async () => {
              const demos = makeDemoDesigns();
              const files: File[] = [];
              for (const d of demos) {
                const blob = await (await fetch(d.src)).blob();
                files.push(new File([blob], d.name, { type: "image/png" }));
              }
              try {
                await addFiles(files, config);
              } catch (err) {
                console.error("demo addFiles", err);
              }
            }}
          >
            {t.builder.demo}
          </button>
          {adding && <p className="text-xs text-muted">{t.common.sending}</p>}
          {designs.length === 0 && (
            <p className="text-sm text-muted">{fill(t.builder.empty, config, locale)}</p>
          )}
          <ul className="grid gap-3">
            {designs.map((d) => (
              <DesignCard key={d.id} design={d} selected={selectedId === d.id} />
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
          <CanvasGuard>
            <BuilderCanvas interactive />
          </CanvasGuard>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="bg-accent px-3 py-2 text-sm text-white"
              onClick={() => autoArrange(config)}
            >
              {t.builder.auto}
            </button>
            <button type="button" className="border border-border px-3 py-2 text-sm" onClick={onSave}>
              {saved ? t.builder.saved : t.builder.save}
            </button>
          </div>
        </section>

        <aside className="hidden self-start border border-border p-4 lg:sticky lg:top-28 lg:block">
          {priceBlock}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-3 lg:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <div>
            <p className="num text-lg text-accent">{money(displayTotal, locale)}</p>
            <p className="num text-xs text-muted">{metersLabel(quote.billedMeters, locale)}</p>
          </div>
          <button
            type="button"
            disabled={!designs.length || added || blocking}
            onClick={addToCart}
            className="bg-accent px-4 py-3 text-sm text-white disabled:opacity-40"
          >
            {added ? t.builder.added : t.builder.addCart}
          </button>
        </div>
      </div>
    </div>
  );
}

class CanvasGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-[420px] place-items-center border border-border bg-surface text-sm text-muted">
          Canvas failed to render. Reload the page.
        </div>
      );
    }
    return this.props.children;
  }
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-border pt-3">
      <dt className="text-muted">{k}</dt>
      <dd className="num">{v}</dd>
    </div>
  );
}

const PRESETS_CM = [10, 15, 20, 25, 30];

function DesignCard({ design, selected }: { design: Design; selected: boolean }) {
  const { t } = useI18n();
  const config = useSettingsStore((s) => s.config);
  const updateDesign = useBuilderStore((s) => s.updateDesign);
  const removeDesign = useBuilderStore((s) => s.removeDesign);
  const patchCopies = useBuilderStore((s) => s.patchCopies);
  const locked = useBuilderStore((s) => {
    const copies = s.placed.filter((p) => p.designId === design.id);
    return copies.length > 0 && copies.every((p) => p.locked);
  });
  const select = useBuilderStore((s) => s.select);
  const dpi = Math.round(effectiveDpi(design.pixelW, design.widthMm));
  const [garment, setGarment] = useState<"black" | "white" | "heather">("black");
  const [qtyDraft, setQtyDraft] = useState(String(design.qty));
  const [wDraft, setWDraft] = useState(String(Number((design.widthMm / 10).toFixed(1))));
  const [hDraft, setHDraft] = useState(String(Number((design.heightMm / 10).toFixed(1))));
  const qtyTimer = useRef<number | null>(null);

  useEffect(() => {
    setQtyDraft(String(design.qty));
    setWDraft(String(Number((design.widthMm / 10).toFixed(1))));
    setHDraft(String(Number((design.heightMm / 10).toFixed(1))));
  }, [design.qty, design.widthMm, design.heightMm]);

  useEffect(() => {
    return () => {
      if (qtyTimer.current) window.clearTimeout(qtyTimer.current);
    };
  }, []);

  return (
    <li
      className={`border p-3 ${selected ? "border-accent" : "border-border"}`}
      onClick={() => select(design.id)}
    >
      <div className="flex gap-3">
        <div className="checker h-14 w-14 overflow-hidden">
          {design.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.src} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="grid h-full place-items-center text-xs">—</div>
          )}
        </div>
        <div
          className="h-14 w-14 overflow-hidden"
          style={{
            background:
              garment === "black" ? "#1a1a1a" : garment === "white" ? "#f4f4f4" : "#8a8680",
          }}
        >
          {design.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.src} alt="" className="h-full w-full object-contain" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs">{design.name}</p>
          {design.uploadError && <p className="text-xs text-bad">{design.uploadError}</p>}
          <p className="num text-xs text-muted">
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
            value={wDraft}
            className="num mt-1 w-full border border-border bg-surface px-1 py-1"
            onChange={(e) => {
              setWDraft(e.target.value);
              const n = Number(e.target.value);
              if (n > 0) updateDesign(design.id, { widthMm: n * 10 }, config);
            }}
          />
          <span className="text-muted"> {t.builder.cm}</span>
        </label>
        <label>
          {t.builder.height}
          <input
            type="number"
            min={1}
            step={0.1}
            value={hDraft}
            className="num mt-1 w-full border border-border bg-surface px-1 py-1"
            onChange={(e) => {
              setHDraft(e.target.value);
              const n = Number(e.target.value);
              if (n > 0) updateDesign(design.id, { heightMm: n * 10 }, config);
            }}
          />
        </label>
        <label>
          {t.builder.qty}
          <input
            type="number"
            min={1}
            value={qtyDraft}
            className="num mt-1 w-full border border-border bg-surface px-1 py-1"
            onChange={(e) => {
              const raw = e.target.value;
              setQtyDraft(raw);
              if (qtyTimer.current) window.clearTimeout(qtyTimer.current);
              qtyTimer.current = window.setTimeout(() => {
                const n = Math.max(1, Math.floor(Number(raw)) || 1);
                updateDesign(design.id, { qty: n }, config);
              }, 350);
            }}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {PRESETS_CM.map((cm) => (
          <button
            key={cm}
            type="button"
            className="num border border-border px-1.5 py-0.5 text-xs"
            onClick={() => updateDesign(design.id, { widthMm: cm * 10 }, config)}
          >
            {cm}
          </button>
        ))}
        {(["black", "white", "heather"] as const).map((g) => (
          <button
            key={g}
            type="button"
            className={`px-1.5 py-0.5 text-xs ${garment === g ? "text-accent" : "text-muted"}`}
            onClick={() => setGarment(g)}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() =>
            updateDesign(
              design.id,
              {
                widthMm: design.heightMm,
                heightMm: design.widthMm,
                aspectRatio: 1 / design.aspectRatio,
                allowRotate: false,
              },
              config
            )
          }
        >
          {t.builder.rotate}
        </button>
        <button type="button" onClick={() => patchCopies(design.id, { locked: !locked }, config)}>
          {locked ? t.builder.unlock : t.builder.lock}
        </button>
        <button
          type="button"
          onClick={() => updateDesign(design.id, { qty: design.qty + 1 }, config)}
        >
          {t.builder.duplicate}
        </button>
        <button type="button" onClick={() => removeDesign(design.id, config)}>
          {t.builder.remove}
        </button>
      </div>
      {(design.warnings ?? []).map((w) => (
        <p
          key={w.code}
          className={`mt-3 text-xs ${
            w.level === "red" ? "text-bad" : w.level === "amber" ? "text-warn" : "text-muted"
          }`}
        >
          {t.builder[w.messageKey.replace("builder.", "") as keyof typeof t.builder] as string}
        </p>
      ))}
    </li>
  );
}
