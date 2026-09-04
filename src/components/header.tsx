"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { locales, localizedPath } from "@/lib/i18n-config";
import { BrandLogo } from "./brand-logo";
import { useI18n } from "./providers";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";

type NavKey = keyof typeof import("@/messages/en").en.nav;

const primary: { href: string; key: NavKey }[] = [
  { href: "/dtf-transfers", key: "film" },
  { href: "/order", key: "order" },
  { href: "/pricing", key: "pricing" },
];

const more: { href: string; key: NavKey }[] = [
  { href: "/dtf-transfers", key: "dtf" },
  { href: "/dtf-vs", key: "vs" },
  { href: "/how-to-press", key: "press" },
  { href: "/file-guidelines", key: "files" },
  { href: "/rental", key: "rental" },
  { href: "/samples", key: "samples" },
  { href: "/about", key: "about" },
  { href: "/shipping", key: "shipping" },
  { href: "/faq", key: "faq" },
  { href: "/contact", key: "contact" },
];

export function Header() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const cartCount = useCartStore((s) => s.lines.length);
  const btwInclusive = useSettingsStore((s) => s.btwInclusive);
  const setBtwInclusive = useSettingsStore((s) => s.setBtwInclusive);

  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);

  const rest = pathname.replace(/^\/(nl|en|ru)/, "") || "/";

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = rest === href || (href !== "/" && rest.startsWith(href));
    return (
      <Link
        href={localizedPath(locale, href)}
        className={`text-sm tracking-wide ${
          active ? "text-ink" : "text-muted hover:text-ink"
        }`}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1200px] items-center gap-5 px-4 py-3">
        <Link
          href={localizedPath(locale, "/")}
          className="flex items-center"
          aria-label="DTF Studio"
        >
          <BrandLogo height={44} priority />
        </Link>

        <div className="ml-auto flex items-center gap-3 md:gap-5">
          <nav className="hidden items-center text-sm md:flex" aria-label="Primary">
            {primary.map((item, i) => (
              <span key={item.href} className="flex items-center">
                {i > 0 && <span className="px-2 text-muted">·</span>}
                <NavLink href={item.href} label={t.nav[item.key]} />
              </span>
            ))}
          </nav>
          <Link
            href={localizedPath(locale, "/order")}
            className="btn btn-primary"
            onClick={() => setOpen(false)}
          >
            {t.nav.start}
          </Link>
          <button
            type="button"
            onClick={() => setBtwInclusive(!btwInclusive)}
            className="btn-soft hidden num uppercase tracking-wider text-muted md:inline-flex"
            aria-pressed={btwInclusive}
          >
            {btwInclusive ? t.common.inclBtw : t.common.exclBtw}
          </button>

          <nav className="hidden items-center border border-line md:flex" aria-label={t.nav.language}>
            {locales.map((code) => (
              <Link
                key={code}
                href={localizedPath(code, rest)}
                hrefLang={code}
                className={`num px-2.5 py-1 text-xs uppercase tracking-wider ${
                  code === locale ? "bg-line text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {code}
              </Link>
            ))}
          </nav>

          <Link
            href={localizedPath(locale, "/checkout")}
            className="relative grid h-10 w-10 place-items-center border border-line text-ink"
            aria-label={t.nav.cart}
          >
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="num absolute -right-1 -top-1 min-w-4 bg-ink px-1 text-center text-[10px] leading-4 text-paper">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center border border-line md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t.nav.menu}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div className="hidden border-t border-line md:block">
        <nav className="mx-auto flex max-w-[1200px] items-center gap-4 overflow-x-auto px-4 py-2 text-xs text-muted">
          {more.map((item) => (
            <NavLink key={item.href} href={item.href} label={t.nav[item.key]} />
          ))}
        </nav>
      </div>

      {open && (
        <nav className="grid gap-2 border-t border-line px-4 py-4 md:hidden">
          {primary.concat(more).map((item) => (
            <NavLink key={item.href} href={item.href} label={t.nav[item.key]} />
          ))}
          <Link
            href={localizedPath(locale, "/account")}
            className="px-2 py-1"
            onClick={() => setOpen(false)}
          >
            {t.nav.account}
          </Link>
          <div className="flex flex-wrap gap-2 pt-2">
            {locales.map((code) => (
              <Link
                key={code}
                href={localizedPath(code, rest)}
                className={`num border border-line px-3 py-1.5 text-xs uppercase tracking-wider ${
                  code === locale ? "bg-line text-ink" : "text-muted"
                }`}
                onClick={() => setOpen(false)}
              >
                {code}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBtwInclusive(!btwInclusive)}
            className="btn-soft num w-fit uppercase tracking-wider text-muted"
          >
            {btwInclusive ? t.common.inclBtw : t.common.exclBtw}
          </button>
        </nav>
      )}
    </header>
  );
}
