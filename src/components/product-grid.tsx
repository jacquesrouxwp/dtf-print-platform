import Link from "next/link";

export type ProductTile = {
  id: string;
  tag: string;
  title: string;
  body: string;
  meta: string;
  ctaLabel: string;
  ctaHref: string;
};

export function ProductGrid({ products }: { products: ProductTile[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {products.map((p) => (
        <li key={p.id}>
          <Link
            href={p.ctaHref}
            className="glass block h-full rounded-[24px] px-6 py-8 transition hover:border-white/25"
          >
            <p className="num text-xs uppercase tracking-[0.2em] text-muted">{p.tag}</p>
            <h3 className="font-display mt-5 text-2xl md:text-3xl">{p.title}</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{p.body}</p>
            <p className="num mt-6 text-sm">{p.meta}</p>
            <span className="mt-4 inline-flex text-sm text-accent">{p.ctaLabel} →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
