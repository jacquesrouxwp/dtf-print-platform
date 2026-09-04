"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PageShell } from "./page-shell";
import { useI18n } from "./providers";
import { localizedPath } from "@/lib/i18n-config";
import { money, type PriceBreakdown } from "@/lib/pricing";
import { interpolate } from "@/lib/interpolate";
import { useCartStore } from "@/store/useCartStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useSettingsStore } from "@/store/useSettingsStore";

function filmItems(line: ReturnType<typeof useCartStore.getState>["lines"][number]) {
  return line.designs.map((d) => ({
    designId: d.id,
    storageKey: d.storageKey,
    widthMm: d.widthMm,
    heightMm: d.heightMm,
    qty: d.qty,
    trimBox: d.trimBox,
    instances: line.placed
      .filter((p) => p.designId === d.id)
      .map((p) => ({
        id: p.id,
        locked: true,
        xMm: p.xMm,
        yMm: p.yMm,
        rotation: p.rotation,
        widthMm: p.widthMm,
        heightMm: p.heightMm,
        flipX: p.flipX,
      })),
  }));
}

/**
 * Each cart line is its own film, printed on its own strip. Piece coordinates
 * are relative to their film, so the server must never flatten them together.
 */
function cartFilms(lines: ReturnType<typeof useCartStore.getState>["lines"]) {
  return lines.map((line) => ({ id: line.id, gapMm: line.gapMm, items: filmItems(line) }));
}

