"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A clip of film coming off the printer, next to the headline.
 *
 * It plays itself, silently, and only once the viewer's machine and settings
 * say that is welcome: a person who has asked for reduced motion gets the
 * poster frame and a button, not a loop they did not ask for.
 */
export function HeroVideo({ label }: { label: string }) {
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
    // Autoplay is refused in some browsers whatever the attributes say; the
    // poster stays up and the button below is the way in.
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
    <figure className="relative mx-auto w-full max-w-[210px] sm:max-w-[260px] md:mx-0 md:max-w-[320px]">
      <video
        ref={ref}
        className="aspect-[9/16] w-full rounded-2xl border border-white/10 object-cover"
        src="/hero.mp4"
        poster="/hero-poster.webp"
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
          className="absolute inset-0 grid place-items-center rounded-2xl bg-black/30 text-sm text-white"
        >
          <span className="rounded-full border border-white/40 px-4 py-2 backdrop-blur-sm">
            ▶ {label}
          </span>
        </button>
      )}
    </figure>
  );
}
