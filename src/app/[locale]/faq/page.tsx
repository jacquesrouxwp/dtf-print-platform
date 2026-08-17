import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { getDict, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { defaultConfig } from "@/lib/site-config";
import { fill } from "@/lib/tokens";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/faq", t.meta.faqTitle, t.meta.faqDesc);
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: fill(item.a, c, lang) },
    })),
  };

  return (
    <PageShell kicker={t.faq.kicker} title={t.faq.title}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="grid gap-8">
        {t.faq.items.map((item) => (
          <details key={item.q} className="border-t border-rule pt-4" open>
            <summary className="cursor-pointer text-lg">{item.q}</summary>
            <p className="mt-3 text-sm text-muted">{fill(item.a, c, lang)}</p>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
