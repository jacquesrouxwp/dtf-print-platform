import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { getDict, isLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n-config";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/uv-dtf", t.meta.uvTitle, t.meta.uvDesc);
}

export default async function UvPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);

  return (
    <PageShell kicker={t.uv.kicker} title={t.uv.title} lede={t.uv.lede}>
      <p className="text-muted">{t.uv.body}</p>
      <p className="num mt-6 text-sm">{t.uv.rate}</p>
      <Link
        href={localizedPath(lang, "/contact")}
        className="mt-10 inline-block bg-ink px-5 py-3 text-sm text-paper"
      >
        {t.uv.cta}
      </Link>
    </PageShell>
  );
}
