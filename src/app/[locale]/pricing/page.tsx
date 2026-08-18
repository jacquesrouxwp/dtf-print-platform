import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { getDict, isLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n-config";
import { money } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";
import { defaultConfig } from "@/lib/site-config";
import { fill } from "@/lib/tokens";
import { PricingTable } from "@/components/pricing-table";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/pricing", t.meta.pricingTitle, t.meta.pricingDesc);
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;

  return (
    <PageShell kicker={t.pricing.kicker} title={t.pricing.title} lede={fill(t.pricing.lede, c, lang)} wide>
      <p className="mb-8 text-2xl">{t.pricing.noMin}</p>
      <PricingTable locale={lang} />
      <div className="mt-10 grid gap-3 text-sm text-muted">
        <p>{fill(t.pricing.shipping, c, lang)}</p>
        <p>{t.pricing.pickup}</p>
        <p>{fill(t.pricing.tradeNote, c, lang)}</p>
        <p>{fill(t.pricing.minNote, c, lang)}</p>
        {!c.placeholdersConfirmed && <p>{t.common.placeholderNote}</p>}
      </div>
      <Link
        href={localizedPath(lang, "/order")}
        className="btn btn-primary mt-10"
      >
        {t.pricing.cta}
      </Link>
      <p className="num mt-8 text-xs text-muted">
        {money(c.priceTiers[0].pricePerMeter, lang)} / m · {c.rollWidthMm / 10} cm
      </p>
    </PageShell>
  );
}
