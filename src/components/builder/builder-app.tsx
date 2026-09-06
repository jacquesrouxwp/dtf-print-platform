"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Image as ImageIcon, Type } from "lucide-react";
import { printDpi } from "@/lib/artwork";
import { DEMO_FILENAMES, makeDemoDesigns } from "@/lib/demo-art";
import { locales, localizedPath } from "@/lib/i18n-config";
import {
  clampPieceSize,
  DEFAULT_OUTPUT_DPI,
  effectiveDpi,
  MIN_PIECE_MM,
  printSizeFromPixels,
  usableWidthMm,
} from "@/lib/units";
import type { LayoutMode, PlacedPiece } from "@/lib/nesting";
import { previousWholeMetreMm } from "@/lib/fit-to-length";
import { filmsCount } from "@/lib/plural";
import { metersLabel, money, quoteFilm } from "@/lib/pricing";
import { layoutAlerts } from "@/lib/layout-alerts";
import { defaultTextSpec, rasterizeText, type TextAlign, type TextSpec } from "@/lib/raster-text";
import { persistableSrc } from "@/lib/local-artwork";
import { previewFileName, renderFilmPreview } from "@/lib/film-preview";
import { copiesForLength } from "@/lib/auto-fill";
import { suggestAcross } from "@/lib/fit-across";
import { rollFromSite } from "@/lib/roll";
import type { SiteConfig } from "@/lib/site-config";
import { fill } from "@/lib/tokens";
import { useBuilderStore, type Design } from "@/store/useBuilderStore";
import { cartFingerprint, useCartStore } from "@/store/useCartStore";
import { useJobStore, type JobFilm } from "@/store/useJobStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { BrandLogo } from "../brand-logo";
import { FrameCmyk } from "../frame-cmyk";
import { useI18n } from "../providers";

const BuilderCanvas = dynamic(
  () => import("./builder-canvas").then((m) => m.BuilderCanvas),
  { ssr: false, loading: () => <div className="h-full min-h-0 rounded-sm bg-surface md:min-h-[420px]" /> }
);

/** Stable preview URL, then a live blob: for the current session. Never a dead blob. */
function liveThumb(src?: string, previewUrl?: string) {
  const stable = persistableSrc(src) || persistableSrc(previewUrl);
  if (stable) return stable;
  if (src && src.startsWith("blob:")) return src;
  if (previewUrl && previewUrl.startsWith("blob:")) return previewUrl;
  return "";
}

