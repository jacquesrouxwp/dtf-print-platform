import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import { HomeProcess } from "@/components/home-process";
import { ProductGrid } from "@/components/product-grid";
import { getDict, isLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/seo";
import { defaultConfig, rollWidthCm } from "@/lib/site-config";
import { money } from "@/lib/pricing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/", t.meta.homeTitle, t.meta.homeDesc);
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;
  const L = (p: string) => localizedPath(lang, p);
  const width = String(rollWidthCm(c));
  const specs = `${width} cm · ${money(c.priceTiers[0].pricePerMeter, lang)} / m · min ${c.minOrderM} m`;

  const wanted = ["per-meter", "trade"] as const;
  const products = [
    ...t.home.slides
      .filter((s) => wanted.includes(s.id as (typeof wanted)[number]))
      .map((s) => ({
        id: s.id,
        tag: s.tag,
        title: s.title,
        body: s.body,
        meta: s.meta,
        ctaLabel: s.ctaLabel,
        ctaHref: L(s.ctaHref),
      })),
    {
      id: "samples",
      tag: t.nav.samples,
      title: t.home.sampleTitle.replace(/\.$/, ""),
      body: t.home.sampleBody,
      meta: t.common.samples,
      ctaLabel: t.common.requestSamples,
      ctaHref: L("/samples"),
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "DTF Studio",
    description: t.meta.homeDesc,
    url: "https://dtfstudio.site",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ankeveen",
      addressCountry: "NL",
    },
    areaServed: ["Amsterdam", "Utrecht", "Netherlands"],
    currenciesAccepted: "EUR",
    openingHours: "Mo-Fr 08:00-16:00",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeHero specs={specs} />

      <HomeProcess kicker={t.home.howKicker} steps={t.home.steps} />

      <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-4">
        <ProductGrid products={products} />
      </section>
    </>
  );
}
