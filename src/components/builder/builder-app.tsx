"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Image as ImageIcon, Type } from "lucide-react";
import { printDpi } from "@/lib/artwork";
import { makeDemoDesigns } from "@/lib/demo-art";
import { localizedPath } from "@/lib/i18n-config";
import { filmsCount } from "@/lib/plural";
import { metersLabel, money, quoteFilm } from "@/lib/pricing";
import { layoutAlerts } from "@/lib/layout-alerts";
import { defaultTextSpec, rasterizeText, type TextAlign, type TextSpec } from "@/lib/raster-text";
import { fill } from "@/lib/tokens";
import { useBuilderStore, type Design } from "@/store/useBuilderStore";
import { useCartStore } from "@/store/useCartStore";
import { useJobStore, type JobFilm } from "@/store/useJobStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useI18n } from "../providers";

const BuilderCanvas = dynamic(
  () => import("./builder-canvas").then((m) => m.BuilderCanvas),
  { ssr: false, loading: () => <div className="h-full min-h-[420px] rounded-xl bg-white/5" /> }
);

type LeftTab = "images" | "text";

const PRESETS_CM = [10, 15, 20, 25, 30];
const TEXT_COLORS = [
  { id: "white", hex: "#f4f0e6" },
  { id: "black", hex: "#14110e" },
  { id: "red", hex: "#e22b12" },
];
const TEXT_FONTS = [
  { id: "sans", family: "system-ui, sans-serif" },
  { id: "serif", family: "Georgia, 'Times New Roman', serif" },
  { id: "mono", family: "ui-monospace, monospace" },
];

