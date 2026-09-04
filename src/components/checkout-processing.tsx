"use client";

import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { FrameCmyk } from "./frame-cmyk";
import { ConveyorLoop } from "./ui/conveyor-loop";

const HOST_ID = "dtf-checkout-overlay";

function overlayHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let el = document.getElementById(HOST_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = HOST_ID;
    // html, not body: body overflow-x clip must not contain this layer.
    document.documentElement.appendChild(el);
  }
  return el;
}

/**
 * Full-viewport wait layer while checkout fulfill runs. Must paint before
 * fetch, survive cart.clear(), and not sit inside PageShell overflow.
 */
export function CheckoutProcessing({
  title,
  wait,
}: {
  title: string;
  wait: string;
}) {
  const target = overlayHost();

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      document.getElementById(HOST_ID)?.remove();
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <div
      data-testid="checkout-processing"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 2147483646,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        width: "100vw",
        height: "100dvh",
        boxSizing: "border-box",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(17, 17, 17, 0.55)",
        }}
      />
      <FrameCmyk className="relative z-[1] w-full max-w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden bg-paper px-5 py-8 sm:px-8 sm:py-10">
        <ConveyorLoop />
        <p className="mt-6 text-center text-base text-ink">{title}</p>
        <p className="mt-2 text-center text-sm text-muted">{wait}</p>
      </FrameCmyk>
    </div>,
    target
  );
}
