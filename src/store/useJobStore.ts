"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/lib/safe-storage";

export type JobFilm = {
  id: string;
  name: string;
  lengthMm: number;
  previewSrc: string;
  payload: string;
  designCount: number;
};

type JobState = {
  films: JobFilm[];
  activeId: string | null;
  upsert: (film: JobFilm) => void;
  remove: (id: string) => void;
  setActive: (id: string | null) => void;
  clear: () => void;
};

function slimSrc(src: string) {
  if (!src || src.startsWith("blob:") || src.startsWith("data:")) return "";
  return src;
}

export const useJobStore = create<JobState>()(
  persist(
    (set) => ({
      films: [],
      activeId: null,
      upsert: (film) =>
        set((s) => {
          const next = { ...film, previewSrc: slimSrc(film.previewSrc) || film.previewSrc };
          const i = s.films.findIndex((f) => f.id === film.id);
          if (i >= 0) {
            const films = s.films.slice();
            films[i] = { ...films[i], ...next };
            return { films, activeId: film.id };
          }
          return { films: [...s.films, next], activeId: film.id };
        }),
      remove: (id) =>
        set((s) => ({
          films: s.films.filter((f) => f.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),
      setActive: (activeId) => set({ activeId }),
      clear: () => set({ films: [], activeId: null }),
    }),
    {
      name: "hlv-job",
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        films: s.films.map((f) => ({ ...f, previewSrc: slimSrc(f.previewSrc) })),
        activeId: s.activeId,
      }),
    }
  )
);
