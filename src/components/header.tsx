"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { locales, localizedPath } from "@/lib/i18n-config";
import { useI18n } from "./providers";
import { useCartStore } from "@/store/useCartStore";
import { useSettingsStore } from "@/store/useSettingsStore";

type NavKey = keyof typeof import("@/messages/en").en.nav;

const primary: { href: string; key: NavKey }[] = [
  { href: "/pricing", key: "pricing" },
  { href: "/trade", key: "trade" },
];

const more: { href: string; key: NavKey }[] = [
  { href: "/dtf-transfers", key: "dtf" },
  { href: "/uv-dtf", key: "uv" },
  { href: "/specialty", key: "specialty" },
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

  const rest = pathname.replace(/^\/(nl|en|ru)/, "") || "/";

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = rest === href || (href !== "/" && rest.startsWith(href));
    return (
      <Link
        href={localizedPath(locale, href)}
        className={`rounded-full px-2 py-1 text-sm tracking-wide ${
          active ? "text-foreground" : "text-muted hover:text-foreground"
        }`}
        onClick={() => setOpen(false)}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/55 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-3">
        <Link
          href={localizedPath(locale, "/")}
          className="font-display text-2xl leading-none tracking-tight"
        >
          HLV
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          {primary.map((item) => (
            <NavLink key={item.href} href={item.href} label={t.nav[item.key]} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <Link
            href={localizedPath(locale, "/order")}
            className="btn btn-primary"
            onClick={() => setOpen(false)}
          >
            {t.nav.order}
          </Link>
          <button
            type="button"
            onClick={() => setBtwInclusive(!btwInclusive)}
            className="btn-soft hidden num uppercase tracking-wider text-muted md:inline-flex"
            aria-pressed={btwInclusive}
          >
            {btwInclusive ? t.common.inclBtw : t.common.exclBtw}
          </button>

          <nav className="hidden items-center rounded-full border border-white/12 p-0.5 md:flex" aria-label={t.nav.language}>
            {locales.map((code) => (
              <Link
                key={code}
                href={localizedPath(code, rest)}
                hrefLang={code}
                className={`num rounded-full px-2.5 py-1 text-xs uppercase tracking-wider ${
                  code === locale ? "bg-white/12 text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {code}
              </Link>
            ))}
          </nav>

          <Link
            href={localizedPath(locale, "/account")}
            className="hidden rounded-full px-2 py-1 text-sm text-muted hover:text-foreground md:inline"
          >
            {t.nav.account}
          </Link>

          <Link
            href={localizedPath(locale, "/checkout")}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-white/12 text-foreground"
            aria-label={t.nav.cart}
          >
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span className="num absolute -right-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 text-white">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/12 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t.nav.menu}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div className="hidden border-t border-white/10 md:block">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 py-2 text-xs text-muted">
          {more.map((item) => (
            <NavLink key={item.href} href={item.href} label={t.nav[item.key]} />
          ))}
        </nav>
      </div>

      {open && (
        <nav className="grid gap-2 border-t border-white/10 px-4 py-4 md:hidden">
          {primary.concat(more).map((item) => (
            <NavLink key={item.href} href={item.href} label={t.nav[item.key]} />
          ))}
          <Link
            href={localizedPath(locale, "/account")}
            className="rounded-full px-2 py-1"
            onClick={() => setOpen(false)}
          >
            {t.nav.account}
          </Link>
          <div className="flex flex-wrap gap-2 pt-2">
            {locales.map((code) => (
              <Link
                key={code}
                href={localizedPath(code, rest)}
                className={`num rounded-full px-3 py-1.5 text-xs uppercase tracking-wider ${
                  code === locale ? "bg-white/12 text-foreground" : "text-muted"
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
