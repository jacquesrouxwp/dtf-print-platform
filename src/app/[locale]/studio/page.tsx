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
  return pageMetadata(locale, "/studio", t.meta.studioTitle, t.meta.studioDesc);
}

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);

  return (
    <PageShell kicker={t.studio.kicker} title={t.studio.title} lede={t.studio.lede}>
      <p className="text-muted">{t.studio.soon}</p>
      <p className="mt-4 text-sm text-muted">{t.studio.note}</p>
      <div className="mt-10">
        <LeadForm
          endpoint="/api/waitlist"
          fields={["name", "email", "company"]}
          submitLabel={t.studio.wait}
          success={t.studio.success}
        />
      </div>
    </PageShell>
  );
}
