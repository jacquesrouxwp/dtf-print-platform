"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { printDpi } from "@/lib/artwork";
import { makeDemoDesigns } from "@/lib/demo-art";
import { localizedPath } from "@/lib/i18n-config";
import { interpolate } from "@/lib/interpolate";
import { metersLabel, money, quoteFilm } from "@/lib/pricing";
import { layoutAlerts } from "@/lib/layout-alerts";
import { fill } from "@/lib/tokens";
import { useBuilderStore, type Design } from "@/store/useBuilderStore";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useI18n } from "../providers";

const BuilderCanvas = dynamic(
  () => import("./builder-canvas").then((m) => m.BuilderCanvas),
  { ssr: false, loading: () => <div className="h-[420px] rounded-2xl border border-white/12 bg-white/5" /> }
);

export function BuilderApp() {
  const { locale, t } = useI18n();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = useBuilderStore.persist.onFinishHydration(() => setReady(true));
    void useBuilderStore.persist.rehydrate();
    if (useBuilderStore.persist.hasHydrated()) setReady(true);
    return unsub;
  }, []);
  const config = useSettingsStore((s) => s.config);
  const incl = useSettingsStore((s) => s.btwInclusive);
  const designs = useBuilderStore((s) => s.designs);
  const placed = useBuilderStore((s) => s.placed);
  const lengthMm = useBuilderStore((s) => s.lengthMm);
  const selectedId = useBuilderStore((s) => s.selectedId);
  const adding = useBuilderStore((s) => s.adding);
  const addFiles = useBuilderStore((s) => s.addFiles);
  const updateDesign = useBuilderStore((s) => s.updateDesign);
  const removeDesign = useBuilderStore((s) => s.removeDesign);
  const autoArrange = useBuilderStore((s) => s.autoArrange);
  const snapshot = useBuilderStore((s) => s.snapshot);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const canUndo = useBuilderStore((s) => s.canUndo);
  const canRedo = useBuilderStore((s) => s.canRedo);
  const rotatePiece = useBuilderStore((s) => s.rotatePiece);
  const flipPiece = useBuilderStore((s) => s.flipPiece);
  const removePiece = useBuilderStore((s) => s.removePiece);
  const patchPiece = useBuilderStore((s) => s.patchPiece);
  const addLine = useCartStore((s) => s.addLine);
  const saveDraft = useCartStore((s) => s.saveDraft);
  const email = useSessionStore((s) => s.email);
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);
  const [trade, setTrade] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const state = useBuilderStore.getState();
      const id = state.selectedId;
      if (!id) return;
      e.preventDefault();
      const piece = state.placed.find((p) => p.id === id);
      if (piece) state.removePiece(piece.id, config);
      else if (state.designs.some((d) => d.id === id)) state.removeDesign(id, config);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config]);

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
        trimBox: d.trimBox,
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

  const selectedPieceExact = placed.find((p) => p.id === selectedId) ?? null;
  const selectedPiece =
    selectedPieceExact ??
    placed.find((p) => p.designId === selectedId) ??
    null;
  const selectedDesign = selectedPiece
    ? designs.find((d) => d.id === selectedPiece.designId)
    : designs.find((d) => d.id === selectedId);
  const alerts = layoutAlerts(placed, config.rollWidthMm, config.edgeMm);

  const priceBlock = (
    <>
      <p className="num text-center text-xs uppercase tracking-[0.2em] text-muted">
        {t.builder.priceLive}
      </p>
      <p className="num mt-3 text-center text-3xl text-accent">{money(displayTotal, locale)}</p>
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
      <label className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={trade} onChange={(e) => setTrade(e.target.checked)} />
        {t.checkout.trade}
      </label>
      <button
        type="button"
        disabled={!designs.length || added || blocking}
        onClick={addToCart}
        className="btn btn-primary mt-4 w-full"
      >
        {added ? t.builder.added : t.builder.addCart}
      </button>
      {blocking && (
        <p className="mt-3 text-center text-xs text-bad">
          Resolve red warnings or rejected files before checkout.
        </p>
      )}
      {added && (
        <Link href={localizedPath(locale, "/checkout")} className="btn btn-ghost mt-3 w-full">
          {t.builder.checkout}
        </Link>
      )}
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[1760px] px-3 pb-36 pt-5 md:px-5 lg:pb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="num text-xs uppercase tracking-[0.2em] text-muted">
            {config.rollWidthMm / 10} cm
          </p>
          <h1 className="font-display mt-2 text-3xl md:text-4xl">{t.builder.title}</h1>
        </div>
        <p className="num text-3xl text-accent">{money(displayTotal, locale)}</p>
      </div>

      {rejected.length > 0 && (
        <p className="mb-6 rounded-2xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
          {rejected.length} design{rejected.length === 1 ? "" : "s"} will not fit the roll and
          cannot be checked out.
        </p>
      )}

      <p className="mb-6 text-sm text-muted md:hidden">{t.builder.mobileNote}</p>

      <div className="flex w-full min-w-0 flex-col items-stretch gap-4 lg:flex-row lg:items-start">
        <aside className="relative z-10 w-full shrink-0 lg:w-[300px] lg:flex-none lg:max-w-[300px] xl:w-[320px] xl:max-w-[320px]">
          <div className="glass flex flex-col gap-3 overflow-hidden rounded-[24px] p-3 lg:sticky lg:top-24">
            <label className="relative grid cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/5 px-3 py-4 text-center text-sm">
              <span className="text-sm leading-snug">{t.builder.drop}</span>
              <span className="mt-1 text-xs text-muted">{t.builder.or}</span>
              <span className="btn btn-primary mt-2 w-full max-w-[180px]">{t.builder.browse}</span>
              <input
                data-testid="builder-file"
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.tif,.tiff,.webp"
                disabled={!ready || adding}
                className="absolute inset-0 z-10 cursor-pointer opacity-0"
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-ghost w-full"
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
            {!ready && <p className="text-center text-xs text-muted">{t.builder.loading}</p>}
            {adding && <p className="text-center text-xs text-muted">{t.builder.uploading}</p>}
            {designs.length === 0 && (
              <p className="px-1 text-xs leading-relaxed text-muted">
                {fill(t.builder.empty, config, locale)}
              </p>
            )}
            <ul className="grid max-h-[58vh] gap-2 overflow-y-auto pr-0.5 lg:max-h-[calc(100vh-22rem)]">
              {designs.map((d) => (
                <LibraryItem
                  key={d.id}
                  design={d}
                  selected={selectedId === d.id || selectedDesign?.id === d.id}
                />
              ))}
            </ul>
          </div>
        </aside>

        <section
          className="relative z-0 min-w-0 flex-1 overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
        >
        <div className="glass min-w-0 overflow-hidden rounded-[24px] p-3 md:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <button type="button" className="btn-soft" disabled={!canUndo} onClick={undo}>
              {t.builder.undo}
            </button>
            <button type="button" className="btn-soft" disabled={!canRedo} onClick={redo}>
              {t.builder.redo}
            </button>
            <button type="button" className="btn-soft" onClick={() => autoArrange(config)}>
              {t.builder.nest}
            </button>
            <button
              type="button"
              className="btn-soft"
              disabled={!selectedPiece}
              onClick={() => selectedPiece && rotatePiece(selectedPiece.id)}
            >
              {t.builder.rotate}
            </button>
            <button
              type="button"
              className="btn-soft"
              disabled={!selectedPiece}
              onClick={() => selectedPiece && flipPiece(selectedPiece.id)}
            >
              {t.builder.flip}
            </button>
            <button
              type="button"
              className="btn-soft"
              disabled={!selectedDesign}
              onClick={() =>
                selectedDesign && updateDesign(selectedDesign.id, { qty: selectedDesign.qty + 1 }, config)
              }
            >
              {t.builder.copy}
            </button>
            <button
              type="button"
              className="btn-soft text-bad"
              disabled={!selectedPiece && !selectedDesign}
              onClick={() => {
                if (selectedPiece) removePiece(selectedPiece.id, config);
                else if (selectedDesign) removeDesign(selectedDesign.id, config);
              }}
            >
              {t.builder.remove}
            </button>
            <button type="button" className="btn-soft ml-auto" onClick={onSave}>
              {saved ? t.builder.saved : t.builder.save}
            </button>
            <label className="ml-1 flex items-center gap-2 text-xs text-muted">
              {t.builder.zoom}
              <input
                type="range"
                min={50}
                max={160}
                value={zoomPct}
                className="w-24"
                onChange={(e) => setZoomPct(Number(e.target.value))}
              />
              <span className="num w-10">{zoomPct}%</span>
            </label>
          </div>
          {alerts.overlap && (
            <p className="mb-2 rounded-xl bg-bad/15 px-3 py-2 text-sm text-bad">{t.builder.overlap}</p>
          )}
          {alerts.overflow && (
            <p className="mb-2 rounded-xl bg-warn/20 px-3 py-2 text-sm text-warn">{t.builder.overflow}</p>
          )}
          <p className="mb-2 text-center text-xs text-muted">{t.builder.deleteHint}</p>
          <CanvasGuard>
            <BuilderCanvas interactive zoomPct={zoomPct} />
          </CanvasGuard>
        </div>
        </section>

        <aside className="relative z-10 w-full shrink-0 lg:w-[300px] lg:flex-none lg:max-w-[300px] xl:w-[340px] xl:max-w-[340px]">
          <div className="sticky top-24 grid gap-3">
            <div className="glass overflow-hidden rounded-[24px] p-4">
              {selectedDesign ? (
                <PropertiesPanel
                  design={selectedDesign}
                  piece={selectedPieceExact}
                  onMove={(x, y) =>
                    selectedPieceExact &&
                    patchPiece(selectedPieceExact.id, { xMm: x, yMm: y, locked: true }, config)
                  }
                  onRemove={() => {
                    if (selectedPieceExact) removePiece(selectedPieceExact.id, config);
                    else if (selectedDesign) removeDesign(selectedDesign.id, config);
                  }}
                />
              ) : (
                <p className="text-sm leading-relaxed text-muted">{t.builder.selectHint}</p>
              )}
            </div>
            <div className="glass overflow-hidden rounded-[24px] p-5">{priceBlock}</div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
        <div className="glass mx-auto flex max-w-[1400px] items-center justify-between gap-3 rounded-2xl p-3">
          <div>
            <p className="num text-lg text-accent">{money(displayTotal, locale)}</p>
            <p className="num text-xs text-muted">{metersLabel(quote.billedMeters, locale)}</p>
          </div>
          <button
            type="button"
            disabled={!designs.length || added || blocking}
            onClick={addToCart}
            className="btn btn-primary"
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
        <div className="grid h-[420px] place-items-center rounded-2xl border border-white/12 bg-white/5 text-center text-sm text-muted">
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

function LibraryItem({ design, selected }: { design: Design; selected: boolean }) {
  const { t } = useI18n();
  const select = useBuilderStore((s) => s.select);
  const removeDesign = useBuilderStore((s) => s.removeDesign);
  const config = useSettingsStore((s) => s.config);
  return (
    <li
      className={`flex w-full min-w-0 items-stretch gap-1 rounded-2xl bg-white/5 p-2 ${
        selected ? "ring-1 ring-accent" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => select(design.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="checker h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          {design.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.src} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="grid h-full place-items-center text-xs text-muted">—</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug break-all">{design.name}</p>
          <p className="num mt-1 text-xs text-muted">
            {(design.widthMm / 10).toFixed(1)} × {(design.heightMm / 10).toFixed(1)} cm
            <span className="mx-1 text-white/20">·</span>×{design.qty}
          </p>
          {design.uploadError && (
            <p className="mt-0.5 text-[10px] leading-snug text-bad">{t.builder.uploadFailed}</p>
          )}
        </div>
      </button>
      <button
        type="button"
        className="btn-soft shrink-0 self-start px-2 text-bad"
        aria-label={t.builder.remove}
        onClick={() => removeDesign(design.id, config)}
      >
        ×
      </button>
    </li>
  );
}

function PropertiesPanel({
  design,
  piece,
  onMove,
  onRemove,
}: {
  design: Design;
  piece: ReturnType<typeof useBuilderStore.getState>["placed"][number] | null;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const config = useSettingsStore((s) => s.config);
  const updateDesign = useBuilderStore((s) => s.updateDesign);
  const resizePiece = useBuilderStore((s) => s.resizePiece);
  const printW = piece
    ? piece.rotation === 90
      ? piece.heightMm
      : piece.widthMm
    : design.widthMm;
  const printH = piece
    ? piece.rotation === 90
      ? piece.widthMm
      : piece.heightMm
    : design.heightMm;
  const dpi = Math.round(printDpi(design.pixelW, design.pixelH, printW, printH).dpi);
  const sizeW = piece?.widthMm ?? design.widthMm;
  const sizeH = piece?.heightMm ?? design.heightMm;
  const [wDraft, setWDraft] = useState(String(Number((sizeW / 10).toFixed(1))));
  const [hDraft, setHDraft] = useState(String(Number((sizeH / 10).toFixed(1))));
  const [qtyDraft, setQtyDraft] = useState(String(design.qty));
  const qtyTimer = useRef<number | null>(null);

  useEffect(() => {
    setQtyDraft(String(design.qty));
    setWDraft(String(Number((sizeW / 10).toFixed(1))));
    setHDraft(String(Number((sizeH / 10).toFixed(1))));
  }, [design.qty, sizeW, sizeH, piece?.id]);

  function commitSize(nextWmm: number | undefined, nextHmm: number | undefined) {
    const ratio = sizeW / Math.max(1, sizeH);
    const w = nextWmm && nextWmm > 0 ? nextWmm : nextHmm && nextHmm > 0 ? nextHmm * ratio : 0;
    const h = nextHmm && nextHmm > 0 ? nextHmm : nextWmm && nextWmm > 0 ? nextWmm / ratio : 0;
    if (!(w > 0) || !(h > 0)) return;
    if (piece) resizePiece(piece.id, w, h, config);
    else updateDesign(design.id, { widthMm: w, heightMm: h }, config);
  }

  return (
    <div>
      <p className="num text-xs uppercase tracking-[0.18em] text-muted">{t.builder.properties}</p>
      <div className="checker mt-3 aspect-[5/4] w-full overflow-hidden rounded-2xl">
        {design.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={design.src} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="grid h-full place-items-center text-xs text-muted">—</span>
        )}
      </div>
      <p className="mt-3 break-all text-sm leading-snug">{design.name}</p>
      <p className="mt-1 text-xs text-muted">{piece ? t.builder.thisCopy : t.builder.allCopies}</p>
      <p className={`num mt-1 text-xs ${dpi < 150 ? "text-bad" : dpi < 200 ? "text-warn" : "text-muted"}`}>
        {t.builder.dpi} {dpi}
        {dpi < 150 ? " BAD" : ""}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <label className="grid gap-1">
          <span className="text-muted">{t.builder.width}</span>
          <input
            type="number"
            min={1}
            step={0.1}
            value={wDraft}
            className="field num"
            onChange={(e) => {
              setWDraft(e.target.value);
              const n = Number(e.target.value);
              if (n > 0) commitSize(n * 10, undefined);
            }}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-muted">{t.builder.height}</span>
          <input
            type="number"
            min={1}
            step={0.1}
            value={hDraft}
            className="field num"
            onChange={(e) => {
              setHDraft(e.target.value);
              const n = Number(e.target.value);
              if (n > 0) commitSize(undefined, n * 10);
            }}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-muted">{t.builder.qty}</span>
          <input
            type="number"
            min={1}
            value={qtyDraft}
            className="field num"
            onChange={(e) => {
              const raw = e.target.value;
              setQtyDraft(raw);
              if (qtyTimer.current) window.clearTimeout(qtyTimer.current);
              qtyTimer.current = window.setTimeout(() => {
                updateDesign(design.id, { qty: Math.max(1, Math.floor(Number(raw)) || 1) }, config);
              }, 350);
            }}
          />
        </label>
        {piece && (
          <>
            <label className="grid gap-1">
              <span className="text-muted">{t.builder.xpos}</span>
              <input
                type="number"
                step={0.1}
                className="field num"
                value={Number((piece.xMm / 10).toFixed(1))}
                onChange={(e) => onMove(Number(e.target.value) * 10, piece.yMm)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-muted">{t.builder.ypos}</span>
              <input
                type="number"
                step={0.1}
                className="field num"
                value={Number((piece.yMm / 10).toFixed(1))}
                onChange={(e) => onMove(piece.xMm, Number(e.target.value) * 10)}
              />
            </label>
          </>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS_CM.map((cm) => (
          <button
            key={cm}
            type="button"
            className="btn-soft num"
            onClick={() => commitSize(cm * 10, undefined)}
          >
            {cm} {t.builder.cm}
          </button>
        ))}
      </div>
      <button type="button" className="btn-soft mt-4 w-full text-bad" onClick={onRemove}>
        {t.builder.remove}
      </button>
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
    </div>
  );
}
