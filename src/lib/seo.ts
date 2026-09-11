import type { Metadata } from "next";
import { getDict } from "./i18n";
import { locales, localizedPath } from "./i18n-config";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dtfstudio.site";

export function pageMetadata(
  locale: string,
  path: string,
  title: string,
  description: string
): Metadata {
  const t = getDict(locale);
  const url = `${SITE}${localizedPath(locale, path)}`;
  const isHome = path === "/" || path === "";
  const fullTitle = isHome ? "DTF Studio" : `${title.replace(/\s*·\s*DTF Studio$/i, "")} · DTF Studio`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(locales.map((code) => [code, `${SITE}${localizedPath(code, path)}`])),
        "x-default": `${SITE}${localizedPath("nl", path)}`,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      locale:
        locale === "nl"
          ? "nl_NL"
          : locale === "uk"
            ? "uk_UA"
            : locale === "fr"
              ? "fr_FR"
              : locale === "de"
                ? "de_DE"
                : locale === "ar"
                  ? "ar_SA"
                  : "en_GB",
      siteName: "DTF Studio",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
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
