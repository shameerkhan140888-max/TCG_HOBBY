# TCG Hobby Cloudflare Storefront Feasibility

This branch is a non-deploying feasibility branch for running the current TCG Hobby storefront through `@opennextjs/cloudflare`.

It does not replace the existing Vercel path. Production DNS, Vercel settings and deployment targets remain unchanged.

## Preview Commands

Run from the repository package root:

```powershell
npm run cloudflare:build -w @tcg-hobby/storefront
npm run cloudflare:preview -w @tcg-hobby/storefront
npm run cloudflare:dry-run -w @tcg-hobby/storefront
```

The feasibility config deliberately sets `TCG_HOBBY_CLOUDFLARE_UNOPTIMIZED_IMAGES=1` during Cloudflare builds so the proof does not require Cloudflare Images. Product and brand images must therefore be served as normal static or public remote assets.

## Current Feasibility Result

The Cloudflare Worker read path is proven for `/shop`, catalogue search and product detail routes. Transaction-dependent writes are intentionally not approved for the Worker database path because `PrismaNeonHTTP` does not support Prisma transactions. See `docs/TCG_HOBBY_CLOUDFLARE_PARKING.md` for the parked state and `docs/IRON_SPRUE_CLOUDFLARE_HYBRID_HANDOFF.md` for the production hybrid work package.

## Required Environment Mapping

No real secrets are stored in this repository. Configure secrets in Cloudflare for any real preview:

| Current variable | Cloudflare binding type | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Secret | Neon PostgreSQL URL. Worker read routes use `PrismaNeonHTTP`; transaction-dependent writes must go through Node/Nest. |
| `STRIPE_SECRET_KEY` | Secret | Stripe sandbox or live key, depending on environment. |
| `STRIPE_WEBHOOK_SECRET` | Secret | Must match the Cloudflare preview/public webhook endpoint. |
| `RESEND_API_KEY` | Secret | Transactional email provider. |
| `ORDER_EMAIL_FROM` | Secret or var | Sender identity must remain verified in Resend. |
| `SIGNUP_EMAIL_FROM` | Secret or var | Sender identity must remain verified in Resend. |
| `NEXT_PUBLIC_SITE_URL` | Var | Public storefront origin. |
| `PUBLIC_STOREFRONT_URL` | Var | Public storefront origin for email assets. |
| `TCG_HOBBY_EMAIL_ASSET_BASE_URL` | Var | Stable public HTTPS email image origin. |
| `R2_PUBLIC_BASE_URL` | Var | Public media base URL for product images. |
| `TCG_HOBBY_CATALOGUE_DATA_SOURCE` | Var | Use `database` for production storefront data. |

## Known Audit Items

- The storefront imports many values from `@tcg-hobby/database`, whose root entrypoint also exports Admin and import utilities.
- `packages/database/src/product-import.ts` uses filesystem APIs and should not be bundled into the Worker runtime.
- `packages/database/src/orders.ts` contains local development fallback order persistence using `node:fs`, `node:os` and `node:path`.
- Current password hashing uses synchronous Node `scrypt`; keep password mutations on Node/Nest.
- Transactional checkout, Stripe, inventory, basket and email state must stay out of the Worker PrismaNeonHTTP path.
