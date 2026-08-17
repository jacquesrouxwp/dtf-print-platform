import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "ink";
}) {
  return (
    <div
      className={cn(
        "panel",
        tone === "ink" && "panel-ink",
        className
      )}
    >
      {children}
    </div>
  );
}
