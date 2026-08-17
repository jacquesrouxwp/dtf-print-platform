import type { Metadata } from "next";
import { getDict } from "./i18n";
import { localizedPath } from "./i18n-config";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://hlv.film";

export function pageMetadata(
  locale: string,
  path: string,
  title: string,
  description: string
): Metadata {
  const t = getDict(locale);
  const url = `${SITE}${localizedPath(locale, path)}`;
  return {
    title: `${title} · HLV`,
    description,
    alternates: {
      canonical: url,
      languages: {
        nl: `${SITE}${localizedPath("nl", path)}`,
        en: `${SITE}${localizedPath("en", path)}`,
        ru: `${SITE}${localizedPath("ru", path)}`,
        "x-default": `${SITE}${localizedPath("nl", path)}`,
      },
    },
    openGraph: {
      title: `${title} · HLV`,
      description,
      url,
      locale: locale === "nl" ? "nl_NL" : locale === "ru" ? "ru_RU" : "en_GB",
      siteName: "HLV",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: `${title} · HLV`, description },
    keywords: [
      "DTF transfers bestellen",
      "DTF drukwerk Nederland",
      "DTF transfers Amsterdam",
      "DTF Utrecht",
      "DTF per meter",
      t.meta.homeTitle,
    ],
  };
}
