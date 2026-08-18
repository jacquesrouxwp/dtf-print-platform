"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { PageShell } from "./page-shell";
import { useI18n } from "./providers";
import { localizedPath } from "@/lib/i18n-config";
import { money, quoteFilm } from "@/lib/pricing";
import { interpolate } from "@/lib/interpolate";
import { useCartStore } from "@/store/useCartStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export function CheckoutClient() {
  const { locale, t } = useI18n();
  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);
  const config = useSettingsStore((s) => s.config);
  const addOrder = useSessionStore((s) => s.addOrder);
  const [pickup, setPickup] = useState(false);
  const [rush, setRush] = useState(false);
  const [trade, setTrade] = useState(false);
  const [method, setMethod] = useState("ideal");
  const [done, setDone] = useState<{ id: string; manifest: string } | null>(null);
  const [sending, setSending] = useState(false);

  const totals = useMemo(() => {
    const lengthMm = lines.reduce((a, l) => a + l.lengthMm, 0);
    return quoteFilm(lengthMm, config, {
      trade,
      rush,
      includeShipping: !pickup,
    });
  }, [lines, config, trade, rush, pickup]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lines.length) return;
    setSending(true);
    const form = Object.fromEntries(new FormData(e.currentTarget).entries());
    const orderId = `HLV-${Date.now().toString(36).toUpperCase()}`;
    const items = lines.flatMap((line) =>
      line.designs.map((d) => ({
        designId: d.name,
        widthMm: d.widthMm,
        heightMm: d.heightMm,
        qty: d.qty,
      }))
    );
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        amount: totals.totalIncl,
        method,
        trade,
        rush,
        pickup,
        items,
        customer: { name: form.name, email: form.email },
      }),
    });
    const data = await res.json();
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl as string;
      return;
    }
    const charged = data.quote?.totalIncl ?? totals.totalIncl;
    const manifest = JSON.stringify(
      { orderId: data.orderId ?? orderId, quote: data.quote, items, files: data.files },
      null,
      2
    );
    addOrder({
      id: data.orderId ?? orderId,
      email: String(form.email || ""),
      createdAt: new Date().toISOString(),
      totalIncl: charged,
      billedMeters: data.quote?.billedMeters ?? totals.billedMeters,
      manifest,
    });
    clear();
    setDone({ id: data.orderId ?? orderId, manifest });
    setSending(false);
  }

  if (done) {
    const blob = typeof window !== "undefined"
      ? URL.createObjectURL(new Blob([done.manifest], { type: "application/json" }))
      : "#";
    return (
      <PageShell title={t.checkout.successTitle} lede={t.checkout.successBody}>
        <p className="num text-sm">
          {t.checkout.orderId} {done.id}
        </p>
        <a href={blob} download={`${done.id}.json`} className="mt-6 inline-block bg-ink px-5 py-3 text-sm text-paper">
          {t.checkout.manifest}
        </a>
      </PageShell>
    );
  }

  if (!lines.length) {
    return (
      <PageShell title={t.checkout.title} lede={t.cart.empty}>
        <Link href={localizedPath(locale, "/order")} className="underline">
          {t.common.startOrder}
        </Link>
      </PageShell>
    );
  }

  const hasMollie = false;

  return (
    <PageShell title={t.checkout.title} lede={t.checkout.lede}>
      <ul className="mb-8 grid gap-3">
        {lines.map((line) => (
          <li key={line.id} className="flex justify-between border border-rule px-3 py-3 text-sm">
            <span>
              {t.cart.film} · {line.billedMeters.toFixed(1)} m
            </span>
            <span className="num">{money(line.subtotalExcl, locale)}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="grid gap-4">
        <input name="name" required placeholder={t.common.name} className="border border-rule bg-paper px-3 py-2" />
        <input name="email" type="email" required placeholder={t.common.email} className="border border-rule bg-paper px-3 py-2" />
        <input name="company" placeholder={t.common.company} className="border border-rule bg-paper px-3 py-2" />
        <input name="address" required={!pickup} placeholder={t.common.address} className="border border-rule bg-paper px-3 py-2" />
        <div className="grid grid-cols-2 gap-3">
          <input name="postcode" placeholder={t.common.postcode} className="border border-rule bg-paper px-3 py-2" />
          <input name="city" placeholder={t.common.city} className="border border-rule bg-paper px-3 py-2" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
          {t.checkout.pickup}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} />
          {interpolate(t.checkout.rush, { pct: Math.round(config.rushSurcharge * 100) })}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={trade} onChange={(e) => setTrade(e.target.checked)} />
          {t.checkout.trade}
        </label>
        <fieldset className="grid gap-2 text-sm">
          <legend>{t.checkout.method}</legend>
          {[
            ["ideal", t.checkout.ideal],
            ["bancontact", t.checkout.bancontact],
            ["card", t.checkout.card],
            ["invoice", t.checkout.invoice],
          ].map(([id, label]) => (
            <label key={id} className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                checked={method === id}
                onChange={() => setMethod(id)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <p className="num text-2xl text-accent">{money(totals.totalIncl, locale)}</p>
        <p className="text-xs text-muted">{t.checkout.demoNote}</p>
        <button type="submit" disabled={sending} className="bg-accent px-5 py-3 text-sm text-white">
          {hasMollie ? t.checkout.payIdeal : t.checkout.payDemo}
        </button>
      </form>
    </PageShell>
  );
}
