"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FrameCmyk } from "./frame-cmyk";
import { ConveyorLoop } from "./ui/conveyor-loop";

export function CheckoutProcessing({
  title,
  wait,
}: {
  title: string;
  wait: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="absolute inset-0 bg-ink/45" aria-hidden />
      <FrameCmyk className="relative z-[1] w-full max-w-md bg-paper px-8 py-10">
        <ConveyorLoop />
        <p className="mt-6 text-center text-base text-ink">{title}</p>
        <p className="mt-2 text-center text-sm text-muted">{wait}</p>
      </FrameCmyk>
    </div>,
    document.body
  );
}
