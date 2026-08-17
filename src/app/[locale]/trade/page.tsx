import type { Metadata } from "next";
import { LeadForm } from "@/components/lead-form";
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
  return pageMetadata(locale, "/trade", t.meta.tradeTitle, t.meta.tradeDesc);
}

export default async function TradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);

  return (
    <PageShell kicker={t.trade.kicker} title={t.trade.title} lede={t.trade.lede}>
      <h2 className="text-xl">{t.trade.gets}</h2>
      <ul className="mt-4 grid gap-2">
        {t.trade.points.map((p) => (
          <li key={p} className="border-l-2 border-accent pl-3 text-sm">
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted">{t.trade.open}</p>
      <p className="num mt-2 text-sm">{fill(t.trade.discount, defaultConfig, lang)}</p>
      <div className="mt-10">
        <LeadForm
          endpoint="/api/trade"
          fields={["name", "email", "company", "kvk", "phone", "message"]}
          submitLabel={t.trade.apply}
          success={t.trade.success}
        />
      </div>
    </PageShell>
  );
}
