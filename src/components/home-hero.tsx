"use client";

import Link from "next/link";
import { localizedPath } from "@/lib/i18n-config";
import { ElasticGallery, type ElasticGalleryItem } from "./ui/elastic-gallery";
import { useI18n } from "./providers";

const MEDIA: Record<string, Pick<ElasticGalleryItem, "src" | "poster" | "kind">> = {
  film: { kind: "image", src: "/hero-gallery/film.jpg" },
  print: { kind: "video", src: "/hero-gallery/print.mp4", poster: "/hero-gallery/print.jpg" },
  designs: { kind: "video", src: "/hero-gallery/designs.mp4", poster: "/hero-gallery/designs.jpg" },
};

export function HomeHero({
  specs,
}: {
  specs: string;
}) {
  const { locale, t } = useI18n();
  const L = (p: string) => localizedPath(locale, p);
  const items: ElasticGalleryItem[] = t.home.gallery
    .map((copy) => {
      const media = MEDIA[copy.id];
      if (!media) return null;
      return { ...copy, ...media };
    })
    .filter((item): item is ElasticGalleryItem => item !== null);

  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-8 pt-10 md:pb-10 md:pt-12">
      <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(300px,1.05fr)]">
        <div>
          <p className="num text-xs uppercase tracking-[0.22em] text-muted">{t.home.kicker}</p>
          <h1 className="font-display mt-5 max-w-xl text-5xl leading-[1.05] tracking-tight md:text-6xl">
            {t.home.headline}
          </h1>
          <p className="mt-5 max-w-md text-xl text-ink">{t.home.sub}</p>
          <div className="mt-8">
            <Link href={L("/order")} className="btn btn-primary">
              {t.common.startOrder}
            </Link>
          </div>
          <p className="num mt-6 text-sm text-muted">{specs}</p>
        </div>
        <ElasticGallery items={items} ctaLabel={t.home.galleryCta} ctaHref={L("/order")} />
      </div>
    </section>
  );
}
