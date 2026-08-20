"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

/**
 * The builder is an app shell, not a document: it fills the viewport and its
 * own panels scroll. A site footer underneath pushes the shell — and the
 * add-to-cart button with it — below the fold, where page scrolling is off and
 * nothing can reach it.
 */
export function FooterSlot() {
  const pathname = usePathname() ?? "";
  const isBuilder = /^\/[a-z]{2}\/order(\/|$)/.test(pathname);
  if (isBuilder) return null;
  return <Footer />;
}
