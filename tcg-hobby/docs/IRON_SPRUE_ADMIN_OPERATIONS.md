# Iron Sprue Admin Operations

Iron Sprue now has a dedicated Admin workspace inside the existing Admin application shell. It reuses authentication, UI primitives and database infrastructure code, but Iron Sprue product, inventory, media, homepage and review records are held in Iron Sprue-specific tables and are always server-scoped to `IRON_SPRUE`.

## Required Runtime Boundary

- Admin database: Iron Sprue Neon project and selected Iron Sprue branch.
- Media bucket: Iron Sprue R2 bucket and public media domain.
- Storefront URL: Iron Sprue storefront origin.
- Commerce credentials: Iron Sprue Stripe account and webhook secrets.

Do not manage Iron Sprue launch content from an Admin runtime connected to the TCG Hobby production database or TCG Hobby media bucket.

## Dedicated Workspace

- Overview: `/admin/iron-sprue`
- Products: `/admin/iron-sprue/products`
- Inventory: `/admin/iron-sprue/inventory`
- Goods Received: `/admin/iron-sprue/goods-received`
- Categories: `/admin/iron-sprue/categories`
- Brands: `/admin/iron-sprue/brands`
- Suppliers: `/admin/iron-sprue/suppliers`
- Media: `/admin/iron-sprue/media`
- Content Review: `/admin/iron-sprue/content-review`
- Import Batches: `/admin/iron-sprue/import-batches`
- Homepage: `/admin/iron-sprue/homepage`
- Heroes: `/admin/iron-sprue/heroes`
- Special Offers: `/admin/iron-sprue/special-offers`
- Orders: `/admin/iron-sprue/orders`
- Settings: `/admin/iron-sprue/settings`
- Audit Log: `/admin/iron-sprue/audit-log`

The older TCG surfaces such as `/admin/products`, `/admin/storefront`, `/admin/catalogue`, releases, buylist and card metadata are not the Iron Sprue source of truth.

## Permissions

Iron Sprue Admin roles are:

- `SUPER_ADMIN`
- `STORE_ADMIN`
- `CATALOGUE_MANAGER`
- `INVENTORY_MANAGER`
- `CONTENT_MEDIA_MANAGER`
- `ORDER_MANAGER`
- `READ_ONLY_AUDITOR`

The permission matrix is exported by `getIronSprueAdminPermissionMatrix()`. Existing platform `ADMIN` users map to `SUPER_ADMIN`; non-admin staff must receive an active Iron Sprue permission grant before mutable actions are allowed.

## Publication Readiness

Products cannot become `READY` or `PUBLISHED` until these checks pass:

- title, SKU and slug are present;
- brand and category are assigned;
- VAT-inclusive price and VAT rate are set;
- short and full descriptions exist;
- structured specifications are reviewed;
- an approved `catalogue-primary` Image 2 is marked primary;
- SEO title and meta description exist;
- no content review is pending or conflicted.

## Brand Carousel

Only official approved brand logos should be attached to Iron Sprue brand records or public media. The public storefront must not render placeholder or fabricated manufacturer logos. Additional brands can be added through Admin once approved logo assets have been uploaded to the Iron Sprue media bucket.

## Placeholder Media

Generated Iron Sprue placeholder scenes can be referenced as Admin-managed placeholder media for hero, category and promo slots only. They are original workshop-style images, not manufacturer assets, and must not be used as product-card proof of the exact purchased item.

## Storefront Rendering

The current visual storefront uses local approved launch data while the commerce import and production database are being prepared. Once Iron Sprue product data is imported into the dedicated database, the dedicated Iron Sprue Admin product, media, homepage hero, banner, brand and offer screens become the mutable source for the live storefront.

## Catalogue Import Handoff

The Tasma proforma and final catalogue are not imported in this Admin-completion sprint. The next sprint must explicitly select the Iron Sprue environment, verify the target Neon database and R2 bucket, run the import as a draft/review operation, and keep every row retryable or skippable.

## Migration Chain Repair

The historical migration chain previously failed on an empty Iron Sprue Neon database because `20260718_catalogue_master_data` backfilled `Product.brandId`, `Product.productTypeId` and `Product.languageId` from legacy text columns before `20260718_product_management_foundation` created `Product.brand`, `Product.productType` and `Product.language`.

The permanent repository repair is intentionally narrow:

- `20260718_000000_product_legacy_text_columns_for_catalogue_master_data` temporarily creates the three legacy text columns before the catalogue backfill.
- `20260718_catalogue_master_data_cleanup_legacy_text_columns` removes those temporary columns before product-management adds the durable columns.
- The cleanup is guarded by `_prisma_migrations` so an existing database that already applied `20260718_product_management_foundation` keeps its real columns.

Do not use `prisma migrate reset`, destructive `db push`, manual SQL patches, or migration-history deletion to repair store databases. Every migration must be validated against a completely empty database before it is accepted.

### Fresh Database Validation

Use a disposable Neon branch or an isolated PostgreSQL schema selected through the direct Iron Sprue connection string. Do not seed the catalogue as part of migration validation.

Required sequence:

1. Confirm the disposable target is empty and `_prisma_migrations` does not exist.
2. Run `node ./scripts/prisma-run.mjs migrate deploy` from `packages/database` with `DATABASE_URL` pointing to the disposable target.
3. Run `node ./scripts/prisma-run.mjs migrate status`.
4. Run `node ./scripts/prisma-run.mjs validate`.
5. Run `node ./scripts/prisma-run.mjs generate`.
6. Confirm `_prisma_migrations` has no failed rows.
7. Confirm the Iron Sprue Admin tables exist.
8. Run a minimal insert/delete smoke test and remove the disposable test rows.
9. Run schema diff and document any Prisma identifier-name-only drift.

### Existing Iron Sprue Database Recovery

The current dedicated Iron Sprue database is empty of catalogue data but has one failed `_prisma_migrations` row for `20260718_catalogue_master_data`. Inspection found no partial `Game`, `Brand`, `ProductType`, `ProductLanguage`, `ProductSet` or Iron Sprue Admin tables and no partial Product master-data columns.

Preferred recovery is to create a clean Neon branch from the Iron Sprue project, apply the repaired migration chain from zero, verify it, then update the Iron Sprue environment variables to the new branch after explicit approval. If continuing the existing branch is chosen instead, first obtain approval to mark only the failed `20260718_catalogue_master_data` row as rolled back, then run normal `migrate deploy`; do not mark the migration as applied.

The direct migration URL must use `IRON_SPRUE_DIRECT_DATABASE_URL`. Runtime pooled reads/writes must use the approved Iron Sprue pooled URL. Never point Iron Sprue migration or import commands at the TCG Hobby database.

Catalogue import may begin only after:

- migration deploy succeeds from an empty target;
- `_prisma_migrations` has zero failed rows;
- Admin-required tables exist;
- database target host/database have been redacted and confirmed as Iron Sprue;
- no TCG or Corporate database is selected.
