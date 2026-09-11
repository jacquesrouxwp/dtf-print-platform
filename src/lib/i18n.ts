import { ar } from "@/messages/ar";
import { de } from "@/messages/de";
import { en } from "@/messages/en";
import { es } from "@/messages/es";
import { fr } from "@/messages/fr";
import { nl } from "@/messages/nl";
import { uk } from "@/messages/uk";

export type { Locale } from "./i18n-config";
export { locales, defaultLocale, isLocale, localizedPath } from "./i18n-config";

export type Dict = typeof en;

const dicts: Record<string, Dict> = { nl, en, uk, fr, de, es, ar };

export function getDict(locale: string): Dict {
  return dicts[locale] ?? nl;
}
