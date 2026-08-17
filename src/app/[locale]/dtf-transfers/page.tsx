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
  return pageMetadata(locale, "/dtf-transfers", t.meta.dtfTitle, t.meta.dtfDesc);
}

export default async function DtfPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;

  return (
    <PageShell kicker={t.dtf.kicker} title={t.dtf.title} lede={t.dtf.lede}>
      <h2 className="text-2xl">{t.dtf.what}</h2>
      <p className="mt-3 text-muted">{t.dtf.whatBody}</p>
      <h2 className="mt-12 text-2xl">{t.dtf.specs}</h2>
      <dl className="mt-6 divide-y divide-rule border-y border-rule">
        {t.dtf.specItems.map((item) => (
          <div key={item.k} className="grid gap-1 py-4 md:grid-cols-3">
            <dt className="num text-xs uppercase tracking-wider text-muted">{item.k}</dt>
            <dd className="md:col-span-2">{fill(item.v, c, lang)}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-12 text-2xl">{t.dtf.fabricsTitle}</h2>
      <p className="mt-3 text-muted">{t.dtf.fabrics}</p>
      <h2 className="mt-12 text-2xl">{t.dtf.not}</h2>
      <p className="mt-3 text-muted">{t.dtf.notBody}</p>
    </PageShell>
  );
}
