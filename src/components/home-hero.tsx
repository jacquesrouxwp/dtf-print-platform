"use client";

import Link from "next/link";
import HeroCarousel, { type Slide } from "@/components/HeroCarousel";
import { localizedPath } from "@/lib/i18n-config";
import { Panel } from "./panel";
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
    <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:pb-14 md:pt-12">
      <Panel className="grid items-center gap-10 px-6 py-8 md:px-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
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
        <div className="mx-auto w-full max-w-[420px] lg:mx-0 lg:justify-self-end">
          <HeroCarousel slides={slides} />
        </div>
      </Panel>
    </section>
  );
}
