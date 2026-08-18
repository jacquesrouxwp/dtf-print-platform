import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { getDict, isLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/i18n-config";
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
  return pageMetadata(locale, "/file-guidelines", t.meta.filesTitle, t.meta.filesDesc);
}

export default async function FilesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;

  return (
    <PageShell kicker={t.files.kicker} title={t.files.title} lede={t.files.lede}>
      <div className="grid gap-8">
        {t.files.items.map((item) => (
          <div key={item.t} className="border-t border-rule pt-5">
            <h2 className="text-xl">{item.t}</h2>
            <p className="mt-2 text-muted">{fill(item.d, c, lang)}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-12 text-2xl">{t.files.checklist}</h2>
      <ul className="mt-4 grid gap-2 text-sm">
        {t.files.checks.map((item) => (
          <li key={item} className="border-l-2 border-accent pl-3">
            {fill(item, c, lang)}
          </li>
        ))}
      </ul>
      <Link
        href={localizedPath(lang, "/order")}
        className="btn btn-primary mt-10"
      >
        {t.files.cta}
      </Link>
    </PageShell>
  );
}
