# Code audit — dtf-print-platform

Audited: repo `jacquesrouxwp/dtf-print-platform`, static review of the full source.
Verified personally: findings 1, 2, 3, 9.

**Verdict:** the engine is good. The pipeline has a hole that makes every paid order arrive empty,
and the visual layer is fighting the brand. Roughly two days of work to make this presentable and
safe to take money with.

Give this file to your coding agent and work top-down. **Do not skip to the visual section** — the
first three items decide whether the business works at all.

---

# BLOCKER — fix before anyone can pay

## 1. Customer artwork never reaches the server. Every production file is blank.

**Verified.** `src/app/api/` contains `checkout, contact, price, samples, trade, waitlist` — there is
no upload endpoint. No `FormData` anywhere carries a file. Artwork exists only as a data-URL inside
the customer's browser tab.

`src/app/api/checkout/route.ts:27` calls `writeProductionQueue` with no `images` map, so
`src/lib/print-output.ts:41`:

```ts
if (!images || images.size === 0 || items.length === 0) {
  return base.toBuffer();   // ← fully transparent PNG
}
```

Every order writes a **completely empty** 550 mm × N PNG, plus a manifest listing
`filename: "<designId>.png"` files that do not exist. The customer pays, you receive nothing to print.

**Fix:**
- Add `POST /api/upload` — store the original file in object storage (Vercel Blob or S3/R2), return an id.
- Upload on file-add, not at checkout. Show per-file progress.
- Persist `{designId → storageKey}` on the cart line.
- In `checkout/route.ts`, fetch each original into a `Map<string, Buffer>` and pass it as `images`.
- Add a test that asserts the output PNG contains non-transparent pixels.

---

## 2. The customer approves one price in the UI and their bank shows another.

Three separate divergences, all live:

**a)** `src/components/checkout-client.tsx:22` — checkout starts a fresh `useState(false)` for the trade
toggle and ignores the flag stored on the cart line. A trade customer sees discounted line items and a
full-rate total on the same screen.

**b)** The client sums per-line lengths; the server re-nests **all lines into one sheet**
(`api/checkout/route.ts:11-15`). Two lines of 1500 mm display as 3.0 m ≈ €28.35 and bill as 1.5 m ≈ €14.18.

**c)** The server detects the mismatch and discards it. **Verified** — `ignoredClientPrice` appears only
inside `route.ts` (lines 24, 62, 73) and is read by nothing. The Mollie payment is created for the
server's number regardless.

**Fix:** quote the whole cart through one server call and render *that* number everywhere. If the
server price differs from the displayed price, **stop and show the customer the new price for
confirmation** — never silently charge a different amount.

Also `api/checkout/route.ts` uses `designId: d.name` — two files both called `logo.png` merge into one.
Use the design's uuid.

---

## 3. Admin settings never reach the server.

`src/store/useSettingsStore.ts` persists config to **localStorage, per browser**. Both API routes
hardcode `defaultConfig` (`api/price/route.ts:9`, `api/checkout/route.ts:12`).

Change the per-meter rate in admin → the builder quotes the new rate, the server charges the old one
forever. Switch to a 60 cm roll → the server still nests at 550 mm and every production file is
geometrically wrong.

**Fix:** move config to a database (or at minimum a server-side JSON), read it in both routes, and make
the admin write through an authenticated API. The admin page currently has no real auth either.

---

# Money bugs

## 4. Locking or dragging a design collapses all its copies onto one spot.

`src/store/useBuilderStore.ts:237` writes the position back onto the **design** and sets `locked: true`.
`src/lib/nesting.ts:268` then gives **every copy** the same `xMm/yMm`. Quantity 4 becomes four rectangles
stacked in one place: length drops, price drops, the manifest still claims 4 copies. Customer pays for
4 and receives 1.

**Fix:** positions and lock state belong on the **placed item**, not the design. Give `PlacedItem` its own
identity that survives repacking.

