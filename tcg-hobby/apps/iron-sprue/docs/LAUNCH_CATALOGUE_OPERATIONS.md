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

## Import

Run a redacted dry-run first:

```powershell
npm run import:launch-catalogue:dry-run -w @capital-hobby/iron-sprue
```

Then run the import only after confirming the target host is the dedicated Iron Sprue Neon environment:

```powershell
npm run import:launch-catalogue -w @capital-hobby/iron-sprue
```

The importer:

- reads `IRON_SPRUE_DATABASE_URL` from `apps/iron-sprue/.env.local` unless explicitly supplied;
- rejects TCG Hobby-looking database targets;
- upserts only `IRON_SPRUE` records;
- upserts brands, categories, supplier, products, inventory, content-review rows and media placeholders;
- preserves the source workbook row reference;
- records provisional PO source/media links in the content-review metadata where available;
- is safe to retry by SKU, slug, source checksum and media storage key;
- does not enable checkout, Stripe or Resend.

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

The import creates review placeholders only. It does not upload product images. A product cannot move to published launch state until the approved Image 2 storefront-primary asset exists and is approved.

Required per-product media stages:

- manufacturer original archive;
- catalogue white-background Image 2;
- completed product render;
- workshop photography using the Iron Sprue playmat/Foamex visual standard;
- optional supporting workshop image;
- separate hero artwork when the product is used in merchandising.

## Storefront Handoff

The public Iron Sprue storefront reads `apps/iron-sprue/data/launch-products.json` as a preview projection while the Admin data is reviewed. This keeps products visually reviewable without enabling checkout. The commerce sprint should replace this preview path with approved database-backed publication data after Stripe, order and basket flows are explicitly authorised.

## Current Limitations

- R2 read, write, get and delete access has been verified against the dedicated `iron-sprue-product-media` bucket.
- Product-specific supplier source pages are available for 43 rows from the provisional PO; the remaining 38 rows still need source link preparation.
- Downloaded originals and delivery derivatives do not count as completed Image 2 assets.
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
