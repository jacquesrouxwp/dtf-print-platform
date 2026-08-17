"use client";

import { useEffect, useState } from "react";
import { useI18n } from "./providers";

const KEY = "hlv-cookie";

export function CookieBanner() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!localStorage.getItem(KEY));
  }, []);

  if (!show) return null;

  const choose = (value: string) => {
    localStorage.setItem(KEY, value);
    setShow(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-rule bg-paper p-4 shadow-[0_-8px_30px_rgba(18,17,14,0.08)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-sm text-muted">{t.cookies.body}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="border border-rule px-3 py-2 text-sm"
            onClick={() => choose("necessary")}
          >
            {t.cookies.reject}
          </button>
          <button
            type="button"
            className="bg-ink px-3 py-2 text-sm text-paper"
            onClick={() => choose("all")}
          >
            {t.cookies.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
