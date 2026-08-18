# Handover — dtf-print-platform

**Read [STATUS.md](./STATUS.md) first.** The files below are the original handover from August 2026. Several blockers listed there are already fixed in `main`.

Docs for whoever picks this project up next. Read in this order.

| File | What it is |
|---|---|
| **AUDIT-FIXES.md** | Code audit. 22 findings ranked by severity, each with file path, line number and quoted code. **Work top-down.** |
| **BUILDER-SPEC.md** | Original build spec for the gang sheet builder: units, nesting algorithm, output file format, acceptance tests, and the traps an AI coding agent will hit. |
| **STATUS.md** | What is actually done on `main` vs this handover. |
| **fix-builder-crash.patch** | Historical. Already applied — do not `git apply` again. |

---

## The project in one paragraph

Storefront and order-intake system for a DTF (direct-to-film) transfer printing house
in Hilversum, NL. The core is a **gang sheet builder**: a customer uploads artwork, the
system auto-nests it onto a fixed-width film roll, prices it by the length actually
consumed, takes payment, and emits a print-ready file that goes straight to the printer.
Everything else on the site exists to get people into that builder.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · Konva · zustand ·
sharp + pdf-lib · Mollie (iDEAL is mandatory in NL) · Vercel · locales NL/EN/RU.

**Live:** https://dtf-print-platform.vercel.app — `/ru` · `/ru/order`

---

## Current state

Phase 1 is largely written. The core is genuinely good — a deterministic MaxRects
packer, all geometry in millimetres, and a server-side authoritative price path that
checkout does call. The architecture is right.

What is broken is the pipeline around it. In priority order:

**0 — `/order` crashes** for anyone who visited before the persisted state shape changed.
No `version`/`migrate` in the zustand persist stores, so a stale localStorage blob is
rehydrated verbatim and `builder-app.tsx:64` dereferences a missing `warnings` array.
Fix is in `fix-builder-crash.patch`. **Run `npm run build` after applying — the patch was
not build-verified.**

**1 — BLOCKER: customer artwork never reaches the server.** There is no upload endpoint,
so `writeProductionQueue` runs without `images` and writes a **fully transparent PNG**.
Every paid order arrives with nothing to print. Needs `/api/upload` + object storage
(Vercel Blob or S3/R2), upload on file-add, `storageKey` on the cart line, and the
originals passed into checkout.

**2 — Displayed price ≠ charged amount.** Checkout ignores the cart's trade flag; the
client sums per-line lengths while the server re-nests everything into one sheet; and
`ignoredClientPrice` is computed then read by nobody. Quote the whole cart through one
server call, and on a mismatch show the customer the new price instead of silently
charging a different one.

**3 — Admin settings never reach the server.** Config lives in per-browser localStorage
while both API routes hardcode `defaultConfig`. Change a rate or the roll width and the
server keeps using the old value. Move config to a database.

**4 — Nesting uses the full canvas, not the opaque trim box.** Customers pay roughly 4×
the film their artwork actually needs.

Then continue through AUDIT-FIXES.md — it also has a section on why the site reads as
unprofessional, with specific replacements.

---

## Do not skip

**Until item 1 is fixed, do not connect real payments.** The order arrives empty.

Timeline: printer lands mid-September, launch target early October.
