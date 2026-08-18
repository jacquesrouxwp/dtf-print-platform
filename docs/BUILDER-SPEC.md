# DTF Gang Sheet Builder — Build Specification

> **How to use this file:** paste it into your AI coding agent (Claude Code, Cursor, Windsurf) as the
> project spec, then work through the phases in order. Do not ask the agent to build everything at
> once — Phase 1 alone is a working product. Each phase ends with acceptance tests; do not move on
> until they pass.

---

## 0. Context for the agent

You are building the ordering engine for a DTF (direct-to-film) transfer printing company in the
Netherlands. This is **not a website feature — it is the company's pricing machine and production
system.** A customer uploads artwork, the system arranges it onto a film roll, computes a price from
the film length actually consumed, takes payment, and emits a print-ready file that goes straight to
the printer with no human touch.

Every euro of revenue flows through this component, and every production error starts here. Correctness
beats cleverness. Where this spec is explicit about units, rounding, or file output, follow it literally.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · server-side pricing · Mollie for payments
(iDEAL is mandatory in NL). Canvas: Konva.js or Fabric.js.

---

## 1. Domain model — read this twice

### Units

**All internal geometry is in millimetres, stored as numbers.** Never store pixels. Never store
inches. The UI displays centimetres. The output file converts to pixels exactly once, at render time.

```
px = mm / 25.4 * DPI          // DPI = 300 for production output
```

Getting this wrong means printing at the wrong physical size — the single most expensive bug in the
system, because it wastes film and the customer only discovers it after pressing.

### The roll

```ts
type RollConfig = {
  widthMm: number          // e.g. 550 — physical film width. ADMIN-CONFIGURABLE.
  edgeMarginMm: number     // e.g. 10 — unprintable/unsafe zone at each edge
  itemGapMm: number        // e.g. 4 — minimum gap between two designs
  lengthIncrementMm: number// e.g. 100 — billing granularity (round length UP to this)
  minOrderMm: number       // e.g. 500
  outputDpi: number        // 300
}
// usable width = widthMm - 2 * edgeMarginMm
```

None of these may be hardcoded. All live in the database and are editable by an admin without a deploy.

### The core objects

```ts
type Design = {
  id: string
  fileUrl: string          // original upload, untouched
  previewUrl: string       // downscaled for canvas performance
  naturalPxW: number       // intrinsic pixel dimensions of the source
  naturalPxH: number
  trimBox: { x: number; y: number; w: number; h: number }  // opaque-pixel bounds, in source px
  alphaMaskUrl?: string    // Phase 3 — for outline nesting
  hasAlpha: boolean
  hasSemiTransparency: boolean
  colorSpace: 'sRGB' | 'CMYK' | 'other'
}

type PlacedItem = {
  id: string
  designId: string
  widthMm: number          // requested PRINT size — the customer sets this
  heightMm: number         // locked to aspect ratio unless explicitly unlocked
  xMm: number              // position on roll, origin = top-left of usable area
  yMm: number
  rotation: 0 | 90         // only these two. No free rotation in v1.
  locked: boolean
}

type Layout = {
  rollConfig: RollConfig
  items: PlacedItem[]
  usedLengthMm: number     // = max(y + height) over all items, + edgeMargin
  billedLengthMm: number   // = roundUp(usedLengthMm, lengthIncrementMm), min minOrderMm
}
```

---

## 2. Phases

| Phase | Scope | Why this order |
|---|---|---|
| **1** | Upload → set size & quantity → auto-nest → live price → checkout → print file | This alone is a sellable product. Ship it. |
| **2** | Manual drag/rotate/duplicate, snapping, alignment, undo/redo, save & reorder | Retention features. Build while orders are already coming in. |
| **3** | Alpha-outline nesting, transparency cleanup, halftoning | The features that beat every competitor. |
| **4** | Accounts, artwork library, trade tiers, consolidated invoicing | Scale. |

**Do not start Phase 2 before Phase 1's acceptance tests pass.**

---

## 3. Phase 1 — the core

