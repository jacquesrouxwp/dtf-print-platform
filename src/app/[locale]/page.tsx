import Link from "next/link";
import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import { ProductGrid } from "@/components/product-grid";
import { getDict, isLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/seo";
import { defaultConfig, formatCutoff, rollWidthCm } from "@/lib/site-config";
import { fill } from "@/lib/tokens";
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
  const cutoff = formatCutoff(c, lang);
  const width = String(rollWidthCm(c));

  const products = t.home.slides
    .filter((s) => s.id !== "studio")
    .slice(0, 4)
    .map((s) => ({
      id: s.id,
      tag: s.tag,
      title: s.title,
      body: s.body,
      meta: s.meta,
      ctaLabel: s.ctaLabel,
      ctaHref: L(s.ctaHref),
    }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "HLV",
    description: t.meta.homeDesc,
    url: "https://hlv.film",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Hilversum",
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

      <HomeHero cutoffLine={fill(t.home.cutoffLine, c, lang)} />

      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-24 md:py-32">
          <ProductGrid products={products} />
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-3 px-4 py-10 text-sm text-muted">
          {t.home.trust.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-24 md:py-32">
          <p className="num text-xs uppercase tracking-[0.2em] text-muted">{t.home.howKicker}</p>
          <h2 className="font-display mt-6 text-3xl md:text-4xl">{t.home.howTitle}</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {t.home.steps.map((step) => (
              <div key={step.n} className="border-t border-border pt-6">
                <p className="num text-xs text-accent">{step.n}</p>
                <h3 className="mt-3 text-xl">{step.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{fill(step.d, c, lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-24 md:py-32">
          <p className="num text-xs uppercase tracking-[0.2em] text-muted">{t.home.whyKicker}</p>
          <h2 className="font-display mt-6 max-w-3xl text-3xl md:text-4xl">{t.home.whyTitle}</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {t.home.why.map((item) => (
              <div key={item.t}>
                <h3 className="text-xl">{item.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{fill(item.d, c, lang)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-24 md:py-32">
          <p className="num text-xs uppercase tracking-[0.2em] text-muted">{t.home.whoKicker}</p>
          <h2 className="font-display mt-6 text-3xl md:text-4xl">{t.home.whoTitle}</h2>
          <div className="mt-10 divide-y divide-border border-y border-border">
            {t.home.who.map((item) => (
              <div key={item.t} className="grid gap-2 py-6 md:grid-cols-3">
                <h3 className="text-base">{item.t}</h3>
                <p className="text-sm text-muted md:col-span-2">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 md:grid-cols-2 md:py-32">
          <div>
            <p className="num text-xs uppercase tracking-[0.2em] text-muted">{t.home.specKicker}</p>
            <h2 className="font-display mt-6 text-3xl md:text-4xl">{t.home.specTitle}</h2>
            <p className="mt-6 text-sm leading-relaxed text-muted">{fill(t.home.specBody, c, lang)}</p>
            <p className="num mt-6 text-sm">
              {width} cm · {cutoff} · {money(c.priceTiers[0].pricePerMeter, lang)} / m
            </p>
          </div>
          <RollDiagram locale={lang} label={t.home.specExample} />
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center md:py-32">
          <h2 className="font-display text-3xl md:text-4xl">{t.home.sampleTitle}</h2>
          <p className="mx-auto mt-6 max-w-xl text-muted">{t.home.sampleBody}</p>
          <Link
            href={L("/samples")}
            className="mt-6 inline-block bg-accent px-5 py-3 text-sm text-white"
          >
            {t.common.requestSamples}
          </Link>
        </div>
      </section>
    </>
  );
}

function RollDiagram({ locale, label }: { locale: string; label: string }) {
  return (
    <div className="border border-border p-5">
      <p className="num mb-4 text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <svg viewBox="0 0 550 320" className="w-full" role="img" aria-label="55 cm roll">
        <rect x="1" y="1" width="548" height="318" fill="#f3efe6" stroke="#12110e" />
        <rect x="10" y="10" width="530" height="10" fill="#d4cec0" />
        <rect x="24" y="32" width="80" height="80" fill="#12110e" />
        <rect x="114" y="32" width="180" height="54" fill="#e22b12" />
        <rect x="304" y="32" width="60" height="60" fill="#12110e" />
        <rect x="374" y="32" width="160" height="50" fill="#12110e" />
        <rect x="24" y="122" width="70" height="88" fill="#12110e" />
        <rect x="104" y="122" width="70" height="88" fill="#12110e" />
        <rect x="184" y="122" width="80" height="80" fill="#12110e" />
        <rect x="274" y="122" width="60" height="60" fill="#12110e" />
        <line x1="1" y1="230" x2="549" y2="230" stroke="#e22b12" strokeDasharray="6 4" />
        <text x="16" y="258" fill="#e22b12" fontFamily="ui-monospace, monospace" fontSize="16">
          0.8 m ·{" "}
          {locale === "nl"
            ? "€7,56 excl. btw"
            : locale === "ru"
              ? "€7,56 без НДС"
              : "€7.56 excl. BTW"}
        </text>
        <text x="16" y="286" fill="#6f6b61" fontFamily="ui-monospace, monospace" fontSize="12">
          55 cm
        </text>
      </svg>
    </div>
  );
}
