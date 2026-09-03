"use client";

import Link from "next/link";
import { localizedPath } from "@/lib/i18n-config";
import { useI18n } from "./providers";

export function HomeHero({ cutoffLine }: { cutoffLine: string }) {
  const { locale, t } = useI18n();
  const L = (p: string) => localizedPath(locale, p);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:pb-14 md:pt-12">
      <div className="glass px-6 py-10 md:px-12 md:py-16">
        <p className="num text-xs uppercase tracking-[0.22em] text-muted">{t.home.kicker}</p>
        <h1 className="font-display mt-6 max-w-4xl text-5xl leading-[1.05] tracking-tight md:text-6xl">
          {t.home.headline}
        </h1>
        <p className="mt-6 max-w-2xl text-xl text-ink">{t.home.sub}</p>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{t.home.lede}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={L("/order")} className="btn btn-primary">
            {t.common.startOrder}
          </Link>
          <Link href={L("/contact")} className="btn btn-ghost">
            {t.nav.contact}
          </Link>
        </div>
        <p className="num mt-8 text-sm text-muted">{cutoffLine}</p>
      </div>
    </section>
  );
}
