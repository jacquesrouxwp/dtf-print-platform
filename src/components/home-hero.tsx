"use client";

import Link from "next/link";
import { localizedPath } from "@/lib/i18n-config";
import { useI18n } from "./providers";

export function HomeHero({ cutoffLine }: { cutoffLine: string }) {
  const { locale, t } = useI18n();
  const L = (p: string) => localizedPath(locale, p);

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 md:py-32">
      <p className="num text-xs uppercase tracking-[0.2em] text-muted">{t.home.kicker}</p>
      <h1 className="font-display mt-6 max-w-4xl text-5xl leading-[1.05] tracking-tight md:text-6xl">
        {t.home.headline}
      </h1>
      <p className="mt-6 max-w-2xl text-xl text-foreground">{t.home.sub}</p>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{t.home.lede}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={L("/order")} className="bg-accent px-5 py-3 text-sm text-white">
          {t.common.startOrder}
        </Link>
        <Link href={L("/samples")} className="border border-border px-5 py-3 text-sm">
          {t.common.samples}
        </Link>
      </div>
      <p className="num mt-6 text-sm text-muted">{cutoffLine}</p>
    </section>
  );
}
