# Iron Sprue Launch Catalogue Operations

## Source

The current launch catalogue source is `Iron_Sprue_Updated_Sales_Prices_and_Margins.xlsx`.
The workbook supersedes the earlier provisional 67-line planning data.
Product source/media tracing links are taken from the earlier provisional PO where present.

- Source sheet: `Sales Prices`
- Saleable SKUs: 81
- Physical units supplied: 256
- Provisional PO source-linked rows: 43
- Rows still requiring source/media links: 38
- Import batch: `iron-sprue-launch-catalogue-20260806`
- Manifest: `apps/iron-sprue/data/final-launch-catalogue-manifest.json`

Do not commit the source workbook or any supplier payment, bank, credential or private account details.

## Production Data Source

Railway Postgres is the canonical live Iron Sprue catalogue, admin, commerce and media-review database.

Use the Railway production database for any current-state audit, publication check, media reconciliation or admin readiness report. The safe local route is the explicit admin target:

- `IRON_SPRUE_ADMIN_DATABASE_URL`
- Railway runtime `DATABASE_URL` when the command is running inside the Railway production environment

Do not use local `apps/iron-sprue/.env.local` `IRON_SPRUE_DATABASE_URL`, `IRON_SPRUE_DIRECT_DATABASE_URL` or `IRON_SPRUE_WORKER_READ_DATABASE_URL` for live product/media audits unless the task is explicitly a legacy Neon comparison. Those variables have existed as compatibility paths and may point at the older dedicated Neon database in local development, which can produce stale publication/media counts.

When a local audit needs the live Railway database, open the guarded Railway Postgres tunnel first, then connect through `IRON_SPRUE_ADMIN_DATABASE_URL`/the tunnel target. Keep reports redacted: print host/database/status/counts only, never database credentials.

## Import

Run a redacted dry-run first:

```powershell
npm run import:launch-catalogue:dry-run -w @capital-hobby/iron-sprue
```

The legacy Neon target remains available for non-Railway environments that still deliberately use the dedicated Iron Sprue Neon database. Run it only after confirming the target host is the dedicated Iron Sprue Neon environment:

```powershell
npm run import:launch-catalogue -w @capital-hobby/iron-sprue -- --target=neon
```

For the current Railway production PostgreSQL database, the importer must be run from the Railway production environment so it can use Railway's own `DATABASE_URL`. This is the production path. It is a deliberate production mode, not a generic connection-string override. Run the dry-run first:

```bash
npm run import:launch-catalogue -w @capital-hobby/iron-sprue -- --target=railway-production --dry-run
```

Then, only after confirming the redacted target and counts, run the production import with the explicit opt-in:

```bash
IRON_SPRUE_ALLOW_RAILWAY_PRODUCTION_IMPORT=CONFIRM_IRON_SPRUE_RAILWAY_PRODUCTION_IMPORT npm run import:launch-catalogue -w @capital-hobby/iron-sprue -- --target=railway-production
```

The importer:

- reads `IRON_SPRUE_DATABASE_URL` from `apps/iron-sprue/.env.local` only for the legacy explicit Neon target;
- reads Railway production `DATABASE_URL` only when `--target=railway-production` is supplied;
- requires `RAILWAY_ENVIRONMENT_NAME=production` for Railway production mode;
- requires `IRON_SPRUE_RAILWAY_PRODUCTION_DATABASE_FINGERPRINT` to match the SHA-256 hash of Railway production `DATABASE_URL`;
- requires `IRON_SPRUE_ALLOW_RAILWAY_PRODUCTION_IMPORT=CONFIRM_IRON_SPRUE_RAILWAY_PRODUCTION_IMPORT` before a non-dry-run Railway production import;
- rejects TCG Hobby-looking database targets;
- upserts only `IRON_SPRUE` records;
- upserts brands, categories, supplier, products, inventory, content-review rows and media placeholders;
- preserves the source workbook row reference;
- records provisional PO source/media links in the content-review metadata where available;
- is safe to retry by SKU, slug, source checksum and media storage key;
- does not reset, truncate or delete production catalogue/import data;
- does not enable checkout, Stripe or Resend.

