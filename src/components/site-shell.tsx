"use client";

import type { ReactNode } from "react";
import { BubbleSketch } from "@/components/ui/bubble-sketch";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f3efe6]">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <BubbleSketch fillViewport />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
