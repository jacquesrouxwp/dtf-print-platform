"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "./footer";

/** The builder route — an app shell rather than a scrolling document. */
export function isBuilderPath(pathname: string): boolean {
  return /^\/[a-z]{2}\/order(\/|$)/.test(pathname);
}

/**
 * A document may grow past the window and scroll. The builder may not: it
 * switches page scrolling off and scrolls its own panels instead, so its frame
 * has to be exactly one viewport tall. With `min-h-dvh` the frame grew to fit
 * whatever the panels held — twenty pieces of artwork made it 2209px in a
 * 900px window — and everything past the fold became unreachable.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const isBuilder = isBuilderPath(usePathname() ?? "");
  return (
    <div
      className={
        isBuilder
          ? "flex h-dvh flex-col overflow-hidden"
          : "flex min-h-dvh flex-col"
      }
    >
      {children}
    </div>
  );
}

/** The footer belongs to documents; the shell has no room for one. */
export function FooterSlot() {
  return isBuilderPath(usePathname() ?? "") ? null : <Footer />;
}
