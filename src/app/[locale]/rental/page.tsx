import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
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

  return (
    <PageShell kicker={t.rental.kicker} title={t.rental.title} lede={t.rental.lede} wide>
      <div className="overflow-hidden border border-rule">
        <Image
          src="/press-rental.webp"
          alt={t.rental.photoAlt}
          width={1536}
          height={678}
          priority
          className="h-auto w-full"
        />
      </div>

      <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-rule bg-rule sm:grid-cols-2">
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

      <div className="mt-14 flex flex-wrap gap-3">
        <Link href={localizedPath(lang, "/contact")} className="btn btn-primary">
          {t.rental.cta}
        </Link>
        <Link href={localizedPath(lang, "/order")} className="btn btn-ghost">
          {t.rental.ctaOrder}
        </Link>
      </div>
      <p className="mt-6 text-xs text-muted">{t.rental.note}</p>
    </PageShell>
  );
}
