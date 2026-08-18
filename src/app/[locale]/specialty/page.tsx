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
  return pageMetadata(locale, "/specialty", t.meta.specialtyTitle, t.meta.specialtyDesc);
}

export default async function SpecialtyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);

  return (
    <PageShell kicker={t.specialty.kicker} title={t.specialty.title} lede={t.specialty.lede}>
      <div className="grid gap-6">
        {t.specialty.items.map((item) => (
          <div key={item.t} className="border-t border-rule pt-4">
            <h2 className="text-xl">{item.t}</h2>
            <p className="mt-2 text-sm text-muted">{item.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-muted">{t.specialty.close}</p>
      <Link
        href={localizedPath(lang, "/contact")}
        className="mt-8 inline-block bg-accent px-5 py-3 text-sm text-white"
      >
        {t.specialty.cta}
      </Link>
    </PageShell>
  );
}
