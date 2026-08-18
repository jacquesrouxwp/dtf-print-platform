"use client";

import { useEffect, useState } from "react";
import { formatRemaining, remainingToCutoff } from "@/lib/cutoff";
import { interpolate } from "@/lib/interpolate";
import { formatCutoff } from "@/lib/site-config";
import { useI18n } from "./providers";
import { useSettingsStore } from "@/store/useSettingsStore";

export function CutoffBar() {
  const { locale, t } = useI18n();
  const config = useSettingsStore((s) => s.config);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const tick = () => {
      const r = remainingToCutoff(config);
      const time = formatRemaining(r.hours, r.minutes, locale);
      const cutoff = formatCutoff(config, locale);
      const weekend = !r.sameDay && r.hours >= 24;
      const text = weekend
        ? interpolate(t.cutoff.weekend, { time: cutoff })
        : r.sameDay
          ? interpolate(t.cutoff.within, { time })
          : interpolate(t.cutoff.next, { time: cutoff });
      setLabel(text);
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [config, locale, t]);

  return (
    <div className="bg-accent text-white">
      <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-xs tracking-wide">
        <span className="num">{label}</span>
      </p>
    </div>
  );
}
