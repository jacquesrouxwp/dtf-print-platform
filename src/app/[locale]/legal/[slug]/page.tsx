import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { getDict, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { defaultConfig } from "@/lib/site-config";

const slugs = ["terms", "privacy", "returns", "cookies"] as const;

export function generateStaticParams() {
  return slugs.flatMap((slug) => [
    { locale: "nl", slug },
    { locale: "en", slug },
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = getDict(locale);
  const title =
    slug === "privacy"
      ? t.meta.legalPrivacy
      : slug === "returns"
        ? t.meta.legalReturns
        : slug === "cookies"
          ? t.meta.legalCookies
          : t.meta.legalTerms;
  return pageMetadata(locale, `/legal/${slug}`, title, title);
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !slugs.includes(slug as (typeof slugs)[number])) notFound();
  const t = getDict(locale);
  const title =
    slug === "privacy"
      ? t.legal.privacyTitle
      : slug === "returns"
        ? t.legal.returnsTitle
        : slug === "cookies"
          ? t.legal.cookiesTitle
          : t.legal.termsTitle;

  const body =
    slug === "privacy"
      ? locale === "nl"
        ? [
            "HLV verwerkt persoonsgegevens om orders te drukken, te verzenden en te factureren. Bewaartermijn: zo lang als de orderadministratie wettelijk vereist.",
            "Verwerkers: hosting (Vercel), betalingen (Mollie, zodra geactiveerd), e-mail. EU-dataresidency waar mogelijk.",
            "Je hebt recht op inzage, rectificatie en verwijdering. Mail daarvoor het shopadres.",
          ]
        : [
            "HLV processes personal data to print, ship and invoice orders. Retention follows statutory bookkeeping.",
            "Processors: hosting (Vercel), payments (Mollie when enabled), email. EU data residency preferred.",
            "You can request access, correction or deletion via the shop email.",
          ]
      : slug === "returns"
        ? locale === "nl"
          ? [
              "Transfers zijn maatwerk. Een correct gedrukte order nemen we niet terug.",
              "Als wij fout drukken, herdrukken we. Als het bestand fout was en de bouwer heeft gewaarschuwd, ligt dat bij het bestand.",
              "Meld een herdruk binnen vijf werkdagen met foto’s van de film en de persing.",
            ]
          : [
              "Transfers are made to order. A correctly printed job is not returnable.",
              "If we printed it wrong, we reprint. If the file was wrong and the builder warned you, that sits with the file.",
              "Report a reprint within five working days with photos of the film and the press.",
            ]
        : slug === "cookies"
          ? locale === "nl"
            ? [
                "Noodzakelijke cookies: taal, winkelwagen, bouwer, cookietoestemming.",
                "Analytics alleen na toestemming. Geen trackingads.",
              ]
            : [
                "Necessary cookies: language, cart, builder, consent.",
                "Analytics only after consent. No ad tracking.",
              ]
          : locale === "nl"
            ? [
                "Deze voorwaarden zijn een sjabloon tot de opdrachtgever de definitieve Nederlandse tekst aanlevert.",
                `Opdrachtgever: ${defaultConfig.legalName}, ${defaultConfig.addressLine}. KVK ${defaultConfig.kvk}.`,
                "Je koopt strekkende meters bedrukte DTF-film. Levering volgens de cutoff op de site.",
                "Betaling via iDEAL, kaart of (na acceptatie) op rekening. Eigendom gaat over na betaling.",
                "Nederlands recht. Forum: Midden-Nederland, tenzij dwingend anders.",
              ]
            : [
                "These terms are a template until the client supplies the final Dutch legal text.",
                `Seller: ${defaultConfig.legalName}, ${defaultConfig.addressLine}. KVK ${defaultConfig.kvk}.`,
                "You buy running meters of printed DTF film. Delivery follows the cutoff published on the site.",
                "Payment via iDEAL, card, or (once accepted) on account. Title passes on payment.",
                "Dutch law. Venue: Midden-Nederland unless mandatory law says otherwise.",
              ];

  return (
    <PageShell title={title}>
      <p className="mb-8 text-xs text-muted">{t.legal.template}</p>
      <div className="grid gap-5 text-muted">
        {body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </PageShell>
  );
}
