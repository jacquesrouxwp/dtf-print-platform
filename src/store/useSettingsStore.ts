"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/lib/safe-storage";
import {
  CONFIG_STORAGE_KEY,
  defaultConfig,
  type SiteConfig,
} from "@/lib/site-config";

type SettingsState = {
  config: SiteConfig;
  btwInclusive: boolean;
  setConfig: (config: SiteConfig) => void;
  patchConfig: (patch: Partial<SiteConfig>) => void;
  setBtwInclusive: (value: boolean) => void;
  reset: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      btwInclusive: false,
      setConfig: (config) => set({ config: { ...defaultConfig, ...config } }),
      patchConfig: (patch) =>
        set((s) => ({ config: { ...s.config, ...patch } })),
      setBtwInclusive: (btwInclusive) => set({ btwInclusive }),
      reset: () => set({ config: defaultConfig }),
    }),
    {
      name: CONFIG_STORAGE_KEY,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ config: s.config, btwInclusive: s.btwInclusive }),
      merge: (persisted, current) => {
        const p = persisted as Partial<SettingsState> | undefined;
        return {
          ...current,
          ...p,
          config: { ...defaultConfig, ...(p?.config ?? {}) },
        };
      },
    }
  )
);

if (typeof window !== "undefined") {
  fetch("/api/config")
    .then((r) => r.json())
    .then((d) => {
      if (d.config) useSettingsStore.getState().setConfig(d.config);
    })
    .catch(() => undefined);
}
