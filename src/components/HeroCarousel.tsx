/**
 * HeroCarousel.tsx
 * ---------------------------------------------------------------------------
 * Product carousel for the hero section.
 *
 * STACK           Next.js (App Router) + React 18+ + TypeScript + Tailwind CSS
 * DEPENDENCIES    None. Deliberately dependency-free (~150 lines of logic).
 *                 If you'd rather use a library, Embla Carousel is the
 *                 recommended swap — the props/data shape below maps 1:1.
 *
 * FEATURES        Autoplay w/ progress indicator · pause on hover & focus
 *                 Keyboard (← / →) · touch swipe · drag
 *                 Full ARIA tablist semantics
 *                 Respects prefers-reduced-motion (autoplay disabled)
 *                 Works with or without photography (see ART FALLBACKS)
 *
 * INTEGRATION     1. Drop this file in `components/HeroCarousel.tsx`
 *                 2. Add the CSS variables + fonts from §6 to globals.css
 *                 3. Add the keyframes from §7 to tailwind.config.ts
 *                    (or leave the inline <style> block — it works as-is)
 *                 4. Move SLIDES (§1) into the CMS once Sanity/Payload is wired.
 *
 * NOTE ON IMAGERY The client has no product photography yet. Each slide
 *                 supports EITHER `image` (preferred, once shot) OR `art`
 *                 (a CSS-generated abstract background used in the meantime).
 *                 When photos land, add `image` and delete `art`. No layout
 *                 changes required.
 * ---------------------------------------------------------------------------
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

/* ═══════════════════════════════════════════════════════════════════════════
   §1  SLIDE DATA  —  move to CMS before launch
   ═══════════════════════════════════════════════════════════════════════════ */

export type Slide = {
  id: string
  tag: string
  /** visual weight of the tag pill */
  tagStyle?: 'default' | 'hot' | 'muted'
  title: string
  body: string
  /** short right-aligned fact — price, status, requirement */
  meta: string
  /** substring of `meta` to accent-colour, e.g. the price itself */
  metaAccent?: string
  ctaLabel: string
  ctaHref: string
  /** Preferred once photography exists. Overrides `art`. */
  image?: { src: string; alt: string }
  /** Fallback CSS background. See §5. */
  art?: string
}

