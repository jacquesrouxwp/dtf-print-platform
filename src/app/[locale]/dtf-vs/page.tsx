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
  return pageMetadata(locale, "/dtf-vs", t.meta.vsTitle, t.meta.vsDesc);
}

export default async function VsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;

  return (
    <PageShell kicker={t.vs.kicker} title={t.vs.title} lede={t.vs.lede} wide>
      <div className="overflow-x-auto border border-rule">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-paper-2">
            <tr>
              {t.vs.headers.map((h) => (
                <th key={h || "k"} className="px-3 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.vs.rows.map((row) => (
              <tr key={row[0]} className="border-t border-rule align-top">
                {row.map((cell, i) => (
                  <td key={i} className={`px-3 py-4 ${i === 1 ? "text-ink" : "text-muted"}`}>
                    {fill(cell, c, lang)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-10 text-muted">{t.vs.close}</p>
    </PageShell>
  );
}
