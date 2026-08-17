import type { Metadata } from "next";
import { LeadForm } from "@/components/lead-form";
import { PageShell } from "@/components/page-shell";
import { getDict, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/samples", t.meta.samplesTitle, t.meta.samplesDesc);
}

export default async function SamplesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);

  return (
    <PageShell kicker={t.samples.kicker} title={t.samples.title} lede={t.samples.lede}>
      <p className="mb-8 text-sm text-muted">{t.samples.who}</p>
      <LeadForm
        endpoint="/api/samples"
        fields={["name", "email", "company", "address", "postcode", "city"]}
        submitLabel={t.samples.submit}
        success={t.samples.success}
      />
    </PageShell>
  );
}