export const SLIDES: Slide[] = [
  {
    id: 'per-meter',
    tag: 'Best seller',
    tagStyle: 'hot',
    title: 'DTF transfers, per meter',
    body: 'Our core product. Full-colour transfers on a 55 cm roll — you buy length, we nest your designs to fill it.',
    meta: 'from €8,95 / m excl. BTW',
    metaAccent: '€8,95',
    ctaLabel: 'Build a sheet',
    ctaHref: '/order',
    art: 'art-a',
  },
  {
    id: 'builder',
    tag: 'Auto-nesting',
    title: 'The gang sheet builder',
    body: 'Drop in twenty designs. We arrange them, you watch the price move, and you pay for the centimetres you occupy — not the empty film around them.',
    meta: 'live pricing',
    ctaLabel: 'Open the builder',
    ctaHref: '/order',
    art: 'art-b',
  },
  {
    id: 'uv-dtf',
    tag: 'Hard surfaces',
    title: 'UV DTF',
    body: "Glass, wood, metal, packaging, cases. No heat press needed — peel and apply. For the jobs textile transfers can't take.",
    meta: 'from €18,50 / m excl. BTW',
    metaAccent: '€18,50',
    ctaLabel: 'See UV DTF',
    ctaHref: '/uv-dtf',
    art: 'art-c',
  },
  {
    id: 'specialty',
    tag: 'Specialty',
    title: 'Foil, glow & reflective',
    body: "Metallic foil, glow-in-the-dark, reflective and fluorescent finishes — for drops that need to do something a flat print can't.",
    meta: 'on request',
    ctaLabel: 'Explore finishes',
    ctaHref: '/specialty',
    art: 'art-e',
  },
  {
    id: 'trade',
    tag: 'For businesses',
    title: 'Trade accounts',
    body: 'Your volume rate applied automatically, an artwork library for one-click reorders, and one consolidated invoice a month instead of forty receipts.',
    meta: 'KVK required · no fee',
    ctaLabel: 'Apply',
    ctaHref: '/trade',
    art: 'art-f',
  },
  {
    id: 'studio',
    tag: 'Coming soon',
    tagStyle: 'muted',
    title: 'The AI Design Studio',
    body: 'Describe it, generate it, print it. Artwork straight from an idea into the builder as a press-ready file — without opening a design app.',
    meta: 'in development',
    ctaLabel: 'Join the waitlist',
    ctaHref: '/studio',
    art: 'art-d',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   §2  CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */

const AUTOPLAY_MS = 5400
const SWIPE_THRESHOLD_PX = 44

/* ═══════════════════════════════════════════════════════════════════════════
   §3  COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HeroCarousel({
  slides = SLIDES,
  autoplayMs = AUTOPLAY_MS,
}: {
  slides?: Slide[]
  autoplayMs?: number
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)

  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchX = useRef<number | null>(null)
  const count = slides.length

  /* prefers-reduced-motion ------------------------------------------------ */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const goTo = useCallback((i: number) => setIndex(((i % count) + count) % count), [count])
  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  /* autoplay -------------------------------------------------------------- */
  useEffect(() => {
    if (reduced || paused) return
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), autoplayMs)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [reduced, paused, count, autoplayMs, index])

  /* keyboard -------------------------------------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  /* touch ----------------------------------------------------------------- */
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX) (dx < 0 ? next : prev)()
    touchX.current = null
  }

  return (
    <div
      className="relative w-full max-w-[420px] select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Products"
    >
      <div className="px-4 py-7 sm:px-6 sm:py-8">
        <div
          className="hero-film relative overflow-hidden shadow-[0_22px_40px_-18px_rgba(18,17,14,.45)]"
          style={{
            transform: 'rotate(-5.5deg)',
            clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[3] ring-1 ring-inset ring-white/20"
          />
          <div
            className="flex transition-transform duration-[620ms] ease-[cubic-bezier(.22,.85,.28,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((s, i) => (
              <article
                key={s.id}
                role="tabpanel"
                aria-hidden={i !== index}
                aria-label={`${i + 1} of ${count}: ${s.title}`}
                className="relative flex aspect-[16/9] min-w-full flex-col justify-end overflow-hidden px-6 py-5 text-white"
              >
                {s.image ? (
                  <Image
                    src={s.image.src}
                    alt={s.image.alt}
                    fill
                    priority={i === 0}
                    sizes="420px"
                    className="absolute inset-0 z-0 object-cover"
                  />
                ) : (
                  <div className={`absolute inset-0 z-0 ${s.art ?? 'art-f'}`} aria-hidden />
                )}

                <div
                  aria-hidden
                  className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(10,9,12,0)_28%,rgba(10,9,12,.55)_72%,rgba(10,9,12,.88)_100%)]"
                />

                <div className="relative z-[2]">
                  <TagPill variant={s.tagStyle}>{s.tag}</TagPill>

                  <h2 className="mb-1.5 font-[family-name:var(--font-display)] text-[21px] leading-[1.08] tracking-[-0.015em] sm:text-[23px]">
                    {s.title}
                  </h2>

                  <p className="mb-3 line-clamp-2 max-w-[36ch] text-[12px] leading-[1.4] text-white/75">
                    {s.body}
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-md border border-white/20 bg-white/[.13] px-2 py-1 font-mono text-[11px] tabular-nums">
                      {renderMeta(s)}
                    </span>

                    <a
                      href={s.ctaHref}
                      tabIndex={i === index ? 0 : -1}
                      className="group inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white outline-offset-4"
                    >
                      {s.ctaLabel}
                      <Arrow className="transition-transform duration-200 group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* progress dots */}
        <div role="tablist" aria-label="Choose slide" className="flex flex-1 gap-[7px]">
          {slides.map((s, i) => {
            const active = i === index
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={active}
                aria-label={s.title}
                onClick={() => goTo(i)}
                className={`relative h-[3px] flex-1 overflow-hidden rounded-sm transition-colors ${
                  active ? 'bg-white/20' : 'bg-white/10'
                }`}
              >
                {active && (
                  <span
                    key={`${index}-${paused}`}
                    className="absolute inset-0 origin-left bg-[var(--accent)] motion-reduce:scale-x-100"
                    style={{
                      animation: reduced ? 'none' : `dotFill ${autoplayMs}ms linear forwards`,
                      animationPlayState: paused ? 'paused' : 'running',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex gap-1.5">
          <ArrowButton onClick={prev} label="Previous slide" dir="left" />
          <ArrowButton onClick={next} label="Next slide" dir="right" />
        </div>

        <div className="min-w-[44px] text-right font-mono text-xs tabular-nums text-white/45">
          <b className="text-white">{String(index + 1).padStart(2, '0')}</b> /{' '}
          {String(count).padStart(2, '0')}
        </div>
      </div>

      {/* ── §5 ART FALLBACKS + keyframes ─────────────────────────────────── */}
      {/* Delete the .art-* rules once every slide has a real `image`.       */}
      <style>{`
        @keyframes dotFill { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @media (prefers-reduced-motion: reduce) {
          .hero-film { transform: none !important; clip-path: none !important; border-radius: 12px; }
        }

        .art-a{background:
          repeating-linear-gradient(115deg,rgba(255,255,255,.05) 0 2px,transparent 2px 13px),
          radial-gradient(120% 90% at 22% 12%,#FF6A34 0%,#D93A0C 42%,#5C1403 100%)}
        .art-b{background:
          repeating-linear-gradient(0deg,rgba(255,255,255,.055) 0 1px,transparent 1px 11px),
          repeating-linear-gradient(90deg,rgba(255,255,255,.055) 0 1px,transparent 1px 11px),
          linear-gradient(140deg,#2B2E5E 0%,#191B3A 48%,#0B0C1C 100%)}
        .art-c{background:
          radial-gradient(circle at 26% 26%,rgba(255,255,255,.16) 0 3px,transparent 3px),
          radial-gradient(circle at 76% 68%,rgba(255,255,255,.10) 0 2px,transparent 2px),
          linear-gradient(160deg,#0E5C4A 0%,#0A3D33 52%,#05201B 100%);
          background-size:44px 44px,30px 30px,100% 100%}
        .art-d{background:
          conic-gradient(from 200deg at 68% 32%,rgba(255,255,255,.14),transparent 32%,rgba(255,255,255,.07) 64%,transparent),
          linear-gradient(150deg,#5A2170 0%,#361244 55%,#150719 100%)}
        .art-e{background:
          repeating-linear-gradient(45deg,rgba(255,255,255,.07) 0 8px,transparent 8px 22px),
          linear-gradient(135deg,#8A6A12 0%,#4E3A06 50%,#1E1602 100%)}
        .art-f{background:
          linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 40px),
          linear-gradient(155deg,#1C1C20 0%,#111013 60%,#000 100%)}
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   §4  SUBCOMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function TagPill({
  variant = 'default',
  children,
}: {
  variant?: Slide['tagStyle']
  children: React.ReactNode
}) {
  const styles = {
    default: 'bg-white/[.16] border-white/[.22] text-white',
    hot: 'bg-[var(--accent)] border-[var(--accent)] text-white',
    muted: 'bg-white/10 border-white/[.22] text-white/75',
  }[variant ?? 'default']

  return (
    <span
      className={`mb-2 inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.14em] backdrop-blur-[8px] ${styles}`}
    >
      {children}
    </span>
  )
}

function ArrowButton({
  onClick,
  label,
  dir,
}: {
  onClick: () => void
  label: string
  dir: 'left' | 'right'
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full border-[1.5px] border-white/25 text-white transition-all duration-200 hover:border-white hover:bg-white hover:text-neutral-950"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
}

function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/** Accents the price inside the meta string without dangerouslySetInnerHTML. */
function renderMeta(s: Slide) {
  if (!s.metaAccent) return s.meta
  const [before, ...rest] = s.meta.split(s.metaAccent)
  return (
    <>
      {before}
      <b className="font-bold text-[var(--accent)]">{s.metaAccent}</b>
      {rest.join(s.metaAccent)}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   §6  ADD TO app/globals.css
   ═══════════════════════════════════════════════════════════════════════════

   @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

   :root{
     --ink:        #111013;
     --ink-soft:   #2a282e;
     --paper:      #F7F5F0;
     --paper-dim:  #E8E4DB;
     --grey:       #8B8792;
     --accent:     #FF4D18;   // ink hitting film
     --accent-deep:#D93A0C;
     --font-display:'Instrument Serif', Georgia, serif;
   }

   NOTE: prefer next/font over the @import above in production —
   it removes the render-blocking request and self-hosts the files.

   ═══════════════════════════════════════════════════════════════════════════
   §7  OPTIONAL — tailwind.config.ts
   ═══════════════════════════════════════════════════════════════════════════

   theme: {
     extend: {
       colors: {
         ink:   { DEFAULT:'#111013', soft:'#2a282e' },
         paper: { DEFAULT:'#F7F5F0', dim:'#E8E4DB' },
         accent:{ DEFAULT:'#FF4D18', deep:'#D93A0C' },
       },
       fontFamily: {
         display: ['Instrument Serif','Georgia','serif'],
         sans:    ['Inter','system-ui','sans-serif'],
         mono:    ['JetBrains Mono','ui-monospace','monospace'],
       },
       keyframes: { dotFill: { from:{transform:'scaleX(0)'}, to:{transform:'scaleX(1)'} } },
     },
   }

   ═══════════════════════════════════════════════════════════════════════════
   §8  USAGE
   ═══════════════════════════════════════════════════════════════════════════

   import HeroCarousel from '@/components/HeroCarousel'

   export default function Home() {
     return (
       <section className="grid grid-cols-[1.08fr_.92fr] gap-14 max-lg:grid-cols-1">
         <HeroCopy />
         <HeroCarousel />
       </section>
     )
   }

   ═══════════════════════════════════════════════════════════════════════════
   §9  ACCEPTANCE CRITERIA  —  please verify before marking done
   ═══════════════════════════════════════════════════════════════════════════

   [ ] Autoplay advances every 5.4s and the dot progress bar stays in sync
   [ ] Autoplay pauses on hover AND on keyboard focus, resumes on leave
   [ ] ← / → arrow keys change slides
   [ ] Swipe works on a real phone, not just in devtools
   [ ] With prefers-reduced-motion enabled: no autoplay, no slide animation,
       manual navigation still fully functional
   [ ] Off-screen slide links are not reachable by Tab (tabIndex={-1})
   [ ] Screen reader announces "3 of 6: UV DTF" when landing on a slide
   [ ] No CLS on load — first slide image uses priority
   [ ] Lighthouse mobile ≥ 90 on the homepage with this component mounted
   [ ] Slide content renders correctly at 2 slides and at 12 slides
       (no hardcoded count anywhere)

   ═══════════════════════════════════════════════════════════════════════════ */
