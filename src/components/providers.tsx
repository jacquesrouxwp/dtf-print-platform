"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-config";

type I18nValue = { locale: Locale; t: Dict };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  t,
  children,
}: I18nValue & { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
