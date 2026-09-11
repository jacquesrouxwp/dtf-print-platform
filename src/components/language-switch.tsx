"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { localeNames, locales, localizedPath, type Locale } from "@/lib/i18n-config";
import { useI18n } from "./providers";
import { cn } from "@/lib/utils";

export function LanguageSwitch({
  pathRest,
  className,
}: {
  pathRest: string;
  className?: string;
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={box} className={cn("relative", className)}>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 border border-line px-2.5 text-xs uppercase tracking-wider"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t.nav.language}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="num">{locale}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute end-0 top-full z-50 mt-1 min-w-[11.5rem] border border-line bg-paper py-1"
        >
          {locales.map((code) => (
            <li key={code} role="option" aria-selected={code === locale}>
              <Link
                href={localizedPath(code, pathRest)}
                hrefLang={code}
                className={cn(
                  "flex min-h-11 items-center px-3 text-sm",
                  code === locale ? "bg-line text-ink" : "text-muted hover:text-ink"
                )}
                onClick={() => setOpen(false)}
              >
                <span className="num w-7 text-xs uppercase tracking-wider">{code}</span>
                <span className={code === "ar" ? "font-normal" : undefined}>
                  {localeNames[code as Locale]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
