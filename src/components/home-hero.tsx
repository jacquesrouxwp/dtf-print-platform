"use client";

import Link from "next/link";
import HeroCarousel, { type Slide } from "@/components/HeroCarousel";
import { localizedPath } from "@/lib/i18n-config";
import { useI18n } from "./providers";

export function HomeHero({
  cutoffLine,
}: {
  cutoffLine: string;
}) {
  const { locale, t } = useI18n();
  const L = (p: string) => localizedPath(locale, p);

  const slides: Slide[] = t.home.slides.map((s) => ({
    ...s,
    ctaHref: L(s.ctaHref),
  }));

  return (
    <section className="mx-auto grid max-w-7xl items-end gap-12 px-4 pb-16 pt-14 md:pb-24 md:pt-20 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
      <div>
        <p className="num text-[11px] uppercase tracking-[0.22em] text-muted">
          {t.home.kicker}
        </p>
        <h1 className="font-display mt-4 text-5xl leading-[0.95] tracking-tight md:text-7xl">
          {t.home.headline}
        </h1>
        <p className="mt-8 max-w-xl text-xl text-ink md:text-2xl">{t.home.sub}</p>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
          {t.home.lede}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={L("/order")} className="bg-accent px-5 py-3 text-sm text-white">
            {t.common.startOrder}
          </Link>
          <Link href={L("/samples")} className="border border-ink px-5 py-3 text-sm">
            {t.common.samples}
          </Link>
        </div>
        <p className="num mt-8 text-sm text-muted">{cutoffLine}</p>
      </div>
      <HeroCarousel slides={slides} />
    </section>
  );
}