Generate the Railway production database fingerprint inside Railway, without printing the URL itself:

```bash
node -e "const { createHash } = require('node:crypto'); if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing'); console.log(createHash('sha256').update(process.env.DATABASE_URL.trim()).digest('hex'))"
```

Store that output as `IRON_SPRUE_RAILWAY_PRODUCTION_DATABASE_FINGERPRINT` in the Railway production environment before running the dry-run/import commands. This fingerprint is a guard value, not a database credential.

## Publication Gate

Imported products are not automatically published.

- Rows with workbook verification notes are `REVIEW_REQUIRED`.
- Rows without approved Image 2 media are `MEDIA_PENDING` or `CONTENT_PENDING`.
- Review-required rows have zero available stock until physically verified.
- Add-to-basket remains disabled in the storefront preview.

Current review-required supplier references:

- `06347` - Lamborghini Aventador colour requires physical box verification.
- `TW-01` - invoice cost correction recorded.
- `CARTON-24-SNAP-KNIFE` - carton-to-unit costing recorded.
- `C119H` - supplier/planning code mismatch.
- `MC093H` - supplier paperwork references a conflicting description/code.

## Brand Sources

Use manufacturer-first brand references before falling back to authorised supplier material.

- Aoshima: `https://www.aoshima-bk.co.jp/en/`
- CubicFun: `https://www.cubicfun.com/`
- Deluxe Materials: `https://deluxematerials.co.uk/`
- Expo Tools: `https://www.expotools.com/`
- OcCre: `https://occre.com/en/`
- Pintoo: `https://pintoo.com/`
- Tasma Products supplier reference: `https://www.tasmaproducts.com/`

## Media

Iron Sprue product media must use the dedicated R2 bucket:

- Bucket: `iron-sprue-product-media`
- Production public host: `https://media.ironsprue.co.uk`

The import creates review placeholders only. It does not upload product images. A product cannot move to published launch state until the approved Image 2 storefront-primary asset exists and is approved, except for tools and accessories where one approved displayable product/manufacturer image may satisfy the media gate when richer generated media is not required.

Required per-product media stages:

- manufacturer original archive;
- catalogue white-background Image 2;
- completed product render;
- workshop photography using the Iron Sprue playmat/Foamex visual standard;
- optional supporting workshop image;
- separate hero artwork when the product is used in merchandising.

Tools and accessories use the lighter one-image gate: one approved displayable product image may satisfy publication media readiness. Model kits, Pintoo, CubicFun and other image-led products still require the richer Image 2/workshop review flow unless explicitly approved otherwise.

## Storefront Handoff

The public Iron Sprue storefront reads `apps/iron-sprue/data/launch-products.json` as a preview projection while the Admin data is reviewed. This keeps products visually reviewable without enabling checkout. The commerce sprint should replace this preview path with approved database-backed publication data after Stripe, order and basket flows are explicitly authorised.

## Current Limitations

- R2 read, write, get and delete access has been verified against the dedicated `iron-sprue-product-media` bucket.
- Product-specific supplier source pages are available for 43 rows from the provisional PO; the remaining 38 rows still need source link preparation.
- Downloaded originals and delivery derivatives do not count as completed Image 2 assets for image-led products. Tools and accessories may use a single approved product/manufacturer image where appropriate.
- True Image 2 assets still need creative/background-removal processing, validation, approval and upload.
- Five workbook-noted products remain review-blocked.
- Static preview images exist only for selected hero/placeholder products.

## Automated Pipeline

The corrected automated content and media architecture is documented in `apps/iron-sprue/docs/AUTOMATED_CATALOGUE_PIPELINE.md`.

Run the current audit with:

```powershell
npm run pipeline:audit -w @capital-hobby/iron-sprue
```

Do not process the full 81-product creative batch until the representative pilot has been visually reviewed and approved.
