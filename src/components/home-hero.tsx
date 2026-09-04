"use client";

import Link from "next/link";
import { localizedPath } from "@/lib/i18n-config";
import { FrameCmyk } from "./frame-cmyk";
import { useI18n } from "./providers";
import { NestPreview } from "./nest-preview";

export function HomeHero({
  specs,
}: {
  specs: string;
}) {
  const { locale, t } = useI18n();
  const L = (p: string) => localizedPath(locale, p);

  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-8 pt-10 md:pb-10 md:pt-12">
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
        <div>
          <p className="num text-xs uppercase tracking-[0.22em] text-muted">{t.home.kicker}</p>
          <h1 className="font-display mt-5 max-w-xl text-5xl leading-[1.05] tracking-tight md:text-6xl">
            {t.home.headline}
          </h1>
          <p className="mt-5 max-w-md text-xl text-ink">{t.home.sub}</p>
          <div className="mt-8">
            <Link href={L("/order")} className="btn btn-primary">
              {t.common.startOrder}
            </Link>
          </div>
          <p className="num mt-6 text-sm text-muted">{specs}</p>
        </div>
        <FrameCmyk className="bg-surface p-4">
          <NestPreview label={t.home.specExample} />
        </FrameCmyk>
      </div>
    </section>
  );
}
