import type { Metadata } from "next";
import Link from "next/link";
import { FrameCmyk } from "@/components/frame-cmyk";
import { LoopClip } from "@/components/loop-clip";
import { getDict, isLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n-config";
import { money } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { defaultConfig } from "@/lib/site-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/rental", t.meta.rentalTitle, t.meta.rentalDesc);
}

export default async function RentalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;
  const L = (p: string) => localizedPath(lang, p);

  return (
    <article className="mx-auto w-full min-w-0 max-w-[1200px] overflow-x-clip px-4 py-16 md:py-24">
      <section className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.72fr)]">
        <div>
          <p className="num text-xs uppercase tracking-[0.2em] text-muted">{t.rental.kicker}</p>
          <h1 className="font-display mt-5 max-w-xl text-4xl leading-[1.08] tracking-tight break-words md:text-6xl">
            {t.rental.title}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">{t.rental.lede}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={L("/contact")} className="btn btn-primary min-h-11">
              {t.rental.cta}
            </Link>
            <Link href={L("/order")} className="btn btn-ghost min-h-11">
              {t.rental.ctaOrder}
            </Link>
          </div>
        </div>
        <FrameCmyk className="mx-auto w-full max-w-[320px] md:mx-0 md:max-w-none">
          <LoopClip
            src="/rental-press.mp4"
            poster="/rental-press.jpg"
            label={t.rental.videoLabel}
          />
        </FrameCmyk>
      </section>

      <FrameCmyk className="mt-14 min-w-0 max-w-full overflow-x-clip bg-paper px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-14">
      <div className="grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-2">
        <div className="bg-bg p-6">
          <p className="num text-3xl text-accent">
            {money(c.pressHirePerHour, lang)}
            <span className="text-base text-muted"> / {t.rental.hour}</span>
          </p>
          <p className="mt-2 text-sm text-muted">{t.rental.ratePlain}</p>
        </div>
        <div className="bg-bg p-6">
          <p className="num text-3xl text-accent">
            {money(c.pressHireWithOrder, lang)}
            <span className="text-base text-muted"> / {t.rental.hour}</span>
          </p>
          <p className="mt-2 text-sm text-muted">{t.rental.rateWithOrder}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        {c.pressHireMinHours === 0.5
          ? t.rental.minimumHalf
          : t.rental.minimum.replace("{hours}", String(c.pressHireMinHours))}
      </p>

      <h2 className="font-display mt-14 text-2xl">{t.rental.forWhoTitle}</h2>
      <div className="mt-6 divide-y divide-rule border-y border-rule">
        {t.rental.forWho.map((item) => (
          <div key={item.t} className="grid gap-2 py-5 md:grid-cols-3">
            <h3 className="text-base">{item.t}</h3>
            <p className="text-sm text-muted md:col-span-2">{item.d}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display mt-14 text-2xl">{t.rental.kitTitle}</h2>
      <ul className="mt-6 grid gap-3 text-sm text-muted sm:grid-cols-2">
        {t.rental.kit.map((line) => (
          <li key={line} className="border-l-2 border-accent/40 pl-4">
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-10 text-xs text-muted">{t.rental.note}</p>
      </FrameCmyk>
    </article>
  );
}