## 5. Nesting uses the full canvas, not the opaque trim box.

`src/lib/artwork.ts` never computes a bounding box — it does not exist in the repo. A 4000×4000 export
whose logo occupies the middle 1000 px is nested as a 338 mm square.

**The customer pays roughly 4× the film their artwork actually needs.** This was explicit in the original
spec and is the single biggest reason someone would compare you to a competitor and leave.

**Fix:** scan the alpha channel on upload, store the trim box, and derive default size and nesting
geometry from it. Do it server-side in `sharp` during the upload from item 1.

## 6. The DPI warning is computed on the wrong axis after rotation.

`useBuilderStore.ts:59` swaps `widthMm`/`heightMm` for the DPI check when `rotation === 90`. Rotation does
not change which pixel axis maps to which physical dimension. Worse, `rotation` is overwritten by the
packer (`:109`), so a 197-dpi file silently reports 658 dpi and the warning disappears — while the card
next to it (`builder-app.tsx:230`) shows the correct number. The two contradict each other on screen.

**Fix:** `effectiveDpi(d.pixelW, d.widthMm)` always. Delete the rotation branch.

## 7. Clearing the width field permanently breaks the aspect-ratio lock.

`useBuilderStore.ts:200` — backspacing to empty stores `widthMm: 0`; the guard `d.widthMm > 0` then blocks
the ratio branch forever. Type a new number and you get a **stretched transfer, printed exactly as
specified, with no warning.**

**Fix:** keep the aspect ratio as a stored field on the design, not derived from current dimensions.

## 8. Rejected designs vanish from the price but stay in the order.

`useBuilderStore.ts:99` drops `result.rejected`; nothing renders it; `api/checkout` never returns it.
A design too wide for the roll is silently excluded from the sheet and the price, but the customer still
sees it in their list and it still travels into the cart.

**Fix:** surface rejections prominently and block checkout until resolved. Nothing red should be
checkout-able — currently **no warning blocks anything** (`builder-app.tsx:190`, `checkout-client.tsx:171`).

## 9. `hasMollie` is hardcoded `false`.

**Verified** — `checkout-client.tsx:114: const hasMollie = false;`. The button always says "demo" even
when a real iDEAL payment is created server-side. Customers will not trust it.

## 10. PDFs are given invented dimensions.

`useBuilderStore.ts:128` hardcodes `pixelW: 3508, widthMm: 210` for every PDF — the file is never parsed,
`isLikelyCmykPdf` is just an extension check. PDF is advertised in the dropzone. A 30 cm vector logo is
quoted and nested as a 21 cm box with no preview and no warning.

**Fix:** parse the page box server-side, or remove PDF from the accepted list until you do.

---

# Data loss

## 11. The builder store is not persisted — any navigation destroys the work.

`useBuilderStore` is a plain `create()` with no `persist`, while cart and settings both have it. Going to
checkout and pressing Back wipes every upload, unrecoverably, because the files were never sent anywhere.
Fixing item 1 fixes most of this.

## 12. A couple of uploads will blow the localStorage quota and silently kill the cart.

`useCartStore` persists full 1600 px preview data-URLs, and `saveDraft` keeps up to 20 snapshots including
every `src`. Browsers cap ~5 MB. The `setItem` is unguarded, so `QuotaExceededError` throws out of the
click handler and the customer lands on an empty checkout.

## 13. Add-to-cart can be double-clicked into two identical lines.

`builder-app.tsx:57` has no guard and the button is never disabled. Two taps on a slow phone = double film,
double charge — and `removeLine` exists in the store but is not wired into the checkout UI, so they cannot
undo it.

## 14. TIFF uploads disappear silently.

`useBuilderStore.ts:183` swallows every decode failure with a bare `catch {}`. No browser decodes TIFF in an
`<img>`, but `.tif,.tiff` is in the `accept` list and the copy promises it. The spinner clears and nothing
appears.

