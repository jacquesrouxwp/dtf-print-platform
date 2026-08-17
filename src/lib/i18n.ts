import { en } from "@/messages/en";
import { nl } from "@/messages/nl";
import { ru } from "@/messages/ru";

export type { Locale } from "./i18n-config";
export { locales, defaultLocale, isLocale, localizedPath } from "./i18n-config";

export type Dict = typeof en;

export function getDict(locale: string): Dict {
  if (locale === "en") return en;
  if (locale === "ru") return ru;
  return nl;
}
