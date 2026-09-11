"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";

export type TourPlacement = "top" | "bottom" | "left" | "right" | "auto" | "center";

export type TourStep = {
  target?: string;
  title: string;
  content: React.ReactNode;
  placement?: TourPlacement;
  padding?: number;
};

export type TourLabels = {
  next: string;
  back: string;
  done: string;
  skip: string;
  close: string;
};

export type TourProps = {
  steps: TourStep[];
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  index?: number;
  onIndexChange?: (index: number) => void;
  onFinish?: () => void;
  onSkip?: () => void;
  showProgress?: boolean;
  labels: TourLabels;
  className?: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const SPRING = { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.7 };

export function Tour({
  steps,
  open,
  onOpenChange,
  index: controlledIndex,
  onIndexChange,
  onFinish,
  onSkip,
  showProgress = true,
  labels,
  className,
}: TourProps) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const [indexState, setIndexState] = React.useState(0);
  const index = controlledIndex ?? indexState;
  const setIndex = React.useCallback(
    (i: number) => {
      onIndexChange?.(i);
      setIndexState(i);
    },
    [onIndexChange]
  );

  const cardRef = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [cardSize, setCardSize] = React.useState({ w: 320, h: 168 });
  const [vp, setVp] = React.useState({ w: 1024, h: 768 });

  React.useEffect(() => setMounted(true), []);

  const step = steps[index];
  const count = steps.length;
  const isFirst = index === 0;
  const isLast = index === count - 1;
  const pad = step?.padding ?? 8;

  const finish = React.useCallback(() => {
    onFinish?.();
    onOpenChange?.(false);
    setIndexState(0);
  }, [onFinish, onOpenChange]);

  const skip = React.useCallback(() => {
    onSkip?.();
    onOpenChange?.(false);
    setIndexState(0);
  }, [onSkip, onOpenChange]);

  const next = React.useCallback(() => {
    if (isLast) finish();
    else setIndex(index + 1);
  }, [isLast, finish, index, setIndex]);

  const back = React.useCallback(() => {
    if (!isFirst) setIndex(index - 1);
  }, [isFirst, index, setIndex]);

  React.useEffect(() => {
    if (!open) return;
    const measure = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      if (!step?.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const el = step?.target ? (document.querySelector(step.target) as HTMLElement | null) : null;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center", inline: "nearest" });

    measure();
    const settle = window.setTimeout(measure, reduce ? 0 : 320);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, index, step, reduce]);

  React.useLayoutEffect(() => {
    if (cardRef.current) {
      const r = cardRef.current.getBoundingClientRect();
      setCardSize({ w: r.width, h: r.height });
    }
  }, [index, open, rect]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, back, skip]);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      cardRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus();
    }, 40);
    return () => window.clearTimeout(t);
  }, [open, index]);

  if (!mounted || !open || !step) return null;

  const gap = 14;
  let place: TourPlacement = step.placement ?? "auto";
  if (!rect) place = "center";
  if (place === "auto" && rect) {
    if (rect.top + rect.height + gap + cardSize.h < vp.h) place = "bottom";
    else if (rect.top - gap - cardSize.h > 0) place = "top";
    else if (rect.left + rect.width + gap + cardSize.w < vp.w) place = "right";
    else place = "left";
  }

  let left = vp.w / 2 - cardSize.w / 2;
  let top = vp.h / 2 - cardSize.h / 2;
  if (rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (place === "bottom") {
      left = cx - cardSize.w / 2;
      top = rect.top + rect.height + gap + pad;
    } else if (place === "top") {
      left = cx - cardSize.w / 2;
      top = rect.top - gap - pad - cardSize.h;
    } else if (place === "right") {
      left = rect.left + rect.width + gap + pad;
      top = cy - cardSize.h / 2;
    } else if (place === "left") {
      left = rect.left - gap - pad - cardSize.w;
      top = cy - cardSize.h / 2;
    }
  }
  left = Math.min(Math.max(12, left), vp.w - 12 - cardSize.w);
  top = Math.min(Math.max(12, top), vp.h - 12 - cardSize.h);

  const spot = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const overlayInk = "rgba(17, 17, 17, 0.5)";

  return createPortal(
    <div className={className}>
      <AnimatePresence>
        <motion.div
          key="tour-layer"
          className="fixed inset-0 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={step.title}
        >
          {spot ? (
            <motion.div
              className="pointer-events-none absolute"
              initial={false}
              animate={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
              transition={reduce ? { duration: 0 } : SPRING}
              style={{
                boxShadow: `0 0 0 9999px ${overlayInk}`,
                outline: "1px solid var(--ink)",
                outlineOffset: 2,
              }}
            />
          ) : (
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ background: overlayInk }}
            />
          )}

          <motion.div
            ref={cardRef}
            className="absolute w-[320px] max-w-[calc(100vw-24px)] border border-line bg-paper p-4"
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1, left, top }}
            transition={reduce ? { duration: 0 } : SPRING}
            style={{ left, top }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-base leading-snug text-ink">{step.title}</h3>
              <button
                type="button"
                onClick={skip}
                aria-label={labels.close}
                className="grid h-11 w-11 shrink-0 place-items-center text-muted hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-2 text-sm leading-relaxed text-muted">{step.content}</div>

            <div className="mt-4 flex items-center justify-between gap-2">
              {showProgress ? (
                <div className="flex items-center gap-1.5" aria-hidden>
                  {steps.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-none transition-all ${
                        i === index ? "w-4 bg-ink" : "w-1.5 bg-line"
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <span className="num text-[11px] text-muted">
                  {index + 1} / {count}
                </span>
              )}

              <div className="flex items-center gap-1.5">
                {!isFirst && (
                  <button type="button" onClick={back} className="btn btn-ghost min-h-11 px-3 text-xs">
                    {labels.back}
                  </button>
                )}
                <button
                  type="button"
                  data-tour-primary
                  onClick={next}
                  className="btn btn-primary min-h-11 px-3 text-xs"
                >
                  {isLast ? labels.done : labels.next}
                  {!isLast && <ArrowRight size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}

export function useTour(storageKey?: string) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  const seen = React.useCallback(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  }, [storageKey]);

  const start = React.useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  const markSeen = React.useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      return;
    }
  }, [storageKey]);

  return { open, setOpen, index, setIndex, start, seen, markSeen };
}
