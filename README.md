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

## Admin

`/nl/admin` — password `hlv-admin` unless `NEXT_PUBLIC_ADMIN_PASSWORD` is set. Edits live in the browser (prices, cutoff, roll width, press specs). Wire Sanity/Payload later for multi-device persistence.

## Payments

Without `MOLLIE_API_KEY` checkout records the order and downloads a production JSON manifest. With a Mollie key, iDEAL redirects through Mollie.

## Placeholders (do not publish as confirmed promises)

Cutoff 16:00, roll 55 cm, press 150 °C / 15 s / cold peel, 50 wash cycles, 0.5 mm line / 6 pt type, KVK/BTW dummy numbers, mid-market €9,45–6,95 / m excl. btw. Change them in admin before partner demos if operations disagrees.

## Scripts

- `npm run dev` — Turbopack
- `npm run build`
- `npm run start`

## Sitemap

`/`, `/order`, `/pricing`, `/dtf-transfers`, `/dtf-vs`, `/how-to-press`, `/file-guidelines`, `/samples`, `/trade`, `/about`, `/shipping`, `/faq`, `/contact`, `/studio`, `/account`, `/legal/*`
