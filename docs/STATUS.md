# Status vs handover (2026-08-19)

This file is the live overlay. `AUDIT-FIXES.md` and `BUILDER-SPEC.md` describe the **original** audit. Do not treat them as the current bug list.

Repo: https://github.com/jacquesrouxwp/dtf-print-platform  
Live: https://dtf-print-platform.vercel.app

## Steps 0–4

| Step | Handover | Now |
|---|---|---|
| 0 | `/order` crash on stale persist | **Done.** Store is versioned; unversioned blobs are discarded. |
| 1 | No upload API, empty print PNG | **Done in code.** `POST /api/upload`, trim PNG stored, `storageKey` on the cart, checkout loads buffers. **Needs `BLOB_READ_WRITE_TOKEN` on Vercel** or files die with the lambda. |
| 2 | Screen price ≠ charge | **Done.** Whole-cart `/api/price`, checkout 409 on mismatch, design uuid not filename. |
| 3 | Admin config only in localStorage | **Code now writes config through Blob when the token is set**, else `.data/config.json`. Not Postgres yet. On Vercel, `ADMIN_PASSWORD` is required (no `hlv-admin` default). |
| 4 | No trim box | **Done.** Sharp alpha trim on upload; nest and print use the opaque box; DPI uses the weaker axis. |

`lib/nesting.ts` was not rewritten.

## Do not turn on live Mollie until

1. `BLOB_READ_WRITE_TOKEN` is set and a test order produces a non-transparent PNG in Blob.
2. `ADMIN_PASSWORD` is set.
3. A real order is run in demo mode end-to-end.

## Still open (after 0–4)

- PDF upload (415 until page-box parse)
- Postgres/Neon if you want config outside Blob
- Press/wash figures — placeholders, do not publish as fact
- Builder v2 (per-copy resize on film, rulers) — after Blob is proven

## Env

```
BLOB_READ_WRITE_TOKEN=     # Vercel Blob read/write
ADMIN_PASSWORD=            # required in production
MOLLIE_API_KEY=            # leave unset until Blob is verified
NEXT_PUBLIC_SITE_URL=https://dtf-print-platform.vercel.app
```
