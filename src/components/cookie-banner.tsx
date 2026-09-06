"use client";

import { useEffect, useState } from "react";
import { useI18n } from "./providers";

const KEY = "dtf-cookie";

export function CookieBanner() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY) && localStorage.getItem("hlv-cookie")) {
        localStorage.setItem(KEY, localStorage.getItem("hlv-cookie") as string);
      }
      setShow(!localStorage.getItem(KEY));
    } catch {
      setShow(false);
    }
  }, []);

  if (!show) return null;

  const choose = (value: string) => {
    localStorage.setItem(KEY, value);
    setShow(false);
  };

  return (
    // On a phone the notice is docked to the bottom edge — full width, no
    // gap under it — instead of floating in mid-air above the fold.
    <div className="fixed inset-x-0 bottom-0 z-50 md:bottom-6 md:left-6 md:right-6">
      <div className="glass mx-auto flex max-w-7xl flex-col gap-3 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex-row md:items-center md:justify-between md:border-t-0 md:pb-4">
        <p className="max-w-2xl text-sm text-muted">{t.cookies.body}</p>
        <div className="flex flex-wrap gap-2 max-md:[&>button]:flex-1">
          <button type="button" className="btn btn-ghost justify-center" onClick={() => choose("necessary")}>
            {t.cookies.reject}
          </button>
          <button type="button" className="btn btn-primary justify-center" onClick={() => choose("all")}>
            {t.cookies.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
