import { notFound } from "next/navigation";
import { CookieBanner } from "@/components/cookie-banner";
import { CutoffBar } from "@/components/cutoff-bar";
import { FooterSlot } from "@/components/footer-slot";
import { Header } from "@/components/header";
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
      <HtmlLang locale={locale} />
      <SiteShell>
        {/* One column the height of the viewport: whatever the header and the
            cutoff bar take, `main` gets the rest — no hardcoded offsets. */}
        <div className="flex min-h-dvh flex-col">
          <CutoffBar />
          <Header />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          <FooterSlot />
          <CookieBanner />
        </div>
      </SiteShell>
    </I18nProvider>
  );
}