### 3.1 Upload

Accept: `PNG` (preferred), `PDF`, `TIFF`, `SVG`, `JPEG`.
Max 100 MB per file, 50 files per order.

On upload, server-side (use `sharp`):

1. Read intrinsic pixel dimensions.
2. **Compute the trim box** — the bounding box of pixels with alpha > threshold. Store it. Everything
   downstream nests and prices the *trim box*, not the raw canvas. A 4000×4000 PNG whose logo occupies
   the centre 800×800 must be treated as 800×800, otherwise you bill the customer for empty space and
   they leave.
3. Detect alpha channel presence.
4. **Detect semi-transparent pixels** (`0 < alpha < 255`). Flag it — see §3.5.
5. Detect colour space. Convert CMYK → sRGB, and warn.
6. Generate a ≤2000px preview for the canvas. Never load the original into the browser.

### 3.2 Sizing

The customer sets **print width in cm**; height follows the aspect ratio automatically.
Provide quick presets (10 / 15 / 20 / 25 / 30 cm) plus free numeric entry.
Quantity field per design — `quantity: 12` means twelve copies get nested, not one that the user
duplicates by hand.

### 3.3 Auto-nesting — the heart of the system

This is a **2D strip-packing problem**: fixed width, unbounded length, minimise length used.
(Search that exact term — it is a well-studied problem with known good heuristics.)

**Algorithm for Phase 1: MaxRects with Best-Short-Side-Fit, plus 90° rotation.**

```
1. Expand every item by quantity into individual rectangles.
2. Inflate each rectangle by itemGapMm on all sides (this is how you enforce
   spacing without special-casing it later).
3. Sort by descending area (also try descending longest-side; keep whichever
   result is shorter — running both costs microseconds).
4. Pack with MaxRects-BSSF into a strip of width (rollWidth - 2*edgeMargin).
   For each rectangle, try both orientations and take the better fit.
5. usedLength = max(y + h) across all placed rectangles.
6. Run steps 3–5 with 2–3 different sort orders and keep the best result.
```

**Requirements:**

- Must handle 200 rectangles in **under 300 ms**. If it doesn't, the live price feels broken.
- Must be **deterministic** — same input always produces the same layout. No `Math.random()`.
- Must be a **pure function**: `nest(items, config) → layout`. No DOM, no canvas, no side effects.
  This makes it unit-testable, and it must be, because it is the one function that decides your revenue.
- Must run **identically on client and server**. The client uses it for live preview; the server
  re-runs it to compute the authoritative price. Same code, one module, shared.

**Benchmark to beat:** commercial builders claim 15–30% better film utilisation than manual layout.
Write a test that packs a known set and asserts the used length is below a fixed threshold, so a
future refactor cannot silently make packing worse.

### 3.4 Pricing

```
billedLengthMm = max(minOrderMm, roundUp(usedLengthMm, lengthIncrementMm))
meters         = billedLengthMm / 1000
rate           = lookupTier(meters)        // from admin-editable tier table
subtotalExVat  = meters * rate
vat            = subtotalExVat * vatRate   // 21% NL
```

Display **excl. BTW by default** with a toggle for incl. BTW — this is the Dutch B2B convention and
getting it backwards makes you look amateur to trade buyers.

**Security requirement, non-negotiable:** the browser's price is a *display*. Before creating the
Mollie payment, the server re-runs nesting and pricing from the stored item list and uses **its own**
number. Never trust a price submitted by the client. An AI agent will happily wire the client price
straight to checkout if you don't say this explicitly.

The price must update **live** on every size/quantity change, debounced ~150 ms. Animate the number.
This is the one place in the whole product where motion earns its keep — watching the price move as
you resize is what makes the tool feel honest.

### 3.5 Validation — the money-saver

Show these inline, next to the offending design, as the customer works. Never a modal. Never silent.

