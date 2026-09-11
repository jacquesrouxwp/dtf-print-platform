"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Silent looping clip. Reduced-motion visitors get the poster and a play
 * control instead of a loop they did not ask for.
 */
export function LoopClip({
  src,
  poster,
  label,
  className,
}: {
  src: string;
  poster?: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (reduced) {
      video.pause();
      setPlaying(false);
      return;
    }
    video.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    );
  }, [reduced]);

  function start() {
    const video = ref.current;
    if (!video) return;
    void video.play().then(() => setPlaying(true));
  }

  return (
    <figure className={cn("relative w-full overflow-hidden", className)}>
      <video
        ref={ref}
        className="aspect-[9/16] w-full object-cover"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
      />
      {!playing && (
        <button
          type="button"
          onClick={start}
          className="absolute inset-0 grid place-items-center bg-ink/30 text-sm text-paper"
        >
          <span className="border border-white/40 px-4 py-2 backdrop-blur-sm">▶ {label}</span>
        </button>
      )}
    </figure>
  );
}
