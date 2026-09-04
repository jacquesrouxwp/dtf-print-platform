import { notFound } from "next/navigation";
import { PersistHydrate } from "@/components/persist-hydrate";
import { CookieBanner } from "@/components/cookie-banner";
import { AppFrame, FooterSlot, SiteChrome } from "@/components/app-frame";
import { HtmlLang } from "@/components/html-lang";
import { I18nProvider } from "@/components/providers";
import { SiteShell } from "@/components/site-shell";
import { getDict, isLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return [{ locale: "nl" }, { locale: "en" }, { locale: "ru" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);

  return (
    <I18nProvider locale={locale} t={t}>
      <PersistHydrate />
      <HtmlLang locale={locale} />
      <SiteShell>
        {/* One column the height of the viewport: whatever the header and the
            cutoff bar take, `main` gets the rest — no hardcoded offsets. */}
        <AppFrame>
          <SiteChrome />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip">{children}</main>
          <FooterSlot />
          {/* WhatsApp FAB omitted until a business wa.me exists. */}
          <CookieBanner />
        </AppFrame>
      </SiteShell>
    </I18nProvider>
  );
}
