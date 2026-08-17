"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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
      setConfig: (config) => set({ config }),
      patchConfig: (patch) =>
        set((s) => ({ config: { ...s.config, ...patch } })),
      setBtwInclusive: (btwInclusive) => set({ btwInclusive }),
      reset: () => set({ config: defaultConfig }),
    }),
    {
      name: CONFIG_STORAGE_KEY,
      partialize: (s) => ({ config: s.config, btwInclusive: s.btwInclusive }),
    }
  )
);
