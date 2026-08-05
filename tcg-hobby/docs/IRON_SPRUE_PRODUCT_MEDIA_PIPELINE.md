# Iron Sprue Product Media Pipeline

This document records the approved no-secret product media pipeline for the Iron Sprue launch catalogue.

## Final Proforma Source

- Source document: `Proforma Capital Hobby.pdf`
- Sales order: `27676`
- Purchase order/reference: `IS-PO-2026-07`
- Order date: `2026-08-03`
- PDF rows detected: `84`
- Approved sellable lines: `81`
- Approved units: `233`
- Zero-quantity rows excluded from stock: `3`
- Net total: `1343.90`
- VAT: `268.77`
- Order total: `1612.67`

The current storefront data file may remain smaller until the final import is run intentionally. Do not update storefront counts from this summary unless the matching product records have also been imported and reviewed.

## R2 Isolation

Iron Sprue product media must use its own Cloudflare R2 bucket:

- Bucket: `iron-sprue-product-media`
- Worker binding: `IRON_SPRUE_MEDIA`
- Production public media host: `media.ironsprue.co.uk`
- Upload namespace: `products/`
- Bucket must not be publicly listable.
- Production must use the custom media host, not an `r2.dev` URL.
- Iron Sprue must not receive broad access to the TCG Hobby bucket.

Required runtime variables:

- `IRON_SPRUE_R2_ACCOUNT_ID`
- `IRON_SPRUE_R2_BUCKET_NAME`
- `IRON_SPRUE_R2_ACCESS_KEY_ID`
- `IRON_SPRUE_R2_SECRET_ACCESS_KEY`
- `IRON_SPRUE_R2_ENDPOINT`
- `IRON_SPRUE_R2_PUBLIC_BASE_URL`
- `IRON_SPRUE_R2_REGION` (defaults to `auto`)
- `IRON_SPRUE_R2_UPLOAD_PREFIX` (defaults to `products/`)
- `IRON_SPRUE_R2_MAX_FILE_SIZE_BYTES` (defaults to 12 MB)

The application must not print access keys, secret keys, connection strings or signed object URLs in build or runtime logs.

`IRON_SPRUE_R2_PUBLIC_BASE_URL` may remain empty in local development until the custom public media domain is configured. That does not block private R2 upload, archive or processing work during the catalogue sprint. Production media delivery must use `https://media.ironsprue.co.uk`; production must fail closed if the public base URL is missing or points at `r2.dev`.

## Object-Key Strategy

R2 uses object prefixes, not physical folders. The catalogue sprint must write real objects beneath these prefixes and must not create empty placeholder objects merely to simulate directories:

- `incoming/products/<sku>/`
- `archive/products/<sku>/original/`
- `processed/products/<sku>/catalogue/`
- `processed/products/<sku>/completed/`
- `processed/products/<sku>/workshop/`
- `processed/products/<sku>/lifestyle/`
- `published/products/<sku>/`
- `marketing/heroes/`
- `brands/logos/`
- `categories/`

## Asset Stages

Each imported product should have these media records, all replaceable through the Iron Sprue Admin media controls:

1. Manufacturer original: authorised source image kept unaltered for audit/reference and gallery use. It is not the default storefront image.
2. Catalogue white background: clean product-only commerce image on white. This is Image 2 and is the default customer-facing storefront image.
3. Completed product render: faithful finished-kit/product visual.
4. Workshop photography: product staged on the official Iron Sprue playmat/workbench identity.
5. Supporting workshop image: optional additional range/detail image.
6. Hero artwork: bespoke promotional artwork for home panels and offer banners.

Hero artwork must not bake in headline, CTA, badges, prices or accessibility text. Those remain HTML/CSS so Admin can change them without regenerating images.

Product gallery order is: Image 2 catalogue primary, completed result, Iron Sprue workshop image, supporting/detail images, then the original manufacturer packaging/reference image. Products must remain Draft until Image 2 has been produced and approved.

Permanent principle: Catalogue images document the product. Hero artwork sells the hobby.

Responsive derivatives should be prepared at `320`, `640`, `960`, `1280`, `1600` and `2048` pixels where the source quality allows. WebP and AVIF should be preferred for storefront delivery, with JPEG/PNG retained where transparency or source fidelity requires it.

## Workshop Identity

Use the approved Iron Sprue workshop materials as visual direction:

- Dark cutting playmat with millimetre ruler border.
- Subtle precision grid, cog diagrams and technical linework.
- Iron Sprue orange accent details.
- Build/Paint/Perfect icon treatment where appropriate.
- Foamex display/backdrop with official Iron Sprue logo and range language.
- Premium workbench lighting with modelling tools, shelves and depth.

Avoid generic stock-photo workbench scenes, raw catalogue backgrounds and full packaging images pasted into cards.

## Copy and Rights

Product copy should be factual, concise and store-owned. Use authorised distributor/manufacturer product information as source material, but do not copy long supplier descriptions wholesale. Manufacturer branding may appear only as an authorised brand logo or attribution, not as the dominant hero design.

The description pipeline must produce:

- Product title
- Short description
- Full description
- Feature bullets
- What's included
- Skill level where known
- Scale where applicable
- Dimensions where applicable
- Recommended tools
- Recommended paints
- Related accessories
- Specifications

If a fact cannot be proven from manufacturer, authorised distributor, PO or Admin-entered source material, leave it unset for review rather than inventing it.

## Operational Notes

- Uploads must target the explicitly selected Iron Sprue environment.
- The importer must fail closed if the selected bucket, public URL or store environment is ambiguous.
- Cache policy defaults to `public, max-age=31536000, immutable`.
- CORS should allow read access only from the Iron Sprue storefront/admin origins.
- Lifecycle policy should abort incomplete multipart uploads after 7 days and expire non-current versions after 90 days where versioning is enabled.
