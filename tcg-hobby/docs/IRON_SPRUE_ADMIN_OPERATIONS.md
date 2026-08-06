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

## Current Migration Blocker

The dedicated Iron Sprue Neon database is reachable, but the historical migration chain is not fresh-database safe yet. `20260718_catalogue_master_data` assumes legacy `Product.brand`, `Product.productType` and `Product.language` text columns exist before `20260718_product_management_foundation` adds them. The Iron Sprue database now has a failed `_prisma_migrations` record for `20260718_catalogue_master_data`.

Do not run `prisma migrate reset`, `db push`, manual compatibility SQL, or `prisma migrate resolve` without explicit approval. The safe recovery package is:

1. Add a reviewed compatibility migration or reorder-safe migration path for fresh isolated store databases without modifying already-applied production migrations.
2. Mark the failed Iron Sprue migration as rolled back only after the recovery migration is reviewed.
3. Re-run `migrate deploy` against the Iron Sprue direct URL.
4. Confirm the new `20260805130000_iron_sprue_admin_foundation` migration applies cleanly.
