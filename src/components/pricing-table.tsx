"use client";

import { money } from "@/lib/pricing";
import { useI18n } from "./providers";
import { useSettingsStore } from "@/store/useSettingsStore";

export function PricingTable({ locale }: { locale: string }) {
  const { t } = useI18n();
  const config = useSettingsStore((s) => s.config);
  const incl = useSettingsStore((s) => s.btwInclusive);
  let lower = 0;

  return (
    <div className="overflow-x-auto border border-rule">
      <table className="w-full text-left">
        <thead className="bg-white/5 text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3 font-normal">{t.pricing.colRange}</th>
            <th className="px-4 py-3 font-normal">
              {t.pricing.colRate} {incl ? t.common.inclBtw : t.common.exclBtw}
            </th>
          </tr>
        </thead>
        <tbody>
          {config.priceTiers.map((tier) => {
            const label =
              tier.upToMeters === null
                ? `${lower}${t.pricing.plus}`
                : `${lower}–${tier.upToMeters}`;
            const rate = incl
              ? tier.pricePerMeter * (1 + config.btwRate)
              : tier.pricePerMeter;
            const row = (
              <tr key={label} className="border-t border-rule">
                <td className="num px-4 py-4">{label} m</td>
                <td className="num px-4 py-4 text-accent">{money(rate, locale)} / m</td>
              </tr>
            );
            lower = tier.upToMeters ?? lower;
            return row;
          })}
        </tbody>
      </table>
    </div>
  );
}
