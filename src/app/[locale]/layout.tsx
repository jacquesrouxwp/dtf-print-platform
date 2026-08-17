import { notFound } from "next/navigation";
import { CookieBanner } from "@/components/cookie-banner";
import { CutoffBar } from "@/components/cutoff-bar";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { I18nProvider } from "@/components/providers";
import { getDict, isLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return [{ locale: "nl" }, { locale: "en" }];
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
      <CutoffBar />
      <Header />
      <main>{children}</main>
      <Footer />
      <CookieBanner />
    </I18nProvider>
  );
}
