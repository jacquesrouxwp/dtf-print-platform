# HLV — DTF Print Platform

Storefront and order intake for a Hilversum DTF transfer house. Phase 1 from the development brief: public site (NL/EN), gang sheet builder billed **per running meter**, checkout (iDEAL via Mollie when a key is set, otherwise demo), lead forms, and an admin panel for prices and cutoff.

**Working brand:** HLV. The real name and domain are still open (brief §14).

## Non-negotiable product rule

The customer buys **length** on a **fixed roll width** (default 55 cm). They do not buy a US-style gang sheet. All builder maths is in millimetres, displayed in centimetres.

## Stack

- Next.js 15 App Router, TypeScript, Tailwind CSS 4
- Konva for the builder canvas
- Zustand + localStorage for cart, drafts, admin config
- next-intl-style `[locale]` routing (`/nl`, `/en`)
- Vercel hosting

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — middleware sends you to `/nl`.

## Docs

Handover and the live status overlay: [`docs/STATUS.md`](docs/STATUS.md). Original audit: [`docs/AUDIT-FIXES.md`](docs/AUDIT-FIXES.md).

## Admin

`/nl/admin` — header `x-admin-password`. Local default `hlv-admin`. On Vercel set `ADMIN_PASSWORD`; there is no default in production. Config is stored in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set.

## Payments

Without `MOLLIE_API_KEY` checkout records the order and writes a production PNG. **Do not set a live Mollie key until Blob is verified** — otherwise paid orders can still lose artwork. With a key, iDEAL redirects through Mollie.

## Object storage

Set `BLOB_READ_WRITE_TOKEN` on Vercel. Uploads, print queue and shop config then survive serverless restarts. Without it, files live under `.data/` locally and `/tmp` on Vercel.

## Placeholders (do not publish as confirmed promises)

Cutoff 16:00, roll 55 cm, press 150 °C / 15 s / cold peel, 50 wash cycles, 0.5 mm line / 6 pt type, KVK/BTW dummy numbers, mid-market €9,45–6,95 / m excl. btw. Change them in admin before partner demos if operations disagrees.

## Scripts

- `npm run dev` — Turbopack
- `npm run build`
- `npm run start`

## Sitemap

`/`, `/order`, `/pricing`, `/dtf-transfers`, `/dtf-vs`, `/how-to-press`, `/file-guidelines`, `/samples`, `/trade`, `/about`, `/shipping`, `/faq`, `/contact`, `/studio`, `/account`, `/legal/*`
