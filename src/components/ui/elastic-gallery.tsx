"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type ElasticMediaKind = "image" | "video";

export type ElasticGalleryItem = {
  id: string;
  title: string;
  category: string;
  alt: string;
  src: string;
  poster?: string;
  kind: ElasticMediaKind;
};

export function ElasticGallery({
  items,
  ctaLabel,
  ctaHref,
  className,
}: {
  items: ElasticGalleryItem[];
  ctaLabel: string;
  ctaHref: string;
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string>(
    items.find((item) => item.id === "designs")?.id ?? items[0]?.id ?? ""
  );
  const [reduced, setReduced] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    for (const item of items) {
      if (item.kind !== "video") continue;
      const el = videoRefs.current[item.id];
      if (!el) continue;
      if (!reduced && item.id === activeId) {
        void el.play().catch(() => undefined);
      } else {
        el.pause();
      }
    }
  }, [activeId, items, reduced]);

  if (!items.length) return null;

  return (
    <div
      className={cn(
        "mx-auto flex h-[420px] w-full flex-col gap-2 md:h-[520px] md:flex-row md:gap-3",
        className
      )}
    >
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <div
            key={item.id}
            onMouseEnter={() => setActiveId(item.id)}
            onClick={() => setActiveId(item.id)}
            className={cn(
              "relative cursor-pointer overflow-hidden border border-line bg-ink",
              "transition-[flex,filter] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]",
              active ? "flex-[4] brightness-100" : "flex-[1] brightness-50 hover:brightness-75"
            )}
          >
            <div className="absolute inset-0 h-full w-full">
              {item.kind === "video" ? (
                <video
                  ref={(node) => {
                    videoRefs.current[item.id] = node;
                  }}
                  className={cn(
                    "h-full w-full object-cover transition-transform duration-1000",
                    active ? "scale-100" : "scale-110"
                  )}
                  src={item.src}
                  poster={item.poster}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={item.alt}
                />
              ) : (
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 42vw"
                  className={cn(
                    "object-cover transition-transform duration-1000",
                    active ? "scale-100" : "scale-110"
                  )}
                  priority={item.id === items[0]?.id}
                />
              )}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
            </div>

            <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
              <div
                className={cn(
                  "flex flex-col gap-2 transition-all duration-500",
                  active ? "translate-y-0 opacity-100 delay-200" : "translate-y-12 opacity-0"
                )}
              >
                <span className="w-fit border border-white/30 bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-md md:px-3 md:text-xs">
                  {item.category}
                </span>
                <h3 className="font-display text-2xl leading-none text-white md:text-4xl">
                  {item.title}
                </h3>
                <Link
                  href={ctaHref}
                  className="mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80 md:mt-3 md:text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ctaLabel}
                  <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" />
                </Link>
              </div>

              <div
                className={cn(
                  "absolute transition-all duration-500",
                  "bottom-4 left-1/2 -translate-x-1/2 md:bottom-8",
                  active ? "scale-50 opacity-0" : "opacity-100 delay-500"
                )}
              >
                <span className="hidden whitespace-nowrap text-sm font-bold uppercase tracking-widest text-white [writing-mode:vertical-rl] md:block">
                  {item.title}
                </span>
                <span className="block text-xs font-bold uppercase tracking-widest text-white md:hidden">
                  {item.category}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
