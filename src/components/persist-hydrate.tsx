"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";

/** Cart persist skips SSR hydration so a leftover badge cannot flash as 1. */
export function PersistHydrate() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
  return null;
}
