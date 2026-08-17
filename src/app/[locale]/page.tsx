import Link from "next/link";
import type { Metadata } from "next";
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

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 md:pb-24 md:pt-20">
        <p className="num text-[11px] uppercase tracking-[0.22em] text-muted">
          {t.home.kicker}
        </p>
        <h1 className="font-display mt-4 max-w-5xl text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          {t.home.headline}
        </h1>
        <p className="mt-8 max-w-2xl text-xl text-ink md:text-2xl">{t.home.sub}</p>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
          {t.home.lede}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={L("/order")} className="bg-accent px-5 py-3 text-sm text-white">
            {t.common.startOrder}
          </Link>
          <Link href={L("/samples")} className="border border-ink px-5 py-3 text-sm">
            {t.common.samples}
          </Link>
        </div>
        <p className="num mt-8 text-sm text-muted">
          {fill(t.home.cutoffLine, c, lang)}
        </p>
      </section>

      <section className="border-y border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-2 px-4 py-4 text-sm text-muted">
          {t.home.trust.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <p className="num text-[11px] uppercase tracking-[0.22em] text-muted">
          {t.home.howKicker}
        </p>
        <h2 className="font-display mt-3 text-3xl md:text-5xl">{t.home.howTitle}</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {t.home.steps.map((step) => (
            <div key={step.n} className="border-t border-rule pt-6">
              <p className="num text-xs text-accent">{step.n}</p>
              <h3 className="mt-3 text-xl">{step.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {fill(step.d, c, lang)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <p className="num text-[11px] uppercase tracking-[0.22em] text-paper/50">
            {t.home.whyKicker}
          </p>
          <h2 className="font-display mt-3 max-w-3xl text-3xl md:text-5xl">
            {t.home.whyTitle}
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {t.home.why.map((item) => (
              <div key={item.t}>
                <h3 className="text-lg">{item.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-paper/70">
                  {fill(item.d, c, lang)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <p className="num text-[11px] uppercase tracking-[0.22em] text-muted">
          {t.home.whoKicker}
        </p>
        <h2 className="font-display mt-3 text-3xl md:text-5xl">{t.home.whoTitle}</h2>
        <div className="mt-10 divide-y divide-rule border-y border-rule">
          {t.home.who.map((item) => (
            <div key={item.t} className="grid gap-2 py-6 md:grid-cols-3">
              <h3 className="text-base">{item.t}</h3>
              <p className="text-sm text-muted md:col-span-2">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-rule bg-paper-2">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2">
          <div>
            <p className="num text-[11px] uppercase tracking-[0.22em] text-muted">
              {t.home.specKicker}
            </p>
            <h2 className="font-display mt-3 text-3xl md:text-5xl">{t.home.specTitle}</h2>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              {fill(t.home.specBody, c, lang)}
            </p>
            <p className="num mt-6 text-sm">
              {width} cm · {cutoff} · {money(c.priceTiers[0].pricePerMeter, lang)} / m
            </p>
          </div>
          <RollDiagram locale={lang} label={t.home.specExample} />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h2 className="font-display text-4xl md:text-6xl">{t.home.sampleTitle}</h2>
        <p className="mx-auto mt-6 max-w-xl text-muted">{t.home.sampleBody}</p>
        <Link
          href={L("/samples")}
          className="mt-8 inline-block bg-ink px-5 py-3 text-sm text-paper"
        >
          {t.common.requestSamples}
        </Link>
      </section>
    </>
  );
}

function RollDiagram({ locale, label }: { locale: string; label: string }) {
  return (
    <div className="border border-rule bg-paper p-5">
      <p className="num mb-4 text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
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
          0.8 m · {locale === "nl" ? "€7,56 excl. btw" : "€7.56 excl. BTW"}
        </text>
        <text x="16" y="286" fill="#6f6b61" fontFamily="ui-monospace, monospace" fontSize="12">
          55 cm
        </text>
      </svg>
    </div>
  );
}
