import type { ReactNode } from "react";
import { FrameCmyk } from "./frame-cmyk";

export function PageShell({
  kicker,
  title,
  lede,
  wide,
  children,
}: {
  kicker?: string;
  title: string;
  lede?: string;
  wide?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className={`mx-auto w-full min-w-0 overflow-x-clip px-4 py-16 md:py-24 ${wide ? "max-w-[1200px]" : "max-w-3xl"}`}>
      <FrameCmyk className="min-w-0 max-w-full overflow-x-clip bg-paper px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-14">
        {kicker && (
          <p className="num text-xs uppercase tracking-[0.2em] text-muted">{kicker}</p>
        )}
        <h1 className="font-display mt-5 text-4xl leading-[1.08] tracking-tight break-words md:text-6xl">
          {title}
        </h1>
        {lede && <p className="mt-6 text-lg leading-relaxed text-muted">{lede}</p>}
        <div className="mt-10">{children}</div>
      </FrameCmyk>
    </article>
  );
}
