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
    <article className={`mx-auto px-4 py-24 md:py-32 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      {kicker && (
        <p className="num text-xs uppercase tracking-[0.2em] text-muted">{kicker}</p>
      )}
      <h1 className="font-display mt-6 text-5xl leading-[1.05] tracking-tight md:text-6xl">
        {title}
      </h1>
      {lede && <p className="mt-6 text-lg leading-relaxed text-muted">{lede}</p>}
      <div className="mt-12">{children}</div>
    </article>
  );
}
