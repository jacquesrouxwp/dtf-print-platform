import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { getDict, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/about", t.meta.aboutTitle, t.meta.aboutDesc);
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);

  return (
    <PageShell kicker={t.about.kicker} title={t.about.title}>
      <div className="grid max-w-2xl gap-6 text-lg leading-relaxed">
        <p>{t.about.p1}</p>
        <p>{t.about.p2}</p>
        <p>{t.about.p3}</p>
        <p className="text-muted">{t.about.p4}</p>
      </div>
    </PageShell>
  );
}