## 15. On a phone, scrolling drags the artwork.

`builder-canvas.tsx:78` sets `draggable` unconditionally. Konva eats the touchmove, so a vertical swipe that
starts on a design moves it — and via item 4, locks it and collapses its copies. The mobile hint even claims
dragging is desktop-only.

---

# Why it looks rough

## 16. The animated cyan/violet aurora — delete this first.

`src/components/site-shell.tsx:8` wraps **every page** in `<BeamsBackground intensity="strong">`, which
draws drifting 85 %-saturation cyan→violet beams (`beams-background.tsx:36`) behind a brand whose accent is
red-orange. It is the single most recognisable AI-landing-page artifact there is — a verbatim shadcn-blocks
component whose own interface name doesn't match its export.

It is also three stacked full-viewport blurs at 60 fps (canvas `blur(35px)` + CSS `blur(15px)` +
a `backdropFilter: blur(50px)` motion layer), never paused on tab-hide, with **no `prefers-reduced-motion`
check**. That is why it feels sluggish as well as cheap.

```tsx
export function SiteShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#0f0e0d]">{children}</div>;
}
```

## 17. Every section is the same frosted-glass card.

`globals.css:83` `.panel { background: rgba(255,255,255,.07); backdrop-filter: blur(16px) }` is applied to
all seven homepage blocks and to every other page via `page-shell.tsx:19`. The result is identical
translucent slabs with no hierarchy — hero, trust bar and CTA all weigh the same.

Editorial layout doesn't use cards. It uses whitespace and rules. Delete `.panel` and the `Panel`
component; sections become `border-t border-white/10` with generous padding.

**Items 16 and 17 together are about 15 lines of deletion and they do more for "professional" than
everything else on this list.**

## 18. The design tokens are light-mode but the site renders dark. Ten CTAs are invisible.

**Verified.** `globals.css:7` `--ink: #12110e` and `:38` `body { background: #0a0a0a }`. There are
**10 `bg-ink` elements** — near-black rectangles on a near-black page. Casualties include:

- the primary **"Request samples"** CTA (`page.tsx:150`)
- the **cutoff urgency bar** (`cutoff-bar.tsx:34`) — the one strip that should shout
- the builder's upload button (`builder-app.tsx:154`)
- the comparison table header (`dtf-vs/page.tsx:32`) — contrast ≈ **1.1:1**, completely unreadable

**Fix:** rename tokens to roles (`--bg`, `--surface`, `--text`, `--text-dim`, `--line`, `--accent`), pick
one direction, and make primary CTAs `bg-[--accent] text-white`.

## 19. Five font families, ~18 type sizes, and the brand changes by language.

`app/layout.tsx:2` imports Geist, Geist Mono, Instrument Serif, Manrope and Source Serif 4 — and swaps
display *and* body font for Russian. **The RU site is visually a different company.**

Homepage sizes in use: `9px, 10px, 11px, 12px, 12.5px, xs, sm, base, lg, xl, 2xl, 21px, 23px, 3xl…7xl`.
Hierarchy is inverted — the final CTA `h2` is larger than every other heading and equal to a page `h1`.

**Fix:** three families (one serif with Cyrillic coverage — Playfair or Lora — plus Geist Sans and Geist
Mono), a fixed 6-step scale, no arbitrary sizes.

## 20. No spacing scale.

Section paddings on one page: `pb-10 pt-10`, `pb-6`, `py-6 ×4`, `py-10 pb-16`. Panels use six different
values. **Inner spacing equals outer spacing**, so the eye cannot tell where a section ends — that is
exactly the "everything is mushed together" feeling.

Three rules, applied everywhere: section `py-24 md:py-32` · heading→body `mt-6` · item→item `mt-3`.

## 21. The carousel is the loudest amateur signal.

