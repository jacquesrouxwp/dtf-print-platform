import type { ReactNode } from "react";

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
    <article className={`mx-auto px-4 py-16 md:py-24 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      <div className="glass rounded-[28px] px-6 py-10 md:px-10 md:py-14">
        {kicker && (
          <p className="num text-xs uppercase tracking-[0.2em] text-muted">{kicker}</p>
        )}
        <h1 className="font-display mt-5 text-5xl leading-[1.05] tracking-tight md:text-6xl">
          {title}
        </h1>
        {lede && <p className="mt-6 text-lg leading-relaxed text-muted">{lede}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </article>
  );
}