export function BuilderApp() {
  const { locale, t } = useI18n();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<LeftTab>("images");
  const [query, setQuery] = useState("");
  const [zoomPct, setZoomPct] = useState(100);
  const [trade, setTrade] = useState(false);
  const [added, setAdded] = useState(false);
  const [text, setText] = useState("");
  const [fontPx, setFontPx] = useState(72);
  const [fontId, setFontId] = useState("sans");
  const [colorId, setColorId] = useState("white");

  useEffect(() => {
    const unsub = useBuilderStore.persist.onFinishHydration(() => setReady(true));
    void useBuilderStore.persist.rehydrate();
    if (useBuilderStore.persist.hasHydrated()) setReady(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      unsub();
      document.body.style.overflow = prev;
    };
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
  const loadSnapshot = useBuilderStore((s) => s.loadSnapshot);
  const reset = useBuilderStore((s) => s.reset);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const canUndo = useBuilderStore((s) => s.canUndo);
  const canRedo = useBuilderStore((s) => s.canRedo);
  const rotatePiece = useBuilderStore((s) => s.rotatePiece);
  const flipPiece = useBuilderStore((s) => s.flipPiece);
  const removePiece = useBuilderStore((s) => s.removePiece);
  const duplicatePiece = useBuilderStore((s) => s.duplicatePiece);
  const alignPiece = useBuilderStore((s) => s.alignPiece);
  const setDesignText = useBuilderStore((s) => s.setDesignText);
  const selectDesign = useBuilderStore((s) => s.select);
  const updateTextDesign = useBuilderStore((s) => s.updateTextDesign);
  const rejected = useBuilderStore((s) => s.rejected) ?? [];

  const films = useJobStore((s) => s.films);
  const activeId = useJobStore((s) => s.activeId);
  const upsertFilm = useJobStore((s) => s.upsert);
  const removeFilm = useJobStore((s) => s.remove);
  const setActiveFilm = useJobStore((s) => s.setActive);
  const clearJob = useJobStore((s) => s.clear);
  const addLine = useCartStore((s) => s.addLine);

  const selectedPieceExact = placed.find((p) => p.id === selectedId) ?? null;
  const selectedPiece =
    selectedPieceExact ?? placed.find((p) => p.designId === selectedId) ?? null;
  const selectedDesign = selectedPiece
    ? designs.find((d) => d.id === selectedPiece.designId)
    : designs.find((d) => d.id === selectedId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ["d", "c", "v"].includes(e.key.toLowerCase())) {
        const state = useBuilderStore.getState();
        const pieceId = state.placed.find((p) => p.id === state.selectedId)?.id ?? null;
        const key = e.key.toLowerCase();
        if (key === "v") {
          e.preventDefault();
          state.pastePiece(config);
          return;
        }
        if (!pieceId) return;
        e.preventDefault();
        if (key === "d") state.duplicatePiece(pieceId, config);
        if (key === "c") state.copyPiece(pieceId);
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

  const liveQuote = useMemo(
    () => quoteFilm(designs.length ? lengthMm : 0, config, { trade, includeShipping: false }),
    [designs.length, lengthMm, config, trade]
  );

  const otherFilms = films.filter((f) => f.id !== activeId);
  const jobLengths = [
    designs.length ? lengthMm : 0,
    ...otherFilms.map((f) => f.lengthMm),
  ].filter((n) => n > 0);
  const jobSubtotal = jobLengths.reduce(
    (sum, mm) => sum + quoteFilm(mm, config, { trade, includeShipping: false }).subtotalExcl,
    0
  );
  const jobBilled = jobLengths.reduce(
    (sum, mm) => sum + quoteFilm(mm, config, { trade, includeShipping: false }).billedMeters,
    0
  );
  const shipping =
    jobSubtotal > 0 && jobSubtotal < config.freeShippingFrom ? config.shippingCost : 0;
  const jobBtw = Number(((jobSubtotal + shipping) * config.btwRate).toFixed(2));
  const jobTotalExcl = Number((jobSubtotal + shipping).toFixed(2));
  const jobTotalIncl = Number((jobSubtotal + shipping + jobBtw).toFixed(2));
  const displayJob = incl ? jobTotalIncl : jobTotalExcl;
  const displayLive = incl
    ? liveQuote.subtotalExcl + Number((liveQuote.subtotalExcl * config.btwRate).toFixed(2))
    : liveQuote.subtotalExcl;

  const blocking = designs.some(
    (d) =>
      d.uploadError ||
      (d.warnings ?? []).some((w) => w.level === "red") ||
      rejected.includes(d.id)
  );

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    try {
      await addFiles(Array.from(list), config);
      setTab("images");
    } catch (err) {
      console.error("addFiles failed", err);
    }
  }

  function captureCurrent(id?: string | null): JobFilm | null {
    const s = useBuilderStore.getState();
    if (!s.designs.length) return null;
    const existing = id ? films.find((f) => f.id === id) : undefined;
    const n = films.length + (existing || id ? 0 : 1);
    return {
      id: existing?.id ?? id ?? crypto.randomUUID(),
      name: existing?.name ?? `${t.builder.film} ${Math.max(1, n)}`,
      lengthMm: s.lengthMm,
      previewSrc: s.designs[0]?.src || "",
      payload: s.snapshot(),
      designCount: s.designs.length,
    };
  }

  function newFilm() {
    const shot = captureCurrent(activeId);
    if (shot) upsertFilm(shot);
    reset();
    setActiveFilm(null);
    setAdded(false);
  }

  function openFilm(film: JobFilm) {
    if (film.id === activeId) return;
    const shot = captureCurrent(activeId);
    if (shot) upsertFilm(shot);
    loadSnapshot(film.payload, config);
    setActiveFilm(film.id);
  }

  function dropFilm(id: string) {
    removeFilm(id);
    if (id === activeId) {
      reset();
      setActiveFilm(null);
    }
  }

  function addOrderToCart() {
    if (added || blocking) return;
    const shot = captureCurrent(activeId);
    const all: JobFilm[] = [];
    if (shot) all.push(shot);
    for (const f of films) {
      if (!all.some((x) => x.id === f.id)) all.push(f);
    }
    const usable = all.filter((f) => f.designCount > 0 && f.lengthMm > 0);
    if (!usable.length) return;
    if (
      usable.some((f) => {
        try {
          const parsed = JSON.parse(f.payload) as { designs?: { storageKey?: string }[] };
          return (parsed.designs ?? []).some((d) => !d.storageKey);
        } catch {
          return true;
        }
      })
    ) {
      return;
    }
    for (const film of usable) {
      const parsed = JSON.parse(film.payload) as {
        designs: Design[];
        placed: typeof placed;
        lengthMm: number;
      };
      const q = quoteFilm(film.lengthMm, config, { trade, includeShipping: false });
      addLine({
        id: crypto.randomUUID(),
        lengthMm: film.lengthMm,
        billedMeters: q.billedMeters,
        rate: q.rate,
        subtotalExcl: q.subtotalExcl,
        trade,
        rush: false,
        designs: (parsed.designs ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          storageKey: d.storageKey,
          qty: d.qty,
          widthMm: d.widthMm,
          heightMm: d.heightMm,
          trimBox: d.trimBox,
        })),
        placed: parsed.placed ?? [],
        createdAt: new Date().toISOString(),
      });
    }
    clearJob();
    reset();
    setAdded(true);
  }

  async function addTextToFilm() {
    try {
      const font = TEXT_FONTS.find((f) => f.id === fontId) ?? TEXT_FONTS[0];
      const color = TEXT_COLORS.find((c) => c.id === colorId) ?? TEXT_COLORS[0];
      const spec: TextSpec = {
        ...defaultTextSpec,
        value: text,
        fontId: font.id,
        fontFamily: font.family,
        fontPx,
        fill: color.hex,
      };
      const file = await rasterizeText(text, spec);
      const before = new Set(useBuilderStore.getState().designs.map((d) => d.id));
      await addFiles([file], config);
      // Keep the copy on the piece so it can be reworded later instead of
      // deleted and typed again.
      const added = useBuilderStore.getState().designs.find((d) => !before.has(d.id));
      if (added) {
        setDesignText(added.id, spec);
        selectDesign(added.id);
      }
      setText("");
    } catch (err) {
      console.error("addText", err);
    }
  }

  const filtered = designs.filter((d) =>
    query.trim() ? d.name.toLowerCase().includes(query.trim().toLowerCase()) : true
  );
  const alerts = layoutAlerts(placed, config.rollWidthMm, config.edgeMm);
  const liveCard: JobFilm = {
    id: activeId ?? "current",
    name:
      films.find((f) => f.id === activeId)?.name ??
      `${t.builder.film} ${films.length + (activeId ? 0 : 1) || 1}`,
    lengthMm,
    previewSrc: designs[0]?.src || "",
    payload: "",
    designCount: designs.length,
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-2 pb-16 pt-2 lg:pb-2">
      {/* The order lives at the top, always in sight — a customer should never
          scroll a panel to find out what they are about to pay. */}
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted">{t.builder.orderTotal}</span>
          <span className="num text-xl text-accent">{money(displayJob, locale)}</span>
        </div>
        <span className="num text-xs text-muted">
          {metersLabel(Number(jobBilled.toFixed(2)), locale)} ·{" "}
          {filmsCount(jobLengths.length, locale)}
        </span>
        {blocking && <span className="text-xs text-bad">{t.builder.uploadFailed}</span>}
        <div className="ml-auto flex items-center gap-2">
          {added && (
            <Link href={localizedPath(locale, "/checkout")} className="btn btn-ghost">
              {t.builder.checkout}
            </Link>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={added || blocking || (!designs.length && films.length === 0)}
            onClick={addOrderToCart}
          >
            {added ? t.builder.added : t.builder.addAllCart}
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <nav className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto thin-scroll border-r border-white/10 bg-black/40 py-3">
          <RailBtn
            active={tab === "images"}
            label={t.builder.tabImages}
            onClick={() => setTab("images")}
          >
            <ImageIcon size={18} />
          </RailBtn>
          <RailBtn
            active={tab === "text"}
            label={t.builder.tabText}
            onClick={() => setTab("text")}
          >
            <Type size={18} />
          </RailBtn>
        </nav>

        <aside className="flex w-[280px] min-h-0 shrink-0 flex-col overflow-y-auto thin-scroll border-r border-white/10 bg-black/20 xl:w-[300px]">
          {tab === "images" ? (
            <>
              <div className="shrink-0 space-y-2 p-3">
                <label className="relative flex cursor-pointer flex-col items-center rounded-2xl bg-accent px-3 py-4 text-center text-white">
                  <span className="text-sm font-medium">{t.builder.uploadImage}</span>
                  <span className="mt-1 text-[11px] text-white/80">{t.builder.pngHint}</span>
                  <span className="mt-2 text-xs text-white/90">{t.builder.dropFiles}</span>
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
                  className="w-full text-center text-[11px] text-muted hover:text-foreground"
                  onClick={async () => {
                    const demos = makeDemoDesigns();
                    const files: File[] = [];
                    for (const d of demos) {
                      const blob = await (await fetch(d.src)).blob();
                      files.push(new File([blob], d.name, { type: "image/png" }));
                    }
                    await addFiles(files, config);
                  }}
                >
                  {t.builder.demo}
                </button>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.builder.searchImages}
                  className="field py-2 text-sm"
                />
              </div>
              <p className="shrink-0 px-3 pb-1 text-[11px] uppercase tracking-[0.16em] text-muted">
                {t.builder.uploadedImages}
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto thin-scroll px-3 pb-3">
                {!ready && <p className="text-xs text-muted">{t.builder.loading}</p>}
                {adding && <p className="text-xs text-muted">{t.builder.uploading}</p>}
                {designs.length === 0 && (
                  <p className="text-xs leading-relaxed text-muted">
                    {fill(t.builder.empty, config, locale)}
                  </p>
                )}
                <ul className="grid gap-2">
                  {filtered.map((d) => (
                    <LibraryItem
                      key={d.id}
                      design={d}
                      selected={selectedId === d.id || selectedDesign?.id === d.id}
                    />
                  ))}
                </ul>
                {selectedDesign && (
                  <Inspector
                    design={selectedDesign}
                    piece={selectedPieceExact}
                    onRemove={() => {
                      if (selectedPieceExact) removePiece(selectedPieceExact.id, config);
                      else removeDesign(selectedDesign.id, config);
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t.builder.tabText}</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.builder.textPlaceholder}
                rows={5}
                className="field min-h-[8rem] resize-none text-base"
              />
              <label className="grid gap-1 text-xs">
                <span className="text-muted">{t.builder.font}</span>
                <select
                  className="field py-2"
                  value={fontId}
                  onChange={(e) => setFontId(e.target.value)}
                >
                  {TEXT_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-muted">
                  {t.builder.textSize} · {fontPx}px
                </span>
                <input
                  type="range"
                  min={28}
                  max={160}
                  value={fontPx}
                  onChange={(e) => setFontPx(Number(e.target.value))}
                />
              </label>
              <div className="flex gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.id}
                    onClick={() => setColorId(c.id)}
                    className={`h-8 w-8 rounded-full border ${
                      colorId === c.id ? "border-white" : "border-white/20"
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
              <button
                type="button"
                className="btn btn-primary mt-auto w-full"
                disabled={!text.trim() || adding}
                onClick={() => void addTextToFilm()}
              >
                {t.builder.addText}
              </button>
            </div>
          )}
        </aside>

        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-white/10 px-3 py-2">
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
              disabled={!selectedPiece}
              onClick={() => selectedPiece && duplicatePiece(selectedPiece.id, config)}
              title="Ctrl/⌘ + D"
            >
              {t.builder.duplicate}
            </button>
            <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden />
            {(["left", "center", "right"] as const).map((edge) => (
              <button
                key={edge}
                type="button"
                className="btn-soft"
                disabled={!selectedPiece}
                onClick={() => selectedPiece && alignPiece(selectedPiece.id, edge, config)}
              >
                {edge === "left"
                  ? t.builder.alignLeft
                  : edge === "center"
                  ? t.builder.alignCenter
                  : t.builder.alignRight}
              </button>
            ))}
            <button
              type="button"
              className="btn-soft"
              disabled={!selectedDesign}
              onClick={() =>
                selectedDesign &&
                updateDesign(selectedDesign.id, { qty: selectedDesign.qty + 1 }, config)
              }
            >
              {t.builder.copy}
            </button>
            <div className="ml-auto flex items-center gap-3">
              <span className="num text-lg text-accent">{money(displayLive, locale)}</span>
              <label className="flex items-center gap-2 text-xs text-muted">
                {t.builder.zoom}
                <input
                  type="range"
                  min={50}
                  max={160}
                  value={zoomPct}
                  className="w-20"
                  onChange={(e) => setZoomPct(Number(e.target.value))}
                />
                <span className="num w-10">{zoomPct}%</span>
              </label>
            </div>
          </div>
          {alerts.overlap && (
            <p className="shrink-0 bg-bad/15 px-3 py-1.5 text-sm text-bad">{t.builder.overlap}</p>
          )}
          {alerts.overflow && (
            <p className="shrink-0 bg-warn/20 px-3 py-1.5 text-sm text-warn">{t.builder.overflow}</p>
          )}
          {rejected.length > 0 && (
            <p className="shrink-0 bg-bad/15 px-3 py-1.5 text-sm text-bad">
              {rejected.length} {t.builder.warnWide}
            </p>
          )}
          <div className="min-h-0 flex-1 p-2">
            <CanvasGuard>
              <BuilderCanvas interactive zoomPct={zoomPct} />
            </CanvasGuard>
          </div>
        </section>

        <aside className="flex w-[280px] min-h-0 shrink-0 flex-col overflow-y-auto thin-scroll border-l border-white/10 bg-black/20 xl:w-[300px]">
          {selectedDesign?.text && (
            <TextProperties
              design={selectedDesign}
              t={t}
              onChange={(patch) => void updateTextDesign(selectedDesign.id, patch, config)}
            />
          )}
          <div className="flex shrink-0 items-center justify-between px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t.builder.films}</p>
            <button type="button" className="btn-soft" onClick={newFilm}>
              + {t.builder.newFilm}
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto thin-scroll px-3">
            <FilmCard
              film={liveCard}
              active
              locale={locale}
              trade={trade}
              onOpen={() => undefined}
              onRemove={
                designs.length
                  ? () => {
                      reset();
                      if (activeId) dropFilm(activeId);
                    }
                  : undefined
              }
            />
            {otherFilms.map((f) => (
              <FilmCard
                key={f.id}
                film={f}
                active={false}
                locale={locale}
                trade={trade}
                onOpen={() => openFilm(f)}
                onRemove={() => dropFilm(f.id)}
              />
            ))}
          </div>
          <div className="shrink-0 space-y-3 border-t border-white/10 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">{t.builder.orderTotal}</span>
              <span className="num text-2xl text-accent">{money(displayJob, locale)}</span>
            </div>
            <p className="num text-xs text-muted">
              {metersLabel(Number(jobBilled.toFixed(2)), locale)} ·{" "}
              {filmsCount(jobLengths.length, locale)}
            </p>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={trade} onChange={(e) => setTrade(e.target.checked)} />
              {t.checkout.trade}
            </label>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
        <div className="glass mx-auto flex items-center justify-between gap-3 rounded-2xl p-3">
          <p className="num text-lg text-accent">{money(displayJob, locale)}</p>
          <button
            type="button"
            disabled={added || blocking || (!designs.length && films.length === 0)}
            onClick={addOrderToCart}
            className="btn btn-primary"
          >
            {added ? t.builder.added : t.builder.addCart}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Copy stays editable after it lands on the film: reword it, restyle it, and
 * the piece is re-rendered and re-uploaded so the print file follows.
 */
function TextProperties({
  design,
  t,
  onChange,
}: {
  design: Design;
  t: ReturnType<typeof useI18n>["t"];
  onChange: (patch: Partial<TextSpec>) => void;
}) {
  const spec = design.text as TextSpec;
  const [draft, setDraft] = useState(spec.value);

  useEffect(() => {
    setDraft(spec.value);
  }, [spec.value, design.id]);

  // Every keystroke would mean an upload, so the wording commits on blur.
  function commitValue() {
    if (draft !== spec.value && draft.trim()) onChange({ value: draft });
  }

  return (
    <div className="shrink-0 space-y-3 border-b border-white/10 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t.builder.tabText}</p>
      <textarea
        value={draft}
        rows={2}
        className="field resize-none text-sm"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitValue}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.blur();
        }}
      />
      <label className="grid gap-1 text-xs">
        <span className="text-muted">{t.builder.font}</span>
        <select
          className="field py-1.5"
          value={spec.fontId}
          onChange={(e) => {
            const font = TEXT_FONTS.find((f) => f.id === e.target.value) ?? TEXT_FONTS[0];
            onChange({ fontId: font.id, fontFamily: font.family });
          }}
        >
          {TEXT_FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.id}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs">
        <span className="text-muted">
          {t.builder.textSize} · {spec.fontPx}px
        </span>
        <input
          type="range"
          min={28}
          max={200}
          value={spec.fontPx}
          onChange={(e) => onChange({ fontPx: Number(e.target.value) })}
        />
      </label>
      <div className="flex items-center gap-2">
        {TEXT_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.id}
            onClick={() => onChange({ fill: c.hex })}
            className={`h-7 w-7 rounded-full border ${
              spec.fill === c.hex ? "border-white" : "border-white/20"
            }`}
            style={{ background: c.hex }}
          />
        ))}
        <button
          type="button"
          onClick={() => onChange({ bold: !spec.bold })}
          className={`btn-soft ml-auto font-bold ${spec.bold ? "text-foreground" : "text-muted"}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => onChange({ italic: !spec.italic })}
          className={`btn-soft italic ${spec.italic ? "text-foreground" : "text-muted"}`}
        >
          I
        </button>
      </div>
      <div className="flex gap-1">
        {(["left", "center", "right"] as TextAlign[]).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange({ align: a })}
            className={`btn-soft flex-1 ${spec.align === a ? "text-foreground" : "text-muted"}`}
          >
            {a === "left" ? "≡" : a === "center" ? "≡" : "≡"}
          </button>
        ))}
      </div>
      <label className="grid gap-1 text-xs">
        <span className="text-muted">
          {t.builder.outline} · {spec.strokeWidth}
        </span>
        <input
          type="range"
          min={0}
          max={12}
          value={spec.strokeWidth}
          onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
        />
      </label>
      {spec.strokeWidth > 0 && (
        <div className="flex gap-2">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.id}
              onClick={() => onChange({ stroke: c.hex })}
              className={`h-6 w-6 rounded border ${
                spec.stroke === c.hex ? "border-white" : "border-white/20"
              }`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RailBtn({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-12 flex-col items-center gap-1 rounded-xl py-2 text-[10px] ${
        active ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function FilmCard({
  film,
  active,
  locale,
  trade,
  onOpen,
  onRemove,
}: {
  film: JobFilm;
  active: boolean;
  locale: string;
  trade: boolean;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  const config = useSettingsStore((s) => s.config);
  const incl = useSettingsStore((s) => s.btwInclusive);
  const q = quoteFilm(film.designCount ? film.lengthMm : 0, config, {
    trade,
    includeShipping: false,
  });
  const price = incl
    ? q.subtotalExcl + Number((q.subtotalExcl * config.btwRate).toFixed(2))
    : q.subtotalExcl;
  return (
    <div
      className={`flex gap-2 rounded-2xl p-2 ${active ? "ring-1 ring-accent bg-white/5" : "bg-white/5"}`}
    >
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 gap-2 text-left">
        <div className="checker h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          {film.previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={film.previewSrc} alt="" className="h-full w-full object-contain" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm">{film.name}</p>
          <p className="num text-[11px] text-muted">
            {config.rollWidthMm / 10} cm × {(film.lengthMm / 10).toFixed(1)} cm
          </p>
          <p className="num text-[11px] text-muted">
            {metersLabel(q.billedMeters, locale)} · {money(price, locale)}
          </p>
        </div>
      </button>
      {onRemove && (
        <button type="button" className="self-start text-sm text-muted hover:text-bad" onClick={onRemove}>
          ×
        </button>
      )}
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
        <div className="grid h-full place-items-center text-center text-sm text-muted">
          Canvas failed to render. Reload the page.
        </div>
      );
    }
    return this.props.children;
  }
}

function LibraryItem({ design, selected }: { design: Design; selected: boolean }) {
  const { t } = useI18n();
  const select = useBuilderStore((s) => s.select);
  const removeDesign = useBuilderStore((s) => s.removeDesign);
  const config = useSettingsStore((s) => s.config);
  return (
    <li
      className={`flex items-stretch gap-1 rounded-2xl bg-white/5 p-2 ${
        selected ? "ring-1 ring-accent" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => select(design.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <div className="relative checker h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          {design.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.src} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="grid h-full place-items-center text-xs text-muted">—</span>
          )}
          <span className="absolute bottom-1 right-1 rounded-md bg-accent px-1.5 py-0.5 text-[10px] text-white">
            {design.qty}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm leading-snug break-all">{design.name}</p>
          <p className="num mt-1 text-[11px] text-muted">
            {(design.widthMm / 10).toFixed(1)} × {(design.heightMm / 10).toFixed(1)} cm
          </p>
          {design.uploadError && (
            <p className="mt-0.5 text-[10px] text-bad">{t.builder.uploadFailed}</p>
          )}
        </div>
      </button>
      <button
        type="button"
        className="self-start px-1 text-muted hover:text-bad"
        aria-label={t.builder.remove}
        onClick={() => removeDesign(design.id, config)}
      >
        ×
      </button>
    </li>
  );
}

function Inspector({
  design,
  piece,
  onRemove,
}: {
  design: Design;
  piece: ReturnType<typeof useBuilderStore.getState>["placed"][number] | null;
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
    <div className="mt-3 rounded-2xl bg-white/5 p-3">
      <p className="num text-[11px] uppercase tracking-[0.16em] text-muted">{t.builder.properties}</p>
      <p className={`num mt-1 text-xs ${dpi < 150 ? "text-bad" : dpi < 200 ? "text-warn" : "text-muted"}`}>
        {t.builder.dpi} {dpi}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <label className="grid gap-1">
          <span className="text-muted">{t.builder.width}</span>
          <input
            type="number"
            min={1}
            step={0.1}
            value={wDraft}
            className="field py-1.5 num"
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
            className="field py-1.5 num"
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
            className="field py-1.5 num"
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
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {PRESETS_CM.map((cm) => (
          <button
            key={cm}
            type="button"
            className="btn-soft num"
            onClick={() => commitSize(cm * 10, undefined)}
          >
            {cm}
          </button>
        ))}
      </div>
      <button type="button" className="btn-soft mt-2 w-full text-bad" onClick={onRemove}>
        {t.builder.remove}
      </button>
    </div>
  );
}
