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
    <ul className="grid border-t border-border sm:grid-cols-2">
      {products.map((p) => (
        <li key={p.id} className="border-b border-border sm:odd:border-r">
          <Link href={p.ctaHref} className="block px-0 py-8 md:py-10">
            <p className="num text-xs uppercase tracking-[0.2em] text-muted">{p.tag}</p>
            <h3 className="font-display mt-6 text-2xl md:text-3xl">{p.title}</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{p.body}</p>
            <p className="num mt-6 text-sm">{p.meta}</p>
            <span className="mt-3 inline-block text-sm text-accent">{p.ctaLabel} →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
