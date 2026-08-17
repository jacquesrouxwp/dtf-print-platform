"use client";

import type { ReactNode } from "react";
import KineticGrid from "@/components/ui/kinetic-grid";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <KineticGrid globalColor="paper" className="min-h-screen">
      {children}
    </KineticGrid>
  );
}
