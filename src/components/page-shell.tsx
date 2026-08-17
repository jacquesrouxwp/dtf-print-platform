import type { ReactNode } from "react";
import { Panel } from "./panel";

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
  children: ReactNode;
}) {
  return (
    <article className={`mx-auto px-4 py-12 md:py-20 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      <Panel className="px-6 py-8 md:px-10 md:py-12">
        {kicker && (
          <p className="num text-[11px] uppercase tracking-[0.22em] text-muted">{kicker}</p>
        )}
        <h1 className="font-display mt-3 text-4xl leading-[1.05] tracking-tight md:text-6xl">
          {title}
        </h1>
        {lede && <p className="mt-6 text-lg leading-relaxed text-muted">{lede}</p>}
        <div className="mt-12">{children}</div>
      </Panel>
    </article>
  );
}
