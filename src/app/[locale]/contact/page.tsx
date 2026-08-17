import type { Metadata } from "next";
import { LeadForm } from "@/components/lead-form";
import { PageShell } from "@/components/page-shell";
import { getDict, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { defaultConfig } from "@/lib/site-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(locale);
  return pageMetadata(locale, "/contact", t.meta.contactTitle, t.meta.contactDesc);
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : "nl";
  const t = getDict(lang);
  const c = defaultConfig;

  return (
    <PageShell kicker={t.contact.kicker} title={t.contact.title} lede={t.contact.lede}>
      <p className="num mb-8 text-sm">
        {c.email}
        <br />
        {c.phone}
        <br />
        {c.addressLine}
      </p>
      <LeadForm
        endpoint="/api/contact"
        fields={["name", "email", "company", "phone", "message"]}
        submitLabel={t.contact.submit}
        success={t.contact.success}
      />
    </PageShell>
  );
}
