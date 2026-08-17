export const locales = ["nl", "en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "nl";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localizedPath(locale: string, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean === "/" ? "" : clean}`;
}
