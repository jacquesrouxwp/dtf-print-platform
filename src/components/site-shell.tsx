"use client";

import type { ReactNode } from "react";
import { BeamsBackground } from "@/components/ui/beams-background";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <BeamsBackground intensity="medium" className="min-h-screen">
      {children}
    </BeamsBackground>
  );
}
