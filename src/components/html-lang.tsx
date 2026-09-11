"use client";

import { useEffect } from "react";
import { isRtl } from "@/lib/i18n-config";

export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
