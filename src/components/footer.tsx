"use client";

import Link from "next/link";
import { localizedPath } from "@/lib/i18n-config";
import { interpolate } from "@/lib/interpolate";
import { useI18n } from "./providers";
import { useSettingsStore } from "@/store/useSettingsStore";

export function Footer() {
  const { locale, t } = useI18n();
  const config = useSettingsStore((s) => s.config);
  const L = (path: string) => localizedPath(locale, path);

  return (
    <footer className="border-t border-rule bg-paper-2/70 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-3xl">HLV</p>
          <p className="mt-3 max-w-sm text-sm text-muted">{t.footer.blurb}</p>
          <p className="num mt-6 text-xs text-muted">
            {interpolate(t.footer.imprint, { kvk: config.kvk, btw: config.btwNumber })}
          </p>
        </div>
        <div className="grid gap-2 text-sm">
          <Link href={L("/order")}>{t.nav.order}</Link>
          <Link href={L("/pricing")}>{t.nav.pricing}</Link>
          <Link href={L("/trade")}>{t.nav.trade}</Link>
          <Link href={L("/samples")}>{t.nav.samples}</Link>
          <Link href={L("/studio")}>{t.footer.studio}</Link>
        </div>
        <div className="grid gap-2 text-sm">
          <p className="text-xs uppercase tracking-wider text-muted">{t.footer.legal}</p>
          <Link href={L("/legal/terms")}>{t.meta.legalTerms}</Link>
          <Link href={L("/legal/privacy")}>{t.meta.legalPrivacy}</Link>
          <Link href={L("/legal/returns")}>{t.meta.legalReturns}</Link>
          <Link href={L("/legal/cookies")}>{t.meta.legalCookies}</Link>
          <Link href={L("/contact")}>{t.nav.contact}</Link>
        </div>
      </div>
    </footer>
  );
}
