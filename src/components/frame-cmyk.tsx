import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FrameCmyk({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("frame-cmyk", className)}>
      {children}
      <span className="frame-cmyk-br" aria-hidden />
      <span className="frame-cmyk-bl" aria-hidden />
    </div>
  );
}