/** Portrait phone, or landscape phone: no permanent side columns. */
function useCompactBuilder() {
  const [compact, setCompact] = useState(true);
  useEffect(() => {
    const read = () =>
      window.matchMedia(
        "(max-width: 767.98px), (max-height: 560px) and (max-width: 960px)"
      ).matches;
    const on = () => setCompact(read());
    on();
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);
  return compact;
}

type LeftTab = "images" | "text";

const PRESETS_CM = [10, 15, 20, 25, 30];
const TEXT_FONTS = [
  { id: "Sans", family: "system-ui, 'Segoe UI', Roboto, sans-serif" },
  { id: "Grotesk", family: "'Arial Black', 'Helvetica Neue', Arial, sans-serif" },
  { id: "Serif", family: "Georgia, 'Times New Roman', serif" },
  { id: "Slab", family: "'Rockwell', 'Courier New', Georgia, serif" },
  { id: "Mono", family: "ui-monospace, 'Courier New', monospace" },
  { id: "Script", family: "'Segoe Script', 'Brush Script MT', cursive" },
  { id: "Condensed", family: "'Arial Narrow', 'Haettenschweiler', sans-serif" },
];

export function BuilderApp() {
  const { locale, t } = useI18n();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<LeftTab>("images");
  const [query, setQuery] = useState("");
  const [zoomPct, setZoomPct] = useState(100);
  const [fitNote, setFitNote] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [cartNote, setCartNote] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [filmTall, setFilmTall] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [fillMetres, setFillMetres] = useState(1);
  const compact = useCompactBuilder();

  useEffect(() => {
    const unsub = useBuilderStore.persist.onFinishHydration(() => setReady(true));
    void useBuilderStore.persist.rehydrate();
    if (useBuilderStore.persist.hasHydrated()) setReady(true);
    void useCartStore.persist.rehydrate();
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
  const fitFilmTo = useBuilderStore((s) => s.fitFilmTo);
  const fillWithDesign = useBuilderStore((s) => s.fillWithDesign);
  const gapMm = useBuilderStore((s) => s.gapMm);
  const setGapMm = useBuilderStore((s) => s.setGapMm);
  const layoutMode = useBuilderStore((s) => s.layoutMode);
  const setLayoutMode = useBuilderStore((s) => s.setLayoutMode);
  const freeCopiesFor = useBuilderStore((s) => s.freeCopiesFor);
  const movePiece = useBuilderStore((s) => s.movePiece);
  const selectDesign = useBuilderStore((s) => s.select);
  const updateTextDesign = useBuilderStore((s) => s.updateTextDesign);
  const rejected = useBuilderStore((s) => s.rejected) ?? [];

  const films = useJobStore((s) => s.films);
  const activeId = useJobStore((s) => s.activeId);
  const upsertFilm = useJobStore((s) => s.upsert);
  const removeFilm = useJobStore((s) => s.remove);
  const setActiveFilm = useJobStore((s) => s.setActive);
  const addLine = useCartStore((s) => s.addLine);

  const selectedPieceExact = placed.find((p) => p.id === selectedId) ?? null;
  const selectedPiece =
    selectedPieceExact ?? placed.find((p) => p.designId === selectedId) ?? null;
  const selectedDesign = selectedPiece
    ? designs.find((d) => d.id === selectedPiece.designId)
    : designs.find((d) => d.id === selectedId);

  // A rehydrated store carries designs but no layout — nothing has run the
  // packer yet — so the film looks empty and a selected design has no piece to
  // show properties for. Lay it out once, as soon as the store is ready.
  useEffect(() => {
    if (!ready) return;
    const s = useBuilderStore.getState();
    if (s.designs.length && !s.placed.length) s.autoArrange(config);
  }, [ready, config]);

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
    () => quoteFilm(designs.length ? lengthMm : 0, config, { trade: false, includeShipping: false }),
    [designs.length, lengthMm, config]
  );

  const otherFilms = films.filter((f) => f.id !== activeId);
  const jobLengths = [
    designs.length ? lengthMm : 0,
    ...otherFilms.map((f) => f.lengthMm),
  ].filter((n) => n > 0);
  const jobSubtotal = jobLengths.reduce(
    (sum, mm) => sum + quoteFilm(mm, config, { trade: false, includeShipping: false }).subtotalExcl,
    0
  );
  const jobBilled = jobLengths.reduce(
    (sum, mm) => sum + quoteFilm(mm, config, { trade: false, includeShipping: false }).billedMeters,
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

  const uploadBlocked = designs.some((d) => d.uploadError);
  const nestBlocked = designs.some((d) => rejected.includes(d.id));

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

  function filmFingerprint(film: JobFilm): string {
    try {
      const parsed = JSON.parse(film.payload) as {
        designs?: { id: string; qty: number; widthMm: number; heightMm: number }[];
      };
      return cartFingerprint({
        lengthMm: film.lengthMm,
        designs: parsed.designs ?? [],
      });
    } catch {
      return film.id;
    }
  }

  function addOrderToCart() {
    if (added || adding) return;
    void useCartStore.persist.rehydrate();
    if (uploadBlocked) {
      setCartNote(t.builder.uploadFailed);
      return;
    }
    if (nestBlocked) {
      setCartNote(t.builder.overflow);
      return;
    }
    const shot = captureCurrent(activeId);
    if (shot) upsertFilm(shot);
    const all: JobFilm[] = [];
    const seen = new Set<string>();
    for (const film of [shot, ...useJobStore.getState().films]) {
      if (!film || film.designCount <= 0 || film.lengthMm <= 0) continue;
      const fp = filmFingerprint(film);
      if (seen.has(fp) || seen.has(film.id)) continue;
      seen.add(fp);
      seen.add(film.id);
      all.push(film);
    }
    const usable = all;
    if (!usable.length) {
      setCartNote(t.builder.empty);
      return;
    }
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
      setCartNote(t.builder.uploadFailed);
      return;
    }
    for (const film of usable) {
      const parsed = JSON.parse(film.payload) as {
        designs: Design[];
        placed: typeof placed;
        lengthMm: number;
        gapMm?: number | null;
      };
      const q = quoteFilm(film.lengthMm, config, { trade: false, includeShipping: false });
      addLine({
        id: crypto.randomUUID(),
        lengthMm: film.lengthMm,
        billedMeters: q.billedMeters,
        rate: q.rate,
        subtotalExcl: q.subtotalExcl,
        trade: false,
        rush: false,
        gapMm: parsed.gapMm ?? gapMm ?? config.gapMm,
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
    setCartNote(null);
    setAdded(true);
  }

  /** The metre this film is spilling over, if the spill is worth offering to fix. */
  const fitTargetMm = designs.length ? previousWholeMetreMm(lengthMm) : null;
  const fitSavingMm = fitTargetMm ? lengthMm - fitTargetMm : 0;
  const offerFit = Boolean(fitTargetMm) && fitSavingMm > 5 && fitSavingMm <= 150;

  function fitToWholeMetre() {
    if (!fitTargetMm) return;
    const scale = fitFilmTo(fitTargetMm, config);
    setFitNote(
      scale
        ? t.builder.fitDone.replace("{pct}", String(Math.round((1 - scale) * 100)))
        : t.builder.fitFailed
    );
    window.setTimeout(() => setFitNote(null), 6000);
  }

  async function addTextToFilm() {
    try {
      const spec: TextSpec = {
        ...defaultTextSpec,
        value: t.builder.textDefault,
        fontId: TEXT_FONTS[0].id,
        fontFamily: TEXT_FONTS[0].family,
      };
      const file = await rasterizeText(spec.value, spec);
      const before = new Set(useBuilderStore.getState().designs.map((d) => d.id));
      await addFiles([file], config);
      // The piece lands on the film and the properties panel takes over — the
      // customer works on the film, not in a side panel next to it.
      const added = useBuilderStore.getState().designs.find((d) => !before.has(d.id));
      if (added) {
        setDesignText(added.id, spec);
        selectDesign(added.id);
      }
    } catch (err) {
      console.error("addText", err);
    }
  }


  async function loadDemos() {
    const have = new Set(useBuilderStore.getState().designs.map((d) => d.name));
    if (DEMO_FILENAMES.every((name) => have.has(name))) return;
    const demos = makeDemoDesigns();
    const files: File[] = [];
    for (const d of demos) {
      if (have.has(d.name)) continue;
      const blob = await (await fetch(d.src)).blob();
      files.push(new File([blob], d.name, { type: "image/png" }));
    }
    if (!files.length) return;
    await addFiles(files, config);
  }

  /** The size we recommend: the file printed at 300 dpi, clamped to the film. */
  function autoSize(design: Design) {
    const natural = printSizeFromPixels(design.pixelW, design.pixelH, DEFAULT_OUTPUT_DPI);
    const usable = usableWidthMm(config.rollWidthMm, config.edgeMm);
    const size = clampPieceSize(natural.widthMm, natural.heightMm, usable);
    updateDesign(design.id, { widthMm: size.widthMm, heightMm: size.heightMm }, config);
  }

  function fillFilmWith(design: Design, metres: number) {
    const copies = fillWithDesign(design.id, Math.max(1, metres) * 1000, config);
    setFitNote(
      copies > 0 ? t.builder.fillDone.replace("{n}", String(copies)) : t.builder.fillNone
    );
    window.setTimeout(() => setFitNote(null), 6000);
  }

  /**
   * The film as a picture, built here in the browser. Deliberately not the
   * print file: that is 300 dpi and is rebuilt from the originals after
   * payment, which the caption on the image says out loud.
   */
  async function downloadPreview() {
    if (previewBusy || !placed.length) return;
    setPreviewBusy(true);
    setPreviewNote(null);
    try {
      const blob = await renderFilmPreview({
        designs: designs.map((d) => ({
          id: d.id,
          name: d.name,
          src: liveThumb(d.src, d.previewUrl) || d.src,
        })),
        placed,
        lengthMm,
        rollWidthMm: config.rollWidthMm,
        caption: t.builder.previewCaption.replace(
          "{len}",
          metersLabel(Number((lengthMm / 1000).toFixed(2)), locale)
        ),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = previewFileName(lengthMm);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      console.error("preview", err);
      setPreviewNote(t.builder.previewFailed);
      window.setTimeout(() => setPreviewNote(null), 6000);
    } finally {
      setPreviewBusy(false);
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

  /**
   * A phone gets a document, not a shrunken desktop app: one column that
   * scrolls, the bar pinned to the top, the money pinned to the bottom, and
   * the film in a card of its own. Pieces are not draggable here — a thumb
   * scrolling over the film would fling artwork across the layout — so the
   * flow is upload, size, fill, and the packer does the placing.
   */
  if (compact) {
    const rollCm = Math.round(config.rollWidthMm / 10);
    if (filmTall) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-2">
            <p className="num text-sm">
              {metersLabel(Number((lengthMm / 1000).toFixed(2)), locale)}
            </p>
            <button
              type="button"
              className="btn-soft text-xs"
              onClick={() => setFilmTall(false)}
            >
              {t.builder.closeFilm}
            </button>
          </div>
          <div className="relative min-h-0 flex-1 bg-surface p-2">
            <CanvasGuard>
              <BuilderCanvas interactive={false} zoomPct={100} />
            </CanvasGuard>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-surface">
        <header className="flex shrink-0 items-center gap-2 border-b border-line bg-paper px-3 py-2">
          <Link
            href={localizedPath(locale, "/")}
            className="flex items-center"
            title={t.builder.backToSite}
            aria-label="DTF"
          >
            <BrandLogo height={26} />
          </Link>
          <nav
            className="ml-auto flex shrink-0 items-center border border-line"
            aria-label={t.nav.language}
          >
            {locales.map((code) => (
              <Link
                key={code}
                href={localizedPath(code, "/order")}
                hrefLang={code}
                className={`num grid min-h-[36px] place-items-center px-2.5 text-xs uppercase tracking-wider ${
                  code === locale ? "bg-line text-ink" : "text-muted"
                }`}
              >
                {code}
              </Link>
            ))}
          </nav>
        </header>

        <main className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
          <section className="space-y-3 rounded-2xl border border-line bg-paper p-4">
            <h2 className="text-base font-medium">{t.builder.uploadImage}</h2>
            <label className="relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-accent/50 bg-accent/5 px-4 py-8 text-center">
              <span className="text-base font-medium text-accent">{t.builder.dropFiles}</span>
              <span className="text-xs text-muted">{t.builder.pngHint}</span>
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
            {!ready && <p className="text-xs text-muted">{t.builder.loading}</p>}
            {adding && <p className="text-xs text-muted">{t.builder.uploading}</p>}
            {uploadBlocked && <p className="text-xs text-bad">{t.builder.uploadFailed}</p>}
            <button
              type="button"
              className="btn-soft w-full justify-center text-xs"
              onClick={() => void loadDemos()}
            >
              {t.builder.demo}
            </button>
          </section>

          {designs.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-line bg-paper p-4">
              <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted">
                {t.builder.uploadedImages}
              </h2>
              <ul className="grid gap-2.5">
                {designs.map((d) => (
                  <LibraryItem
                    key={d.id}
                    design={d}
                    selected={selectedId === d.id || selectedDesign?.id === d.id}
                  />
                ))}
              </ul>
            </section>
          )}

          {selectedDesign && (
            <section className="space-y-4 rounded-2xl border border-line bg-paper p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="min-w-0 flex-1 truncate text-base font-medium">
                  {selectedDesign.name}
                </h2>
                <span className="num shrink-0 text-xs text-muted">
                  {(selectedDesign.widthMm / 10).toFixed(1)} ×{" "}
                  {(selectedDesign.heightMm / 10).toFixed(1)} {t.builder.cm}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                  {t.builder.designSize}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="btn-soft justify-center text-xs"
                    onClick={() => autoSize(selectedDesign)}
                  >
                    {t.builder.autoSize}
                  </button>
                  {PRESETS_CM.map((cm) => (
                    <button
                      key={cm}
                      type="button"
                      className={`btn-soft num justify-center text-xs ${
                        Math.round(selectedDesign.widthMm / 10) === cm
                          ? "text-foreground ring-1 ring-accent"
                          : ""
                      }`}
                      onClick={() => updateDesign(selectedDesign.id, { widthMm: cm * 10 }, config)}
                    >
                      {cm} {t.builder.cm}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted">{t.builder.autoSizeHint}</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">{t.builder.qty}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-soft"
                    aria-label="−"
                    onClick={() =>
                      updateDesign(
                        selectedDesign.id,
                        { qty: Math.max(1, selectedDesign.qty - 1) },
                        config
                      )
                    }
                  >
                    −
                  </button>
                  <span className="num w-10 text-center text-base">{selectedDesign.qty}</span>
                  <button
                    type="button"
                    className="btn-soft"
                    aria-label="+"
                    onClick={() =>
                      updateDesign(selectedDesign.id, { qty: selectedDesign.qty + 1 }, config)
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <AcrossOffer
                design={selectedDesign}
                config={config}
                gapMm={gapMm}
                t={t}
                onTake={(w, h) =>
                  updateDesign(selectedDesign.id, { widthMm: w, heightMm: h }, config)
                }
              />

              <div className="space-y-2 border-t border-line pt-3">
                <div className="flex items-center gap-2">
                  <select
                    className="field num w-24 py-2 text-sm"
                    aria-label={t.builder.fillFilm}
                    value={fillMetres}
                    onChange={(e) => setFillMetres(Number(e.target.value))}
                  >
                    {[1, 2, 3, 5, 10].map((m) => (
                      <option key={m} value={m}>
                        {m} m
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost flex-1 justify-center"
                    onClick={() => fillFilmWith(selectedDesign, fillMetres)}
                  >
                    {t.builder.fillMetres.replace("{m}", String(fillMetres))}
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-muted">
                  {t.builder.fillReplaces}
                </p>
              </div>
            </section>
          )}

          <section className="space-y-3 rounded-2xl border border-line bg-paper p-4">
            <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {t.builder.layout}
            </h2>
            <LayoutChoice mode={layoutMode} t={t} onPick={(m) => setLayoutMode(m, config)} />
          </section>

          <section className="overflow-hidden rounded-2xl border border-line bg-paper">
            <div className="flex items-center justify-between gap-3 px-4 pt-4">
              <h2 className="text-base font-medium">{t.builder.film}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-soft text-xs"
                  disabled={!canUndo}
                  onClick={undo}
                >
                  {t.builder.undo}
                </button>
                <button
                  type="button"
                  className="btn-soft text-xs"
                  onClick={() => autoArrange(config)}
                >
                  {t.builder.nest}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4">
              <Stat label={t.builder.roll} value={`${rollCm} ${t.builder.cm}`} />
              <Stat label={t.builder.metersUsed} value={(lengthMm / 1000).toFixed(2)} />
              <Stat label={t.builder.items} value={String(designs.length)} />
              <Stat
                label={t.builder.billed}
                value={metersLabel(Number(jobBilled.toFixed(2)), locale)}
              />
            </div>

            <div className="relative h-[46dvh] min-h-[240px] border-y border-line bg-surface p-2">
              <div className="pointer-events-none absolute left-4 top-4 z-20 space-y-1.5">
                {alerts.overlap && <AlertPill tone="bad">{t.builder.overlap}</AlertPill>}
                {alerts.overflow && <AlertPill tone="warn">{t.builder.overflow}</AlertPill>}
                {rejected.length > 0 && (
                  <AlertPill tone="bad">
                    {rejected.length} {t.builder.warnWide}
                  </AlertPill>
                )}
              </div>
              <CanvasGuard>
                <BuilderCanvas interactive={false} zoomPct={100} />
              </CanvasGuard>
            </div>

            <div className="space-y-2 p-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-soft flex-1 justify-center text-xs"
                  onClick={() => setFilmTall(true)}
                >
                  {t.builder.viewFilm}
                </button>
                <button
                  type="button"
                  className="btn-soft flex-1 justify-center text-xs"
                  disabled={previewBusy || !placed.length}
                  onClick={() => void downloadPreview()}
                >
                  {previewBusy ? t.builder.previewBuilding : t.builder.downloadPreview}
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">{t.builder.previewNote}</p>
              {previewNote && <p className="text-xs text-bad">{previewNote}</p>}
              {offerFit && (
                <button
                  type="button"
                  className="btn-soft w-full justify-center text-xs text-accent"
                  onClick={fitToWholeMetre}
                >
                  {t.builder.fitTo
                    .replace("{m}", String((fitTargetMm as number) / 1000))
                    .replace("{save}", (fitSavingMm / 10).toFixed(1))}
                </button>
              )}
              {fitNote && <p className="text-xs text-muted">{fitNote}</p>}
              <p className="text-[11px] leading-relaxed text-muted">{t.builder.mobileNote}</p>
            </div>
          </section>

          {placed.length > 0 && (
            <section className="rounded-2xl border border-line bg-paper p-4">
              <FilmSummary
                designs={designs}
                placed={placed}
                lengthMm={lengthMm}
                config={config}
                locale={locale}
                t={t}
              />
            </section>
          )}

          <section className="rounded-2xl border border-line bg-paper">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <span className="text-base font-medium">{t.builder.moreTools}</span>
              <span className="num text-muted">{moreOpen ? "−" : "+"}</span>
            </button>
            {moreOpen && (
              <div className="space-y-3 border-t border-line p-4">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="btn-soft justify-center text-xs"
                    disabled={!selectedPiece}
                    onClick={() => selectedPiece && rotatePiece(selectedPiece.id)}
                  >
                    {t.builder.rotate}
                  </button>
                  <button
                    type="button"
                    className="btn-soft justify-center text-xs"
                    disabled={!selectedPiece}
                    onClick={() => selectedPiece && flipPiece(selectedPiece.id)}
                  >
                    {t.builder.flip}
                  </button>
                  <button
                    type="button"
                    className="btn-soft justify-center text-xs"
                    disabled={!selectedPiece}
                    onClick={() => selectedPiece && duplicatePiece(selectedPiece.id, config)}
                  >
                    {t.builder.duplicate}
                  </button>
                  {(["left", "center", "right"] as const).map((edge) => (
                    <button
                      key={edge}
                      type="button"
                      className="btn-soft justify-center text-xs"
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
                </div>
                <label className="flex items-center justify-between gap-3 text-sm text-muted">
                  <span>{t.builder.gap}</span>
                  <span className="flex items-center gap-2">
                    <input
                      className="field num w-20 py-1 text-center text-sm"
                      inputMode="decimal"
                      value={gapMm ?? config.gapMm}
                      onChange={(e) => setGapMm(Number(e.target.value.replace(",", ".")), config)}
                    />
                    <span className="text-xs">mm</span>
                  </span>
                </label>
                <p className="text-[11px] leading-relaxed text-muted">{t.builder.moreToolsHint}</p>
              </div>
            )}
          </section>

          <p className="px-1 text-[11px] leading-relaxed text-muted">
            {fill(t.builder.billedHint, config, locale)}
          </p>
        </main>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-paper px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="truncate text-[11px] text-muted">{t.builder.orderTotal}</p>
            <p className="num text-lg leading-tight text-accent">{money(displayJob, locale)}</p>
          </div>
          {cartNote && <p className="text-xs text-bad">{cartNote}</p>}
          {added ? (
            <Link href={localizedPath(locale, "/checkout")} className="btn btn-primary shrink-0">
              {t.builder.checkout}
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-primary shrink-0"
              disabled={adding || (!designs.length && films.length === 0)}
              onClick={addOrderToCart}
            >
              {t.builder.addCart}
            </button>
          )}
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {/* The builder owns the window, so it carries its own bar: the way back
          to the site on the left, the money and the order on the right. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-paper px-4 py-3 xl:px-6">
        <Link
          href={localizedPath(locale, "/")}
          className="flex items-center"
          title={t.builder.backToSite}
          aria-label="DTF"
        >
          <BrandLogo height={32} />
        </Link>
        <span className="hidden text-xs text-muted sm:inline">{t.builder.title}</span>
        <div className="flex items-baseline gap-2 lg:ml-6">
          <span className="text-xs text-muted">{t.builder.orderTotal}</span>
          <span className="num text-xl text-accent">{money(displayJob, locale)}</span>
        </div>
        <span className="num hidden text-xs text-muted sm:inline">
          {metersLabel(Number(jobBilled.toFixed(2)), locale)} ·{" "}
          {filmsCount(jobLengths.length, locale)}
          {" · "}
          {fill(t.builder.billedHint, config, locale)}
        </span>
        {uploadBlocked && <span className="text-xs text-bad">{t.builder.uploadFailed}</span>}
        {nestBlocked && !uploadBlocked && (
          <span className="text-xs text-bad">{t.builder.overflow}</span>
        )}
        {offerFit && (
          <button
            type="button"
            className="btn-soft text-xs text-accent"
            onClick={fitToWholeMetre}
            title={t.builder.fitHint}
          >
            {t.builder.fitTo
              .replace("{m}", String((fitTargetMm as number) / 1000))
              .replace("{save}", (fitSavingMm / 10).toFixed(1))}
          </button>
        )}
        {fitNote && <span className="text-xs text-muted">{fitNote}</span>}
        {cartNote && <span className="text-xs text-bad">{cartNote}</span>}
        <nav className="ml-auto flex shrink-0 items-center gap-1" aria-label={t.nav.language}>
          {locales.map((code) => (
            <Link
              key={code}
              href={localizedPath(code, "/order")}
              hrefLang={code}
              className={`num grid min-h-[44px] min-w-[44px] place-items-center rounded-md text-xs uppercase tracking-wider ${
                code === locale ? "bg-ink/10 text-foreground" : "text-muted"
              }`}
            >
              {code}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {added && (
            <Link href={localizedPath(locale, "/checkout")} className="btn btn-ghost">
              {t.builder.checkout}
            </Link>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={added || adding || (!designs.length && films.length === 0)}
            onClick={addOrderToCart}
          >
            {added ? t.builder.added : t.builder.addAllCart}
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden border-x border-line bg-surface">
        <nav className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto thin-scroll border-r border-line bg-paper py-3">
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

        <aside className="relative z-40 flex min-h-0 w-[320px] shrink-0 flex-col overflow-y-auto thin-scroll border-r border-line bg-paper xl:w-[368px]">
          {tab === "images" ? (
            <>
              <div className="shrink-0 space-y-3 p-4 xl:p-5">
                <label className="relative flex cursor-pointer flex-col items-center rounded-2xl bg-accent px-4 py-7 text-center text-white">
                  <span className="text-base font-medium">{t.builder.uploadImage}</span>
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
                  className="min-h-[44px] w-full text-center text-[11px] text-muted hover:text-foreground"
                  onClick={() => void loadDemos()}
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
              <p className="shrink-0 px-4 pb-2 pt-1 text-[11px] uppercase tracking-[0.16em] text-muted xl:px-5">
                {t.builder.uploadedImages}
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto thin-scroll px-4 pb-4 xl:px-5">
                {!ready && <p className="text-xs text-muted">{t.builder.loading}</p>}
                {adding && <p className="text-xs text-muted">{t.builder.uploading}</p>}
                {designs.length === 0 && (
                  <p className="text-xs leading-relaxed text-muted">
                    {fill(t.builder.empty, config, locale)}
                  </p>
                )}
                <ul className="grid gap-2.5">
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
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 xl:p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t.builder.tabText}</p>
              <p className="text-sm text-muted">{t.builder.textHint}</p>
              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={adding}
                onClick={() => void addTextToFilm()}
              >
                {t.builder.addText}
              </button>
            </div>
          )}
        </aside>

        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-3 xl:px-5">
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
            <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />
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
              <label className="flex items-center gap-1.5 text-xs text-muted" title={t.builder.gapHint}>
                {t.builder.gap}
                <input
                  className="field num w-14 py-1 text-center text-xs"
                  inputMode="decimal"
                  value={gapMm ?? config.gapMm}
                  onChange={(e) => setGapMm(Number(e.target.value.replace(",", ".")), config)}
                />
                <span>mm</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted">
                {t.builder.zoom}
                <input
                  type="range"
                  min={25}
                  max={100}
                  step={5}
                  value={Math.min(100, zoomPct)}
                  className="w-24"
                  onChange={(e) => setZoomPct(Number(e.target.value))}
                />
                <span className="num w-10">{Math.min(100, zoomPct)}%</span>
              </label>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 p-4 xl:p-7">
            <FrameCmyk className="pointer-events-none absolute inset-4 z-10 xl:inset-7">
              <span className="sr-only" />
            </FrameCmyk>
            {/* Over the film, not beside it: a warning about the layout should
                sit where the layout is. */}
            <div className="pointer-events-none absolute left-4 top-4 z-20 space-y-1.5">
              {alerts.overlap && <AlertPill tone="bad">{t.builder.overlap}</AlertPill>}
              {alerts.overflow && <AlertPill tone="warn">{t.builder.overflow}</AlertPill>}
              {rejected.length > 0 && (
                <AlertPill tone="bad">
                  {rejected.length} {t.builder.warnWide}
                </AlertPill>
              )}
            </div>
            <CanvasGuard>
              <BuilderCanvas interactive zoomPct={zoomPct} />
            </CanvasGuard>
          </div>
        </section>

        <aside className="relative z-40 flex min-h-0 w-[320px] shrink-0 flex-col overflow-y-auto thin-scroll border-l border-line bg-paper xl:w-[368px]">
          {selectedDesign && (
            <AcrossOffer
              design={selectedDesign}
              config={config}
              gapMm={gapMm}
              t={t}
              className="mx-4 mt-4 w-auto xl:mx-5"
              onTake={(w, h) =>
                updateDesign(selectedDesign.id, { widthMm: w, heightMm: h }, config)
              }
            />
            <PieceProperties
              design={selectedDesign}
              piece={selectedPiece}
              t={t}
              onResize={(w, h) =>
                updateDesign(selectedDesign.id, { widthMm: w, heightMm: h }, config)
              }
              onMove={(x, y) => selectedPiece && movePiece(selectedPiece.id, x, y, config)}
              onDuplicate={() => selectedPiece && duplicatePiece(selectedPiece.id, config)}
              onFill={(metres) => fillWithDesign(selectedDesign.id, metres * 1000, config)}
              freeCopies={freeCopiesFor(selectedDesign.id, config)}
              onFillFree={(extra) =>
                updateDesign(selectedDesign.id, { qty: selectedDesign.qty + extra }, config)
              }
              onQty={(qty) => updateDesign(selectedDesign.id, { qty }, config)}
            />
          )}
          {selectedDesign?.text && (
            <TextProperties
              design={selectedDesign}
              t={t}
              onChange={(patch) => void updateTextDesign(selectedDesign.id, patch, config)}
            />
          )}
          {(
            <>
              <div className="shrink-0 space-y-3 border-b border-line px-4 py-5 xl:px-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                  {t.builder.layout}
                </p>
                <LayoutChoice mode={layoutMode} t={t} onPick={(m) => setLayoutMode(m, config)} />
                <button
                  type="button"
                  className="btn-soft w-full justify-center text-xs"
                  disabled={previewBusy || !placed.length}
                  onClick={() => void downloadPreview()}
                >
                  {previewBusy ? t.builder.previewBuilding : t.builder.downloadPreview}
                </button>
                <p className="text-[11px] leading-relaxed text-muted">{t.builder.previewNote}</p>
                {previewNote && <p className="text-xs text-bad">{previewNote}</p>}
              </div>
              <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-5 xl:px-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t.builder.films}</p>
                <button type="button" className="btn-soft" onClick={newFilm}>
                  + {t.builder.newFilm}
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto thin-scroll px-4 xl:px-5">
                <FilmCard
                  film={liveCard}
                  active
                  locale={locale}
                  trade={false}
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
                    trade={false}
                    onOpen={() => openFilm(f)}
                    onRemove={() => dropFilm(f.id)}
                  />
                ))}
              </div>
              <div className="shrink-0 space-y-3 border-t border-line p-4 xl:p-5">
                {placed.length > 0 && (
                  <FilmSummary
                    designs={designs}
                    placed={placed}
                    lengthMm={lengthMm}
                    config={config}
                    locale={locale}
                    t={t}
                  />
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted">{t.builder.orderTotal}</span>
                  <span className="num text-2xl text-accent">{money(displayJob, locale)}</span>
                </div>
                <p className="num text-xs text-muted">
                  {metersLabel(Number(jobBilled.toFixed(2)), locale)} ·{" "}
                  {filmsCount(jobLengths.length, locale)}
                </p>
                <p className="text-[11px] text-muted">{fill(t.builder.billedHint, config, locale)}</p>
              </div>
            </>
          )}
        </aside>
      </div>

    </div>
  );
}

/**
 * The offer the wasted stripe down the side of the roll pays for: a few
 * millimetres off the artwork, one more copy in every row. Shown only when
 * the trade is small enough to be worth a tap, and it always says what it
 * costs — smaller art — next to what it buys.
 */
function AcrossOffer({
  design,
  config,
  gapMm,
  t,
  className,
  onTake,
}: {
  design: Design;
  config: SiteConfig;
  gapMm: number | null;
  t: ReturnType<typeof useI18n>["t"];
  className?: string;
  onTake: (widthMm: number, heightMm: number) => void;
}) {
  const offer = suggestAcross({
    widthMm: design.widthMm,
    heightMm: design.heightMm,
    usableMm: usableWidthMm(config.rollWidthMm, config.edgeMm),
    gapMm: gapMm ?? config.gapMm,
  });
  if (!offer) return null;
  return (
    <button
      type="button"
      className={`flex w-full shrink-0 flex-col items-start gap-1 border border-accent bg-accent/5 p-3 text-left ${
        className ?? ""
      }`}
      onClick={() => onTake(offer.widthMm, offer.heightMm)}
    >
      <span className="text-sm font-medium text-accent">
        {t.builder.moreAcross
          .replace("{n}", String(offer.toAcross))
          .replace("{m}", String(offer.fromAcross))
          .replace("{w}", (offer.widthMm / 10).toFixed(1))}
      </span>
      <span className="text-[11px] leading-relaxed text-muted">
        {t.builder.moreAcrossHint
          .replace("{shrink}", String(offer.shrinkPct))
          .replace("{gain}", String(offer.gainPct))}
      </span>
    </button>
  );
}

/**
 * The last thing a customer reads before paying: every design on the film, how
 * many copies of it are really placed there, at what size, and how many of it
 * fit in a metre. Counts come from the layout, not from what was asked for —
 * a piece that did not fit is a piece they are not paying for.
 */
function FilmSummary({
  designs,
  placed,
  lengthMm,
  config,
  locale,
  t,
}: {
  designs: Design[];
  placed: PlacedPiece[];
  lengthMm: number;
  config: SiteConfig;
  locale: string;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const roll = rollFromSite(config);
  const rows = designs
    .map((design) => {
      const copies = placed.filter((p) => p.designId === design.id).length;
      const perMetre = copiesForLength(
        {
          designId: design.id,
          widthMm: design.widthMm,
          heightMm: design.heightMm,
          allowRotate: design.allowRotate !== false,
        },
        roll,
        1000
      );
      return { design, copies, perMetre };
    })
    .filter((row) => row.copies > 0);

  if (rows.length === 0) return null;
  const pieces = rows.reduce((sum, row) => sum + row.copies, 0);

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t.builder.onThisFilm}</p>
      <ul className="space-y-2">
        {rows.map(({ design, copies, perMetre }) => (
          <li key={design.id} className="flex items-center gap-3">
            <span className="checker relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
              {liveThumb(design.src, design.previewUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={liveThumb(design.src, design.previewUrl)}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="grid h-full place-items-center text-xs text-muted">—</span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{design.name}</span>
              <span className="num block text-[11px] text-muted">
                {t.builder.piecesShort.replace("{n}", String(copies))} ·{" "}
                {(design.widthMm / 10).toFixed(1)} × {(design.heightMm / 10).toFixed(1)}{" "}
                {t.builder.cm}
                {perMetre > 0 && (
                  <> · {t.builder.perMetre.replace("{n}", String(perMetre))}</>
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="num text-xs text-muted">
        {t.builder.filmTotals
          .replace("{designs}", String(rows.length))
          .replace("{pieces}", t.builder.piecesShort.replace("{n}", String(pieces)))
          .replace("{len}", metersLabel(Number((lengthMm / 1000).toFixed(2)), locale))}
      </p>
    </div>
  );
}

/**
 * Two ways to fill a film, and the trade between them said out loud: mixed is
 * cheaper and lands the customer with a jigsaw to cut; blocks cost a little
 * film and come apart with one cut per design.
 */
function LayoutChoice({
  mode,
  t,
  onPick,
}: {
  mode: LayoutMode;
  t: ReturnType<typeof useI18n>["t"];
  onPick: (mode: LayoutMode) => void;
}) {
  const options: { id: LayoutMode; label: string; hint: string }[] = [
    { id: "mixed", label: t.builder.layoutMixed, hint: t.builder.layoutMixedHint },
    { id: "blocks", label: t.builder.layoutBlocks, hint: t.builder.layoutBlocksHint },
  ];
  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(option.id)}
            className={`flex flex-col items-start gap-1 border p-3 text-left ${
              active ? "border-accent bg-accent/5" : "border-line bg-paper"
            }`}
          >
            <span className={`text-sm font-medium ${active ? "text-accent" : "text-ink"}`}>
              {option.label}
            </span>
            <span className="text-[11px] leading-relaxed text-muted">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A number worth reading at arm's length: small label, big value. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="num mt-0.5 text-lg leading-tight">{value}</p>
    </div>
  );
}

/**
 * Copy stays editable after it lands on the film: reword it, restyle it, and
 * the piece is re-rendered and re-uploaded so the print file follows.
 */
/** Any colour, not a choice of three: a swatch that opens the OS picker, plus hex. */
/** The numbers a customer needs before paying: real size, where it sits, and
 *  whether the file has the resolution to print at that size. */
/** A warning that sits on the film, in the corner, out of the way of the work. */
function AlertPill({ tone, children }: { tone: "bad" | "warn"; children: ReactNode }) {
  return (
    <p
      className={`rounded-lg px-3 py-1.5 text-sm shadow-lg backdrop-blur ${
        tone === "bad" ? "bg-bad/90 text-white" : "bg-warn/90 text-black"
      }`}
    >
      {children}
    </p>
  );
}

function PieceProperties({
  design,
  piece,
  t,
  onResize,
  onMove,
  onDuplicate,
  onQty,
  onFill,
  freeCopies,
  onFillFree,
}: {
  design: Design;
  /** Absent while a design is rejected or the film has not been laid out yet. */
  piece: PlacedPiece | null;
  t: ReturnType<typeof useI18n>["t"];
  onResize: (widthMm: number, heightMm: number) => void;
  onMove: (xMm: number, yMm: number) => void;
  onDuplicate: () => void;
  onQty: (qty: number) => void;
  onFill: (metres: number) => number;
  freeCopies: number;
  onFillFree: (extra: number) => void;
}) {
  const [lockRatio, setLockRatio] = useState(true);
  const [fillMetres, setFillMetres] = useState(1);
  const [filled, setFilled] = useState<number | null>(null);
  const ratio = design.aspectRatio > 0 ? design.aspectRatio : design.widthMm / Math.max(1, design.heightMm);
  const dpi = effectiveDpi(design.pixelW, design.widthMm);
  const dpiOk = dpi >= 150;

  function setWidthCm(cm: number) {
    const w = Math.max(MIN_PIECE_MM, Math.round(cm * 10));
    onResize(w, lockRatio ? Math.max(MIN_PIECE_MM, Math.round(w / Math.max(0.01, ratio))) : design.heightMm);
  }
  function setHeightCm(cm: number) {
    const h = Math.max(MIN_PIECE_MM, Math.round(cm * 10));
    onResize(lockRatio ? Math.max(MIN_PIECE_MM, Math.round(h * ratio)) : design.widthMm, h);
  }

  return (
    <div className="shrink-0 space-y-4 border-b border-line px-4 py-5 xl:px-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t.builder.properties}</p>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <NumField label={`${t.builder.width} (cm)`} value={design.widthMm / 10} onCommit={setWidthCm} />
        <NumField label={`${t.builder.height} (cm)`} value={design.heightMm / 10} onCommit={setHeightCm} />
        <button
          type="button"
          onClick={() => setLockRatio((v) => !v)}
          title={t.builder.ratio}
          className={`btn-soft h-[2.1rem] ${lockRatio ? "text-foreground" : "text-muted"}`}
        >
          {lockRatio ? "⚭" : "⚮"}
        </button>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <NumField
          label="X (cm)"
          value={(piece?.xMm ?? 0) / 10}
          disabled={!piece}
          onCommit={(cm) => piece && onMove(cm * 10, piece.yMm)}
        />
        <NumField
          label="Y (cm)"
          value={(piece?.yMm ?? 0) / 10}
          disabled={!piece}
          onCommit={(cm) => piece && onMove(piece.xMm, cm * 10)}
        />
        <span
          className={`num rounded px-2 py-1.5 text-xs ${
            dpiOk ? "bg-ok/20 text-ok" : "bg-warn/20 text-warn"
          }`}
          title="DPI"
        >
          {Math.round(dpi)} {dpiOk ? t.builder.dpiGood : t.builder.dpiLow}
        </span>
      </div>
      <div className="space-y-2 rounded-lg border border-line bg-surface p-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{t.builder.autoFilm}</p>
        <div className="flex items-center gap-2">
          <select
            className="field num w-16 py-1 text-xs"
            value={fillMetres}
            onChange={(e) => setFillMetres(Number(e.target.value))}
          >
            {[1, 2, 3, 5, 10].map((m) => (
              <option key={m} value={m}>
                {m} m
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-soft flex-1 text-xs"
            onClick={() => {
              const copies = onFill(fillMetres);
              setFilled(copies);
              window.setTimeout(() => setFilled(null), 6000);
            }}
          >
            {t.builder.fillFilm}
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">{t.builder.fillReplaces}</p>
        {filled !== null && (
          <p className="text-[11px] text-muted">
            {filled > 0
              ? t.builder.fillDone.replace("{n}", String(filled))
              : t.builder.fillNone}
          </p>
        )}
        {freeCopies > 0 && (
          <button
            type="button"
            className="btn-soft w-full text-xs text-accent"
            onClick={() => onFillFree(freeCopies)}
            title={t.builder.fillFreeHint}
          >
            {t.builder.fillFree.replace("{n}", String(freeCopies))}
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-soft flex-1" disabled={!piece} onClick={onDuplicate}>
          {t.builder.duplicate}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-soft"
            onClick={() => onQty(Math.max(1, design.qty - 1))}
          >
            −
          </button>
          <span className="num w-8 text-center text-sm">{design.qty}</span>
          <button type="button" className="btn-soft" onClick={() => onQty(design.qty + 1)}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/** A number you can actually type into: commits on blur, reverts nonsense. */
function NumField({
  label,
  value,
  onCommit,
  disabled,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value.toFixed(1));
  useEffect(() => setDraft(value.toFixed(1)), [value]);
  return (
    <label className="grid gap-1 text-xs">
      <span className="text-muted">{label}</span>
      <input
        className="field num py-1.5 text-sm disabled:opacity-40"
        inputMode="decimal"
        disabled={disabled}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft.replace(",", "."));
          if (Number.isFinite(n) && n > 0) onCommit(n);
          else setDraft(value.toFixed(1));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  function commit(next: string) {
    const hex = next.trim().replace(/^#?/, "#");
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex.toLowerCase());
    else setDraft(value);
  }

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="sr-only">{label}</span>
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent p-0"
        title={label}
      />
      <input
        className="field num w-24 py-1 text-xs"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}

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
    <div className="shrink-0 space-y-4 border-b border-line px-4 py-5 xl:px-5">
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
        <ColorField
          label={t.builder.textColor}
          value={spec.fill}
          onChange={(hex) => onChange({ fill: hex })}
        />
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
        <ColorField
          label={t.builder.outlineColor}
          value={spec.stroke}
          onChange={(hex) => onChange({ stroke: hex })}
        />
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
        active ? "bg-line text-foreground" : "text-muted hover:text-foreground"
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
      className={`flex gap-3 rounded-sm border border-line p-3 ${active ? "ring-1 ring-accent bg-surface" : "bg-surface"}`}
    >
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 gap-2 text-left">
        <div className="checker h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          {liveThumb(film.previewSrc) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={liveThumb(film.previewSrc)} alt="" className="h-full w-full object-contain" />
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
        <button type="button" className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center self-start text-sm text-muted hover:text-bad" onClick={onRemove}>
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
      className={`flex items-stretch gap-2 rounded-sm border border-line bg-surface p-2.5 ${
        selected ? "ring-1 ring-accent" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => select(design.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="relative checker h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl">
          {liveThumb(design.src, design.previewUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={liveThumb(design.src, design.previewUrl)}
              alt=""
              className="h-full w-full object-contain"
            />
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
        className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center self-start text-muted hover:text-bad"
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
    <div className="mt-3 rounded-sm border border-line bg-surface p-4">
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
