# Iron Sprue Admin Operations

Iron Sprue reuses the proven TCG Hobby Admin application and shared database package. The Admin runtime must be deployed or started with Iron Sprue-only operational resources before any mutable Iron Sprue content is edited.

## Required Runtime Boundary

- Admin database: Iron Sprue Neon project and selected Iron Sprue branch.
- Media bucket: Iron Sprue R2 bucket and public media domain.
- Storefront URL: Iron Sprue storefront origin.
- Commerce credentials: Iron Sprue Stripe account and webhook secrets.

Do not manage Iron Sprue launch content from an Admin runtime connected to the TCG Hobby production database or TCG Hobby media bucket.

## Supported Controls

- Products and media: `/admin/products?game=iron-sprue`
- Hero carousel: `/admin/storefront`
- Promotional banner: `/admin/storefront`
- Landing and range copy: `/admin/storefront`
- Stocked brand carousel source: `/admin/catalogue/brands`
- Categories and filters: `/admin/catalogue/categories`

The `/admin/iron-sprue` page lists these controls and the isolation requirement for operators.

## Brand Carousel

Only official approved brand logos should be attached to Iron Sprue brand records or public media. The public storefront must not render placeholder or fabricated manufacturer logos. Additional brands can be added through Admin once approved logo assets have been uploaded to the Iron Sprue media bucket.

## Placeholder Media

The Admin page exposes generated Iron Sprue placeholder scenes under `apps/admin/public/iron-sprue/placeholders/`. These are original workshop-style images for temporary hero, category and promo slots only. They are not manufacturer assets and must not be used as product-card proof of the exact purchased item.

## Storefront Rendering

The current visual storefront uses local approved launch data while the commerce import and production database are being prepared. Once Iron Sprue product data is imported into the dedicated database, the same Admin product, media, homepage hero placement, banner and catalogue screens provide the mutable source for the live storefront.
