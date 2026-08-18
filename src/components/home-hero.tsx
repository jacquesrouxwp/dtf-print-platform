"use client";

import Link from "next/link";
import { localizedPath } from "@/lib/i18n-config";
import { useI18n } from "./providers";

export function HomeHero({ cutoffLine }: { cutoffLine: string }) {
  const { locale, t } = useI18n();
  const L = (p: string) => localizedPath(locale, p);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 md:pb-14 md:pt-12">
      <div className="glass rounded-[28px] px-6 py-10 md:px-12 md:py-16">
        <p className="num text-center text-xs uppercase tracking-[0.22em] text-muted md:text-left">
          {t.home.kicker}
        </p>
        <h1 className="font-display mx-auto mt-6 max-w-4xl text-center text-5xl leading-[1.05] tracking-tight md:mx-0 md:text-left md:text-6xl">
          {t.home.headline}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xl text-foreground md:mx-0 md:text-left">
          {t.home.sub}
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base leading-relaxed text-muted md:mx-0 md:text-left">
          {t.home.lede}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <Link href={L("/order")} className="btn btn-primary">
            {t.common.startOrder}
          </Link>
          <Link href={L("/samples")} className="btn btn-ghost">
            {t.common.samples}
          </Link>
        </div>
        <p className="num mt-8 text-center text-sm text-muted md:text-left">{cutoffLine}</p>
      </div>
    </section>
  );
}
