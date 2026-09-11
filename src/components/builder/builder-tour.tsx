"use client";

import { useEffect, useRef } from "react";
import { Tour, useTour, type TourStep } from "@/components/ui/product-tour";
import { useI18n } from "../providers";

const STORAGE_KEY = "dtf-builder-tour-v1";
const START_EVENT = "dtf-builder-tour";

export function requestBuilderTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

export function BuilderTour() {
  const { t } = useI18n();
  const tour = useTour(STORAGE_KEY);
  const booted = useRef(false);

  useEffect(() => {
    const start = () => tour.start();
    window.addEventListener(START_EVENT, start);
    return () => window.removeEventListener(START_EVENT, start);
  }, [tour]);

  useEffect(() => {
    if (booted.current || tour.seen()) return;
    booted.current = true;
    const id = window.setTimeout(() => tour.start(), 800);
    return () => window.clearTimeout(id);
  }, [tour]);

  const copy = t.builder.tour;
  const steps: TourStep[] = [
    {
      title: copy.welcomeTitle,
      content: copy.welcomeBody,
      placement: "center",
    },
    {
      target: "[data-tour=upload]",
      title: copy.uploadTitle,
      content: copy.uploadBody,
      placement: "bottom",
    },
    {
      target: "[data-tour=size]",
      title: copy.sizeTitle,
      content: copy.sizeBody,
      placement: "bottom",
    },
    {
      target: "[data-tour=fill]",
      title: copy.fillTitle,
      content: copy.fillBody,
      placement: "top",
    },
    {
      target: "[data-tour=film]",
      title: copy.filmTitle,
      content: copy.filmBody,
      placement: "top",
    },
    {
      target: "[data-tour=cart]",
      title: copy.cartTitle,
      content: copy.cartBody,
      placement: "top",
    },
  ];

  return (
    <Tour
      steps={steps}
      open={tour.open}
      onOpenChange={tour.setOpen}
      index={tour.index}
      onIndexChange={tour.setIndex}
      onFinish={tour.markSeen}
      onSkip={tour.markSeen}
      labels={{
        next: copy.next,
        back: copy.back,
        done: copy.done,
        skip: copy.skip,
        close: copy.skip,
      }}
    />
  );
}

export function TourReplayButton() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="btn-soft shrink-0 text-xs"
      onClick={() => requestBuilderTour()}
    >
      {t.builder.tour.replay}
    </button>
  );
}
