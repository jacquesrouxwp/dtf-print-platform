"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { PageShell } from "./page-shell";
import { useI18n } from "./providers";
import { localizedPath } from "@/lib/i18n-config";
import { money } from "@/lib/pricing";
import { useCartStore } from "@/store/useCartStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export function AccountClient() {
  const { locale, t } = useI18n();
  const email = useSessionStore((s) => s.email);
  const login = useSessionStore((s) => s.login);
  const logout = useSessionStore((s) => s.logout);
  const orders = useSessionStore((s) => s.orders);
  const drafts = useCartStore((s) => s.drafts);
  const loadSnapshot = useBuilderStore((s) => s.loadSnapshot);
  const config = useSettingsStore((s) => s.config);
  const [value, setValue] = useState("");

  function onLogin(e: FormEvent) {
    e.preventDefault();
    if (value.includes("@")) login(value.trim());
  }

  if (!email) {
    return (
      <PageShell title={t.account.title} lede={t.account.lede}>
        <form onSubmit={onLogin} className="grid max-w-sm gap-3">
          <input
            type="email"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t.common.email}
            className="border border-rule bg-paper px-3 py-2"
          />
          <button type="submit" className="btn btn-primary">
            {t.account.login}
          </button>
        </form>
      </PageShell>
    );
  }

  return (
    <PageShell title={t.account.title} lede={email}>
      <button type="button" onClick={logout} className="text-sm underline">
        {t.account.logout}
      </button>

      <h2 className="mt-10 text-xl">{t.account.drafts}</h2>
      {drafts.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t.account.emptyDrafts}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {drafts.map((d) => (
            <li key={d.id} className="flex items-center justify-between border border-rule px-3 py-3">
              <span>
                {d.name}
                <span className="num ml-3 text-xs text-muted">{d.savedAt.slice(0, 16)}</span>
              </span>
              <Link
                href={localizedPath(locale, "/order")}
                className="text-sm underline"
                onClick={() => loadSnapshot(d.payload, config)}
              >
                {t.account.open}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-xl">{t.account.orders}</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t.account.emptyOrders}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {orders.map((o) => (
            <li key={o.id} className="border border-rule px-3 py-3 text-sm">
              <span className="num">{o.id}</span>
              <span className="mx-3 text-muted">{o.createdAt.slice(0, 10)}</span>
              <span className="num">{money(o.totalIncl, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
