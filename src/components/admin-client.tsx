"use client";

import { FormEvent, useState } from "react";
import { PageShell } from "./page-shell";
import { useI18n } from "./providers";
import { defaultConfig, type SiteConfig } from "@/lib/site-config";
import { useSettingsStore } from "@/store/useSettingsStore";

const ADMIN_FALLBACK = "hlv-admin";

export function AdminClient() {
  const { t } = useI18n();
  const config = useSettingsStore((s) => s.config);
  const setConfig = useSettingsStore((s) => s.setConfig);
  const reset = useSettingsStore((s) => s.reset);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<SiteConfig>(config);

  function unlock(e: FormEvent) {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ADMIN_FALLBACK;
    if (password === expected) {
      setAuthed(true);
      setDraft(config);
    }
  }

  function save(e: FormEvent) {
    e.preventDefault();
    setConfig(draft);
    setSaved(true);
  }

  if (!authed) {
    return (
      <PageShell title={t.admin.title} lede={t.admin.lede}>
        <form onSubmit={unlock} className="grid max-w-sm gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.admin.password}
            className="border border-rule bg-paper px-3 py-2"
          />
          <button className="bg-ink px-4 py-3 text-sm text-paper">{t.admin.unlock}</button>
        </form>
      </PageShell>
    );
  }

  const set = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <PageShell title={t.admin.title} lede={t.admin.lede} wide>
      <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
        {(
          [
            ["brandName", draft.brandName],
            ["email", draft.email],
            ["phone", draft.phone],
            ["kvk", draft.kvk],
            ["btwNumber", draft.btwNumber],
          ] as const
        ).map(([key, value]) => (
          <label key={key} className="grid gap-1 text-sm">
            {key}
            <input
              className="border border-rule bg-paper px-3 py-2"
              value={value}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        <Num label="rollWidthMm" value={draft.rollWidthMm} onChange={(v) => set("rollWidthMm", v)} />
        <Num label="cutoffHour" value={draft.cutoffHour} onChange={(v) => set("cutoffHour", v)} />
        <Num label="cutoffMinute" value={draft.cutoffMinute} onChange={(v) => set("cutoffMinute", v)} />
        <Num label="minOrderM" value={draft.minOrderM} step={0.1} onChange={(v) => set("minOrderM", v)} />
        <Num label="roundingM" value={draft.roundingM} step={0.1} onChange={(v) => set("roundingM", v)} />
        <Num label="gapMm" value={draft.gapMm} onChange={(v) => set("gapMm", v)} />
        <Num label="edgeMm" value={draft.edgeMm} onChange={(v) => set("edgeMm", v)} />
        <Num label="pressTempC" value={draft.pressTempC} onChange={(v) => set("pressTempC", v)} />
        <Num label="pressTimeSec" value={draft.pressTimeSec} onChange={(v) => set("pressTimeSec", v)} />
        <Num label="washCycles" value={draft.washCycles} onChange={(v) => set("washCycles", v)} />
        <Num label="shippingCost" value={draft.shippingCost} step={0.05} onChange={(v) => set("shippingCost", v)} />
        <Num label="freeShippingFrom" value={draft.freeShippingFrom} onChange={(v) => set("freeShippingFrom", v)} />
        <Num label="tradeDiscount" value={draft.tradeDiscount} step={0.01} onChange={(v) => set("tradeDiscount", v)} />
        {draft.priceTiers.map((tier, i) => (
          <Num
            key={i}
            label={`tier ${tier.upToMeters ?? "100+"} €/m`}
            value={tier.pricePerMeter}
            step={0.05}
            onChange={(v) => {
              const priceTiers = draft.priceTiers.map((t, idx) =>
                idx === i ? { ...t, pricePerMeter: v } : t
              );
              setDraft({ ...draft, priceTiers });
            }}
          />
        ))}
        <div className="md:col-span-2 flex gap-3">
          <button className="bg-accent px-5 py-3 text-sm text-white">{t.admin.save}</button>
          <button
            type="button"
            className="border border-rule px-5 py-3 text-sm"
            onClick={() => {
              reset();
              setDraft(defaultConfig);
            }}
          >
            {t.admin.reset}
          </button>
        </div>
        {saved && <p className="md:col-span-2 text-sm">{t.admin.saved}</p>}
      </form>
    </PageShell>
  );
}

function Num({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <input
        type="number"
        step={step}
        className="num border border-rule bg-paper px-3 py-2"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
