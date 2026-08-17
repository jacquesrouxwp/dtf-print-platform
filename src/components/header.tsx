"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { localizedPath } from "@/lib/i18n-config";
import { useI18n } from "./providers";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";

type NavKey = keyof typeof import("@/messages/en").en.nav;

const primary: { href: string; key: NavKey }[] = [
  { href: "/order", key: "order" },
  { href: "/pricing", key: "pricing" },
  { href: "/trade", key: "trade" },
];

const more: { href: string; key: NavKey }[] = [
  { href: "/dtf-transfers", key: "dtf" },
  { href: "/dtf-vs", key: "vs" },
  { href: "/how-to-press", key: "press" },
  { href: "/file-guidelines", key: "files" },
  { href: "/samples", key: "samples" },
  { href: "/about", key: "about" },
  { href: "/shipping", key: "shipping" },
  { href: "/faq", key: "faq" },
  { href: "/contact", key: "contact" },
  { href: "/studio", key: "studio" },
];

export function Header() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const cartCount = useCartStore((s) => s.lines.length);
  const btwInclusive = useSettingsStore((s) => s.btwInclusive);
  const setBtwInclusive = useSettingsStore((s) => s.setBtwInclusive);

  const rest = pathname.replace(/^\/(nl|en)/, "") || "/";
  const other = locale === "nl" ? "en" : "nl";

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = rest === href || (href !== "/" && rest.startsWith(href));
    return (
      <Link
        href={localizedPath(locale, href)}
        className={`text-sm tracking-wide ${active ? "text-ink" : "text-muted hover:text-ink"}`}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-3">
        <Link
          href={localizedPath(locale, "/")}
          className="font-display text-2xl leading-none tracking-tight"
        >
          HLV
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {primary.map((item) => (
            <NavLink key={item.href} href={item.href} label={t.nav[item.key]} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => setBtwInclusive(!btwInclusive)}
            className="hidden num text-[11px] uppercase tracking-wider text-muted md:inline"
            aria-pressed={btwInclusive}
          >
            {btwInclusive ? t.common.inclBtw : t.common.exclBtw}
          </button>

          <Link
            href={localizedPath(other, rest)}
            className="num text-[11px] uppercase tracking-wider text-muted hover:text-ink"
            hrefLang={other}
          >
            {other.toUpperCase()}
          </Link>

          <Link
            href={localizedPath(locale, "/account")}
            className="hidden text-sm text-muted hover:text-ink md:inline"
          >
            {t.nav.account}
          </Link>

          <Link
            href={localizedPath(locale, "/checkout")}
            className="relative text-ink"
            aria-label={t.nav.cart}
          >
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="num absolute -right-2 -top-2 bg-accent px-1 text-[10px] text-white">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t.nav.menu}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div className="hidden border-t border-rule md:block">
        <nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 py-2 text-xs text-muted">
          {more.map((item) => (
            <NavLink key={item.href} href={item.href} label={t.nav[item.key]} />
          ))}
        </nav>
      </div>

      {open && (
        <nav className="grid gap-3 border-t border-rule px-4 py-4 md:hidden">
          {primary.concat(more).map((item) => (
            <NavLink key={item.href} href={item.href} label={t.nav[item.key]} />
          ))}
          <Link
            href={localizedPath(locale, "/account")}
            onClick={() => setOpen(false)}
          >
            {t.nav.account}
          </Link>
          <button
            type="button"
            onClick={() => setBtwInclusive(!btwInclusive)}
            className="num text-left text-xs uppercase tracking-wider text-muted"
          >
            {btwInclusive ? t.common.inclBtw : t.common.exclBtw}
          </button>
        </nav>
      )}
    </header>
  );
}
