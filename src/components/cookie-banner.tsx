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
    <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-6 md:right-6">
      <div className="glass mx-auto flex max-w-7xl flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-sm text-muted">{t.cookies.body}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => choose("necessary")}>
            {t.cookies.reject}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => choose("all")}>
            {t.cookies.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
