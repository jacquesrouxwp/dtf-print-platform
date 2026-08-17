import { en } from "@/messages/en";
import { nl } from "@/messages/nl";

export type { Locale } from "./i18n-config";
export { locales, defaultLocale, isLocale, localizedPath } from "./i18n-config";

export type Dict = typeof en;

export function getDict(locale: string): Dict {
  return locale === "en" ? en : nl;
}