export function CheckoutClient({
  paidOrderId,
  testKey: testKeyProp,
}: {
  paidOrderId?: string;
  testKey?: string;
}) {
  const { locale, t } = useI18n();
  const lines = useCartStore((s) => s.lines);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);
  const config = useSettingsStore((s) => s.config);
  const addOrder = useSessionStore((s) => s.addOrder);
  const trade = lines.some((l) => l.trade);
  const [pickup, setPickup] = useState(false);
  const [rush, setRush] = useState(false);
  const [method, setMethod] = useState("ideal");
  const [done, setDone] = useState<{ id: string; manifest: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [quote, setQuote] = useState<PriceBreakdown | null>(null);
  const [mollie, setMollie] = useState(false);
  const [testOrder, setTestOrder] = useState(false);
  const testKey =
    testKeyProp ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("test") || ""
      : "");
  const [confirmNeeded, setConfirmNeeded] = useState<PriceBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cartReady, setCartReady] = useState(useCartStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setCartReady(true));
    void useCartStore.persist.rehydrate();
    if (useCartStore.persist.hasHydrated()) setCartReady(true);
    return unsub;
  }, []);

  useEffect(() => {
    const headers: HeadersInit = {};
    if (testKey) headers["x-test-order-key"] = testKey;
    fetch("/api/config", { headers })
      .then((r) => r.json())
      .then((d) => {
        setMollie(Boolean(d.mollie));
        setTestOrder(Boolean(d.testOrder));
      })
      .catch(() => {
        setMollie(false);
        setTestOrder(false);
      });
  }, [testKey]);

  useEffect(() => {
    if (!lines.length) return;
    fetch("/api/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        films: cartFilms(lines),
        trade,
        rush,
        includeShipping: !pickup,
      }),
    })
      .then((r) => r.json())
      .then((d) => setQuote(d.quote))
      .catch(() => setQuote(null));
  }, [lines, trade, rush, pickup]);

  async function submit(confirm = false) {
    if (!mollie && !testOrder) {
      setError(t.checkout.paymentsSoon);
      return;
    }
    if (!lines.length || !quote) return;
    setSending(true);
    setError(null);
    const form = document.querySelector("form");
    if (!form && !confirm) {
      setSending(false);
      return;
    }
    const data = form
      ? Object.fromEntries(new FormData(form).entries())
      : {};
    const orderId = `DTF-${Date.now().toString(36).toUpperCase()}`;
    const films = cartFilms(lines);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        amount: quote.totalIncl,
        method,
        trade,
        rush,
        pickup,
        confirm,
        films,
        customer: { name: data.name, email: data.email },
        testKey: testOrder ? testKey : undefined,
      }),
    });
    const payload = await res.json();
    if (res.status === 409 && payload.requiresConfirmation) {
      setConfirmNeeded(payload.quote);
      setQuote(payload.quote);
      setSending(false);
      return;
    }
    if (!res.ok) {
      setError(payload.error || "checkout failed");
      setSending(false);
      return;
    }
    if (payload.redirectUrl) {
      window.location.href = payload.redirectUrl as string;
      return;
    }
    const manifest = JSON.stringify(
      { orderId: payload.orderId ?? orderId, quote: payload.quote, films, files: payload.files },
      null,
      2
    );
    addOrder({
      id: payload.orderId ?? orderId,
      email: String(data.email || ""),
      createdAt: new Date().toISOString(),
      totalIncl: payload.quote?.totalIncl ?? quote.totalIncl,
      billedMeters: payload.quote?.billedMeters ?? quote.billedMeters,
      manifest,
    });
    clear();
    setDone({ id: payload.orderId ?? orderId, manifest });
    setSending(false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submit(false);
  }

  if (paidOrderId && !done) {
    return (
      <PageShell title={t.checkout.successTitle} lede={t.checkout.successBody}>
        <p className="num text-sm">
          {t.checkout.orderId} {paidOrderId}
        </p>
      </PageShell>
    );
  }

  if (done) {
    return (
      <PageShell title={t.checkout.successTitle} lede={t.checkout.successBody}>
        <p className="num text-sm">
          {t.checkout.orderId} {done.id}
        </p>
      </PageShell>
    );
  }

  if (!cartReady) {
    return <PageShell title={t.checkout.title} lede={t.checkout.lede} />;
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

  const display = quote;

  return (
    <PageShell title={t.checkout.title} lede={t.checkout.lede}>
      <ul className="mb-8 grid gap-3">
        {lines.map((line) => (
          <li key={line.id} className="flex justify-between gap-3 border border-rule px-3 py-3 text-sm">
            <span>
              {t.cart.film} · {line.designs.length} files
            </span>
            <button type="button" className="underline" onClick={() => removeLine(line.id)}>
              {t.cart.remove}
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="grid gap-4">
        <input name="name" required placeholder={t.common.name} className="field" />
        <input name="email" type="email" required placeholder={t.common.email} className="field" />
        <input name="company" placeholder={t.common.company} className="field" />
        <input name="address" required={!pickup} placeholder={t.common.address} className="field" />
        <div className="grid grid-cols-2 gap-3">
          <input name="postcode" placeholder={t.common.postcode} className="border border-rule px-3 py-2" />
          <input name="city" placeholder={t.common.city} className="border border-rule px-3 py-2" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
          {t.checkout.pickup}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} />
          {interpolate(t.checkout.rush, { pct: Math.round(config.rushSurcharge * 100) })}
        </label>
        {trade && <p className="text-sm text-muted">{t.checkout.trade}</p>}
        {mollie && (
          <fieldset className="grid gap-2 text-sm">
            <legend>{t.checkout.method}</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="method"
                checked={method === "ideal"}
                onChange={() => setMethod("ideal")}
              />
              {t.checkout.ideal}
            </label>
          </fieldset>
        )}
        {display && (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt>{t.builder.subtotal}</dt>
              <dd className="num">{money(display.subtotalExcl, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t.builder.shipping}</dt>
              <dd className="num">{money(display.shipping, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{interpolate(t.builder.btw, { pct: String(Math.round(config.btwRate * 100)) })}</dt>
              <dd className="num">{money(display.btw, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-lg">
              <dt>{t.builder.total}</dt>
              <dd className="num">{money(display.totalIncl, locale)}</dd>
            </div>
          </dl>
        )}
        {confirmNeeded && (
          <p className="text-sm text-accent">
            Price updated to {money(confirmNeeded.totalIncl, locale)}. Confirm to continue.
          </p>
        )}
        {error && <p className="text-sm text-bad">{error}</p>}
        {testOrder && <p className="text-sm text-muted">{t.checkout.testNote}</p>}
        {!mollie && !testOrder && <p className="text-sm text-muted">{t.checkout.paymentsSoon}</p>}
        {confirmNeeded ? (
          <button
            type="button"
            disabled={sending || (!mollie && !testOrder)}
            onClick={() => submit(true)}
            className="btn btn-primary"
          >
            Confirm {money(confirmNeeded.totalIncl, locale)}
          </button>
        ) : (
          <button
            type="submit"
            disabled={sending || !display || (!mollie && !testOrder)}
            className="btn btn-primary"
          >
            {testOrder ? t.checkout.testConfirm : mollie ? t.checkout.payIdeal : t.checkout.payDemo}
          </button>
        )}
      </form>
    </PageShell>
  );
}
