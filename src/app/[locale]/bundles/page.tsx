import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { bundleOffers } from "@/lib/bundles";
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
  return pageMetadata(locale, "/bundles", t.meta.bundlesTitle, t.meta.bundlesDesc);
}

export default async function BundlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const offers = bundleOffers(defaultConfig);

  return (
    <PageShell kicker={t.bundles.kicker} title={t.bundles.title} lede={t.bundles.lede} wide>
      <div className="grid gap-px overflow-hidden rounded-xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <div key={offer.meters} className="flex flex-col gap-3 bg-bg p-6">
            <p className="num text-3xl">
              {offer.totalMeters} <span className="text-base text-muted">m</span>
            </p>
            <p className="text-sm text-muted">
              {offer.freeMeters > 0
                ? t.bundles.paidPlusFree
                    .replace("{paid}", String(offer.meters))
                    .replace("{free}", String(offer.freeMeters))
                : t.bundles.paidOnly.replace("{paid}", String(offer.meters))}
            </p>
            <p className="num text-2xl text-accent">{money(offer.priceExcl, lang)}</p>
            <p className="text-xs text-muted">
              {t.bundles.effective.replace("{rate}", money(offer.effectiveRate, lang))}
            </p>
            {offer.savingExcl > 0 && (
              <p className="text-xs text-accent">
                {t.bundles.saving.replace("{amount}", money(offer.savingExcl, lang))}
              </p>
            )}
            <Link
              href={localizedPath(lang, "/contact")}
              className="btn btn-ghost mt-auto w-full"
            >
              {t.bundles.buy}
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-3 text-sm text-muted">
        <p>{t.bundles.howItWorks}</p>
        <p>{t.bundles.validity}</p>
      </div>
      <Link href={localizedPath(lang, "/pricing")} className="btn btn-primary mt-10">
        {t.bundles.seePricing}
      </Link>
    </PageShell>
  );
}
