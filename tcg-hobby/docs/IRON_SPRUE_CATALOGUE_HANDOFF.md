# Iron Sprue Catalogue Sprint Handoff

This note protects the approved storefront baseline and records the clean handoff rules for the earlier catalogue-population sprint. It is documentation only; it does not authorise product import, database seeding, R2 upload or deployment. Current production commerce uses Cloudflare storefront -> Railway API -> Railway Postgres.

## Approved Storefront Baseline

- Approved baseline commit: `9088382c5de18c1f6a3a2a5bf5d142853f7e0d9e`
- Earlier premium homepage baseline: `a422617`
- Storefront command: `npm run dev -w @capital-hobby/iron-sprue -- --port 3002`
- Storefront URL: `http://localhost:3002`
- Admin command: `npm run dev -w @capital-hobby/admin`
- Admin URL: `http://localhost:3001/admin/iron-sprue`

The approved storefront direction is a dark Iron Sprue header/footer, sticky brass promotional strip, warm off-white body, cog/workshop background treatment, full-bleed product-led hero carousel, compact category strip, premium offer panels, rotating brand carousel, full-width newsletter banner, full-width payment trust banner and compact legal footer.

Known future refinements belong in later storefront or catalogue tasks only: real approved catalogue media, final brand-logo uploads, connected Admin persistence for Iron Sprue content controls, and production media-domain wiring.

## Routes

Static Coming Soon deployment uses the generated static page only and must not expose the full storefront routes.

Full storefront routes currently include:

- `/`
- `/shop`
- `/products/[slug]`
- `/brands`
- `/delivery`
- `/returns`
- `/privacy`
- `/terms`
- `/cookies`
- `/contact`
- `/basket`
- `/account`
- `/wishlist`

Iron Sprue launch-list Pages Functions include `/api/launch-list` and `/unsubscribe/[[token]]`. Admin work lives under `/admin/iron-sprue` in the separate Admin app and must run only with Iron Sprue-scoped resources.

## Catalogue Source Of Truth

The final catalogue sprint source is `Proforma Capital Hobby.pdf`:

- Sales order: `27676`
- Purchase order/reference: `IS-PO-2026-07`
- Order date: `2026-08-03`
- Approved sellable lines: `81`
- Approved units: `233`

The current storefront JSON remains a development preview until the import is intentionally run and reviewed. Do not update counts, product records or stock from the PDF in housekeeping.

## Development Fixtures

Retain these fixtures until the catalogue sprint replaces them through the import/Admin pipeline:

- `apps/iron-sprue/data/launch-products.json`
- `apps/iron-sprue/public/assets/products/`
- `apps/iron-sprue/public/assets/hero/`
- `apps/admin/public/iron-sprue/placeholders/`

They are development and presentation fixtures only. They must not be treated as final catalogue truth.

## Environment Contract

Canonical Iron Sprue variables are listed in `apps/iron-sprue/.env.example`. `.env.local` and `.dev.vars` are ignored and must remain local.

`IRON_SPRUE_R2_PUBLIC_BASE_URL` may remain empty during local private R2 processing. Production storefront media delivery must use `https://media.ironsprue.co.uk`.

Historical local operator action before the catalogue sprint: add `IRON_SPRUE_WORKER_READ_DATABASE_URL` for Worker/read-path validation; do not print or commit its value. This is not required for the current production storefront, which must use Railway API reads.

## Media Policy

Use the policy in `docs/IRON_SPRUE_PRODUCT_MEDIA_PIPELINE.md`. Image 2 is the default customer-facing image. Hero artwork is separate, admin-replaceable marketing art. Catalogue images document the product. Hero artwork sells the hobby.

## Next-Sprint Preconditions

Before catalogue population begins:

1. Confirm the explicitly selected Iron Sprue database variables resolve to the intended non-production target before running any import.
2. Run migrations/status checks only against the explicitly selected Iron Sprue database.
3. Confirm R2 access targets `iron-sprue-product-media`.
4. Upload no media until object-key strategy, rights checks and image review workflow are ready.
5. Import no products until SKU matching, draft/review/publish states and Admin review flow are verified.
