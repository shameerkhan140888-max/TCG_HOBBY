# Product Import Workflow

TCG Hobby products are imported through a reviewed folder workflow. The importer validates product data, validates media data, normalises the input, copies approved media, registers gallery rows, generates SEO defaults, records an audit entry and leaves publication under explicit control.

## Add A Product In Five Steps

1. Run `npm run db:seed` to ensure canonical lookup data exists.
2. Create `product-imports/{game}/{product-slug}/`.
3. Add `product.json`, `media.json` and approved images under `images/`.
4. Run `npm run product:validate -- --path product-imports/{game}/{product-slug}`.
5. Run `npm run product:dry-run -- --path product-imports/{game}/{product-slug}` and review planned changes.
6. Run `npm run product:import -- --path product-imports/{game}/{product-slug}`, review in Admin, then publish only after approval.

## Seed Process

`npm run db:seed` inserts only canonical lookup data required by imports. It does not wipe products, orders, carts, users or customer data.

The seed prints permanent operational progress logs:

```text
Seed starting...
Connecting to database...
Seeding categories...
Seeding suppliers...
Seeding products...
Seeding users...
Verifying canonical lookup data...
Disconnecting Prisma...
Seed complete.
```

`Seeding products...` and `Seeding users...` are retained as operational checkpoints. The production lookup seed does not create demo products or demo users.

## Required Lookup Data

The importer expects canonical lookup rows to exist before dry-run or import. Run `npm run db:seed` after migrations and before the first product import.

Canonical category slugs:

- `pokemon-tcg`
- `magic-the-gathering`
- `one-piece-card-game`
- `accessories`
- `sealed-product`
- `singles`
- `supplies`
- `events`

Canonical supplier slugs:

- `card-citadel`
- `gamegrid-wholesale`

The Mega Greninja manifest uses:

- `category: "sealed-product"`
- `supplierSlug: "card-citadel"`

If a category or supplier is missing, dry-run/import fails before writing product data and reports the exact missing slug.

## Folder Structure

```text
product-imports/
├── README.md
├── examples/
│   ├── product.example.json
│   └── media.example.json
├── pokemon/
├── magic/
├── one-piece/
├── lorcana/
├── yugioh/
└── accessories/
```

Each product folder must contain:

```text
product-imports/{game}/{product-slug}/
├── product.json
├── media.json
└── images/
    ├── 01-primary.webp
    ├── 02-gallery-name.webp
    └── ...
```

## Product Schema

`product.json` contains commercial product data only:

- immutable `importId`
- identity: name, slug, SKU and optional barcode
- brand/game/category/product type
- lifecycle state and visibility
- VAT-inclusive price and VAT rate
- exact internal stock quantity
- purchase limits
- product-specific shipping promotions
- short and full descriptions
- verified contents and variation notice
- SEO title/description defaults
- homepage and merchandising flags
- import source and internal reference notes

The importer may derive slug, internal SKU and SEO defaults. It must not invent contents, release dates, barcodes, reviews, rarity, RRPs, stock levels or supplier claims.

## Media Schema

`media.json` contains media metadata only:

- display order
- filename
- alt text
- image role: `PRIMARY`, `GALLERY`, `OPENGRAPH`, `HERO`
- hero, homepage and OpenGraph eligibility
- thumbnail usage: `NONE`, `CARD`, `GALLERY`, `BOTH`
- provenance
- licensing and internal notes

Supported image inputs are PNG, JPEG, WebP and AVIF. The importer preserves source framing and never crops official product photography.

## Lifecycle

Supported lifecycle states:

- `DRAFT`
- `AWAITING_IMAGES`
- `AWAITING_REVIEW`
- `READY_TO_PUBLISH`
- `PUBLISHED`
- `HIDDEN`
- `ARCHIVED`
- `DISCONTINUED`

Imports default to `DRAFT`. Only `PUBLISHED` products with `visible: true` become public storefront products. Publishing remains a manual Admin action.

## Pipeline Stages

The import pipeline is staged:

1. validate input
2. normalise data
3. process media
4. validate business rules
5. create or update product
6. register media
7. generate SEO defaults
8. register gallery
9. make storefront availability match lifecycle
10. record audit history

Each stage is represented in the dry-run output and covered by importer tests where practical.

## Commands

```bash
npm run db:seed
npm run product:validate -- --path product-imports/pokemon/example-product
npm run product:dry-run -- --path product-imports/pokemon/example-product
npm run product:import -- --path product-imports/pokemon/example-product
npm run product:import:all
```

`product:validate` changes nothing.

`product:dry-run` changes nothing and prints lifecycle, stock state, pipeline stages and planned media changes.

`product:import` creates or updates one product, copies media, registers gallery data and records audit history.

`product:import:all` processes every product folder independently and reports success or failure for each one.

## Troubleshooting

If seed appears to stop after Prisma config output, check that the command is running the current lookup-only seed and that the database URL is reachable from the process. The seed should always print `Seed starting...` before connecting.

If dry-run fails with `Product import prerequisite missing: category "..." does not exist`, run `npm run db:seed` and confirm the manifest category slug matches one of the canonical category slugs above.

If dry-run fails with `Product import database lookup failed`, fix the database connection first. Dry-run must never treat a failed database lookup as a new product.

## Idempotent Updates

Products are matched in this order:

1. immutable import ID
2. stable product ID
3. SKU
4. slug

Rerunning an import updates changed fields, preserves orders, carts, wishlists and inventory references, and avoids duplicate product/image rows.

Existing gallery images are not deleted unless a future explicit removal workflow is added.

## Import Audit

Each successful import records:

- import date
- product ID
- import ID
- source type/reference
- lifecycle state
- changed fields
- previous values
- next values
- validation warnings
- process/user name

Admin surfaces import source, lifecycle, last import date, warnings and merchandising settings for review.

## Media Output

Approved media is copied to:

```text
apps/storefront/public/products/{game}/{slug}/
```

Output names are stable:

- `primary.webp`
- `primary-card.webp`
- `gallery-02.webp`
- `gallery-03.webp`
- `hero.webp`
- `opengraph.webp`

The importer writes `media-manifest.json` with checksums. Product contexts use object-contain so official product photography is not cropped.

## Adapter Architecture

Manual folders are the first adapter. Future adapters should transform CSV, XML, JSON/API or manufacturer media-pack data into:

```ts
{
  product: ProductImportManifest;
  media: ProductImportMediaManifest;
}
```

No adapter may scrape unauthorised websites or publish unreviewed products.

## Rollback And Recovery

1. Unpublish or move the product to `HIDDEN` in Admin.
2. Correct `product.json`, `media.json` or image files.
3. Validate and dry-run again.
4. Re-import.
5. Review the audit entry before republishing.

## Mega Greninja Media Provenance

The Mega Greninja assets in `product-imports/pokemon/pokemon-tcg-mega-greninja-ex-premium-collection/` were supplied by the business owner for use on the TCG Hobby product listing.

They may later be replaced with TCG Hobby photography, authorised supplier media, authorised distributor media or authorised manufacturer retailer assets.
