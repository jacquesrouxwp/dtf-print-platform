export const locales = ["nl", "en", "uk", "fr", "de", "es", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "nl";

export const localeNames: Record<Locale, string> = {
  nl: "Nederlands",
  en: "English",
  uk: "Українська",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  ar: "العربية",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function localizedPath(locale: string, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

export function pathWithoutLocale(pathname: string) {
  const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return stripped || "/";
}

export function isRtl(locale: string) {
  return locale === "ar";
}