| Check | Rule | Severity |
|---|---|---|
| Effective DPI | `naturalPxW / (widthMm / 25.4)` | < 200 → warn · < 150 → block-with-override |
| No alpha channel | JPEG, or PNG with fully opaque background | **warn loudly** |
| Solid-colour border | Outer 2px ring is uniform → likely a white box | **warn loudly** |
| Semi-transparent pixels | any `0 < alpha < 255` | warn — see below |
| CMYK | colour space is CMYK | convert + inform |
| Physically too wide | `widthMm > usableWidth` | block |

**The white-background trap deserves special treatment.** The single most common ruined DTF order is a
customer uploading a design with a white background they cannot see on a white screen. Render every
preview on a **checkerboard**, and next to it show a "this is what will print" swatch on a dark
garment colour. Let them switch the mock garment between black / white / heather. This one feature
prevents more reprints than everything else combined.

**Semi-transparency matters more in DTF than in normal printing.** Soft shadows and feathered edges
have partial alpha, and DTF lays a white underbase that cannot render partial opacity cleanly — the
result is a muddy halo the customer will blame on you. In Phase 1, detect and warn. Phase 3 fixes it
properly.

### 3.6 Output — the file that goes to the machine

On payment confirmation, the server generates:

**a) The print file**
- Format: **PNG, 300 dpi, with a real alpha channel.** Transparent background — *not* white. A white
  background means the printer lays down white ink across the entire sheet and destroys the job.
- Width in pixels: **exactly** `rollWidthMm / 25.4 * 300`, rounded to integer. Not "about right".
- Height: `billedLengthMm / 25.4 * 300`.
- Each design composited at its exact mm position, converted with the same formula.
- sRGB, embedded profile.
- Generate with `sharp` — compositing at this size in the browser will run out of memory.

**b) The operator sheet (PDF)**
A visual map of the layout with each item numbered, sized, and labelled with the customer's order ID,
plus the cut lines. Without this, you get two metres of film and no idea whose order is where.

**c) The manifest (JSON)**
```json
{
  "orderId": "2026-0417",
  "customer": { "name": "...", "email": "..." },
  "roll": { "widthMm": 550, "billedLengthMm": 2400 },
  "priceExVat": 21.60,
  "items": [
    { "designId": "a1", "filename": "logo.png", "widthMm": 100, "heightMm": 100,
      "xMm": 12, "yMm": 12, "rotation": 0, "quantity": 10 }
  ],
  "generatedAt": "..."
}
```

Drop all three into the production queue folder / storage bucket. **Verify the round trip**: generate,
re-open the PNG, assert its pixel dimensions match the expected physical size. Make this an automated
test, not a manual check.

### 3.7 Mobile

A large share of small-brand customers order from a phone. Full drag-and-drop is not required there,
but the flow must complete: upload → set size → set quantity → auto-arrange → pay. Never a dead end,
never "please use a desktop".

---

## 4. Phase 2 — manual control

- Drag to reposition, with snapping to other items, to the roll edges, and to a toggleable grid.
- Rotate in 90° steps. Duplicate. Delete. Lock in place.
- Multi-select with marquee; align and distribute.
- **Undo / redo** — implement as a state stack from the beginning, retrofitting is miserable.
- "Auto-arrange" button that re-runs nesting on unlocked items only, leaving locked ones in place.
- Rulers in cm along both edges; live readout of used length.
- Save layout as a named draft; reload and reorder in one click.

**Retention feature that matters more than it looks:** a returning customer must be able to reorder a
previous layout without re-uploading anything. Competitors are measurably bad at this — the industry
complaint is teams "rebuilding the same customer layout from scratch every reorder." Getting this right
is worth more than any visual polish.

---

## 5. Phase 3 — how you beat every competitor

Most builders on the market nest by **bounding box**. Two features move you ahead of them.

### 5.1 Alpha-outline nesting

Pack by the design's actual silhouette instead of its rectangle. A circular logo wastes its four
corners in a bounding box; a script wordmark wastes most of its box. Real designs nest 15–35% tighter
by outline.

