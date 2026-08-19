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
  return pageMetadata(locale, "/shipping", t.meta.shippingTitle, t.meta.shippingDesc);
}

export default async function ShippingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;

  return (
    <PageShell kicker={t.shipping.kicker} title={t.shipping.title} lede={fill(t.shipping.lede, c, lang)}>
      <h2 className="text-xl">{t.shipping.zonesTitle}</h2>
      <div className="mt-6 grid gap-6">
        {t.shipping.zones.map((z) => (
          <div key={z.t} className="border-t border-rule pt-4">
            <h3>{z.t}</h3>
            <p className="mt-1 text-sm text-muted">{z.d}</p>
          </div>
        ))}
      </div>
      <NlMap />
      <p className="mt-8 text-sm text-muted">{fill(t.shipping.rates, c, lang)}</p>
    </PageShell>
  );
}

function NlMap() {
  return (
    <svg viewBox="0 0 200 240" className="mt-10 w-full max-w-xs" aria-hidden>
      <rect width="200" height="240" fill="#e7e1d3" />
      <path
        d="M70 20 L120 18 L150 50 L160 90 L145 140 L150 190 L120 220 L80 210 L50 170 L40 110 L55 60 Z"
        fill="#12110e"
      />
      <circle cx="95" cy="118" r="6" fill="#7eb6e4" />
      <text x="108" y="122" fill="#f3efe6" fontSize="10" fontFamily="ui-monospace, monospace">
        HLV
      </text>
      <text x="70" y="95" fill="#7eb6e4" fontSize="8" fontFamily="ui-monospace, monospace">
        AMS
      </text>
      <text x="108" y="145" fill="#7eb6e4" fontSize="8" fontFamily="ui-monospace, monospace">
        UT
      </text>
    </svg>
  );
}
