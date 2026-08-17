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
  return pageMetadata(locale, "/how-to-press", t.meta.pressTitle, t.meta.pressDesc);
}

export default async function PressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;
  const peelPeel = c.peel === "cold" ? t.press.peelCold : t.press.peelHot;

  return (
    <PageShell kicker={t.press.kicker} title={t.press.title} lede={t.press.lede}>
      <ol className="grid gap-8">
        {t.press.steps.map((step, i) => (
          <li key={step.t} className="border-t border-rule pt-6">
            <p className="num text-xs text-accent">{String(i + 1).padStart(2, "0")}</p>
            <h2 className="mt-2 text-xl">{step.t}</h2>
            <p className="mt-2 text-muted">
              {fill(step.d, c, lang).replace("{peelPeel}", peelPeel)}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-xs text-muted">{t.press.warning}</p>
    </PageShell>
  );
}