`HeroCarousel.tsx:209` — a `rotate(-5.5deg)` parallelogram with a `clipPath`, the only rotated element, the
only drop shadow, and the only rounded corner in the codebase (and only for reduced-motion users, so there
are two different designs depending on an OS setting).

Also: six inline gradients introducing **orange, navy, green, purple and gold** on a one-accent site · a
`"Best seller"` Shopify pill · `text-[12.5px]` · a **"Coming soon"** slide for a product that doesn't exist,
shown to partners · `font-[family-name:var(--font-display)]` at `:252` is **broken** (the variable is only
defined on `<body>`, so slide titles silently render in sans, not the serif) · and ~100 lines of my original
scaffolding comments still shipped in the source, including a third conflicting accent value.

**Fix:** replace with a static 4-up grid of the real products. Flat tiles, serif title, mono price, text
link. An auto-advancing carousel hides 5 of 6 products from anyone who doesn't wait 30 seconds.

## 22. Dead weight

`ui/kinetic-grid.tsx` (389 lines) and `ui/bubble-sketch.tsx` (335 lines) are **imported by nothing**, and
between them add ten more saturated colours. `bubble-sketch` is the only consumer of `p5`; `motion` is only
used by `beams-background`.

```bash
rm src/components/ui/{kinetic-grid,bubble-sketch,beams-background}.tsx
npm rm p5 @types/p5 motion
```

---

# Builder UX

- **Rotated pieces render squashed** (`builder-canvas.tsx:67`) — no `rotation` prop, so the bitmap is
  stretched into the transposed box. Happens on the demo set, i.e. every first impression.
- **The canvas is blank on first paint** (`:32`) — images are assigned but nothing re-renders on load.
- **The empty builder quotes €14** — `billedLengthMm(0,…)` returns the 500 mm minimum before anything is
  uploaded.
- **The BTW-inclusive breakdown doesn't add up** — subtotal already includes BTW, then BTW is listed again.
  Rows sum to 20.36 against a stated 19.84.
- **Rotate 90° does nothing** — the packer overwrites it immediately.
- **Long sheets break the canvas** — a 6 m order asks for ~8,800 px, a 25 m order exceeds the browser
  canvas limit entirely. No zoom or fit control, and your tiers go to 100 m+.
- **Typing a quantity re-nests synchronously on every keystroke** — typing "500" runs the packer at 5,
  50 and 500 pieces on the main thread.
- **On mobile the price and CTA are below everything** — the sticky panel is `lg:` only.

---

# Tests are misleading

`src/lib/validation.test.ts:12` — three of four tests assert on literals declared inside the test and touch
no product code:

```ts
const alphas = [0, 0, 128, 255];
const semi = alphas.some((a) => a > 0 && a < 255);
expect(semi).toBe(true);
```

This passes green while the white-background path, the semi-transparency path (which does not exist at all)
and the too-wide path are untested. Delete these and write tests against the real functions.

---

# What is genuinely good

`src/lib/nesting.ts` is real work — a deterministic MaxRects packer, no `Math.random`, no DOM, three sort
strategies with a stable tie-break, correct free-rect splitting and pruning. `units.ts` and the tier lookup
in `pricing.ts` are clean and correctly ordered. **The "millimetres, never pixels" rule is honoured
throughout the core**, with px conversion confined to `units.ts` and the render boundary.

`server-quote.ts` gives the server a single authoritative `nest → quote` path, and checkout *does* call it.
The architecture is right — it is the inputs and the ignored mismatch flag that break it, not the design.

---

# Suggested order

**Day 1 (safe to take money):** 1 → 2 → 3 → 4 → 5 → 8 → 9
**Day 2 (presentable to partners):** 16 → 17 → 18 → 21 → 22 → 20 → 19
**Day 3 (won't lose orders):** 11 → 12 → 13 → 6 → 7 → 15 → the builder UX list

Until item 1 is done, **do not accept a real payment** — the order arrives with nothing to print.