Approach: trace the alpha channel to a simplified polygon (marching squares → Douglas–Peucker), then
use no-fit-polygon placement or a raster-mask collision test at ~2 mm resolution. The raster approach
is far easier to get right and fast enough: rasterise each mask, slide it down the strip, test for
overlap with a bitwise AND.

Ship it as a toggle — "tight packing (saves film)" — defaulted on, with the bounding-box path kept as
a fallback for pathological shapes.

### 5.2 Transparency cleanup + halftoning

The industry's best builder (Kixxl) differentiates specifically on this, because semi-transparent
pixels are DTF's biggest quality problem.

- **Alpha threshold cleanup:** push alpha below a cutoff to 0 and above to 255, killing the muddy halo.
  Show a before/after preview and let the customer choose.
- **Halftoning:** convert genuinely soft gradients into a dot pattern the white underbase can actually
  reproduce, instead of a smear.
- **50/50 fade cleanup** for the vintage/washed look that customers keep asking for and most suppliers
  print badly.

---

## 6. Acceptance tests

Write these as real automated tests. They are the definition of done.

**Geometry**
- 100 mm at 300 dpi renders to exactly 1181 px (`100/25.4*300 = 1181.1` → assert the rounding rule).
- A design placed at x=12 mm lands at exactly 142 px from the left edge in the output.
- Output PNG width equals `rollWidthMm/25.4*300` exactly.
- Output PNG has an alpha channel and a fully transparent background.

**Nesting**
- 10× 100×100 mm + 5× 250×300 mm + 20× 50×50 mm on a 550 mm roll → assert used length under a fixed
  threshold; record the number and never let it regress.
- Same input twice → byte-identical layout (determinism).
- 200 items nest in < 300 ms.
- No two items overlap. No item crosses the edge margin. Every gap ≥ `itemGapMm`.
- An item wider than the usable width is rejected, not silently scaled.

**Pricing**
- 2,347 mm used with a 100 mm increment bills as 2,400 mm.
- Below `minOrderMm` bills at `minOrderMm`.
- A tampered client-side price is ignored; the server's number is charged.
- Tier boundaries: exactly 5.0 m and 5.01 m land in the correct tiers.

**Validation**
- A 500 px image requested at 30 cm triggers the low-DPI warning.
- A JPEG with a white background triggers the background warning.
- A PNG with feathered edges triggers the semi-transparency warning.

**End-to-end**
- Upload → nest → pay (Mollie test mode, iDEAL) → print file, operator PDF and manifest all appear in
  the production queue with matching order IDs.

---

## 7. Traps — an AI agent will hit every one of these unless told

1. **Working in pixels instead of millimetres.** Everything downstream breaks and it is invisible until
   something physical comes out wrong. Millimetres, always.
2. **Nesting the full canvas instead of the trim box.** You bill customers for transparent air and
   lose them.
3. **Trusting the client-computed price.** Free money for anyone with devtools.
4. **A white background in the output PNG.** Ruins the print and wastes the film.
5. **Compositing the final 300 dpi file in the browser.** Out-of-memory on real orders. Server-side,
   with `sharp`.
6. **Ignoring `quantity`.** Twelve copies must be nested automatically; making the user click duplicate
   twelve times is how builders get abandoned.
7. **Non-deterministic packing.** Price changes between preview and checkout, and you cannot reproduce
   a customer's complaint.
8. **Off-by-one on rounding.** Decide the rule once (`Math.round` on px, `ceil` on billed length),
   write it in one helper, and use that helper everywhere.
9. **Forgetting iDEAL.** Cards-only checkout loses most Dutch B2B customers outright.
10. **Building Phase 2 and 3 before Phase 1 ships.** The company needs revenue, not a perfect canvas.

---

## 8. Admin — no deploys for business changes

Editable in an admin UI, stored in the database: roll width, edge margin, item gap, length increment,
minimum order, output DPI, the full price-tier table, VAT rate, rush surcharge, shipping cost and
free-shipping threshold, trade-tier discounts, daily cutoff time.

If changing a price requires a developer, the system has failed regardless of how good the canvas is.
