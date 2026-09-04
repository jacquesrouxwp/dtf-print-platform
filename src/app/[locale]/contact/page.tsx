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
      <p className="mb-8 grid gap-1 text-sm">
        <a href={`mailto:${c.email}`}>{c.email}</a>
        {c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : null}
        <span>{c.addressLine}</span>
        <a href="https://www.instagram.com/dtf_print_studio/" target="_blank" rel="noopener noreferrer">
          {t.footer.socialStudio}
        </a>
        <a href="https://x.com/dtf_print_eu" target="_blank" rel="noopener noreferrer">
          {t.footer.socialEu}
        </a>
        <a href="https://www.pinterest.com/dtf_studio/" target="_blank" rel="noopener noreferrer">
          dtf_studio
        </a>
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
