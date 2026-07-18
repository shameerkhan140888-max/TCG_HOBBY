# Product Management Foundation

This foundation lets TCG Hobby create and edit production catalogue products through Admin without direct database edits.

## Current Admin Workflow

1. Open `/admin/products/new`.
2. Enter product identity, classification, copy, pricing, supplier, stock, media URL, visibility and SEO data.
3. Save the product.
4. Review the generated Admin product detail page, pricing snapshot, inventory state, gallery metadata and storefront preview.
5. Publish only when the product is ready for public browsing and purchase.

## Product Identity

The editor supports product name, slug, SKU, optional barcode/EAN/UPC, brand, game, set or expansion, product type or format, language and condition.

Slugs are generated from product names only when left blank. Manually supplied slugs must be unique and safe. Existing published URLs are not silently changed to a suffixed URL when a duplicate slug is submitted; Admin returns a field error instead.

Product SKU is the retailer-facing product identifier. Supplier SKU is stored separately on the supplier product link.

## Pricing

Money is stored as integer minor units. Admin supports:

- regular VAT-inclusive selling price
- optional RRP
- optional sale price
- sale start and end dates
- VAT rate
- supplier cost
- landed cost for commercial margin review

Sale windows must have an end after their start. Negative prices and costs are rejected.

The commercial preview shows gross profit and margin using the current sale price when it is active, otherwise the regular selling price. Warnings are advisory when the selling price is below landed cost.

## Inventory

Inventory uses the existing `InventoryItem` model. Admin product edits can update:

- physical stock on hand
- reorder point
- reorder quantity
- incoming quantity
- storage location
- hide when out of stock

Reserved stock remains system-derived and read-only in the product editor. Updates preserve the existing reserved quantity so cart, reservation and checkout logic remain authoritative.

Available stock is derived as `stockOnHand - reservedStock` using the shared inventory helper.

## Supplier Product Data

The editor supports one preferred supplier product link per product today:

- supplier
- supplier SKU
- supplier product URL
- supplier cost or landed cost
- minimum order quantity
- pack/case quantity
- supplier lead time

The schema remains compatible with multiple supplier products later, but this package keeps the Admin UI intentionally focused on the preferred supplier path.

## Media Handling

Admin supports URL-managed media:

- primary image URL
- primary image alt text
- gallery image rows
- image order
- image role/type
- Open Graph image URL

The product import/media workflow remains the correct path for copying and optimising local product images into the storefront public asset structure. This package does not implement binary upload or cloud storage.

Gallery rows use:

```text
URL | alt text | role
```

Example:

```text
/products/pokemon/example/gallery-02.webp | Rear packaging | gallery
```

## Visibility

The editor preserves the central storefront visibility model:

- published/unpublished controls public routeability
- archived products remain visible in Admin and historical order data
- `hideWhenOutOfStock` removes zero-available products from listings while keeping direct published product pages routeable
- cart and checkout continue to enforce public/purchasable product rules

## SEO

Admin can override:

- SEO title
- meta description
- canonical URL
- Open Graph image
- noindex

When fields are omitted, product pages use deterministic defaults from the product name, route, description and primary image.

Structured data uses accurate product name, description, brand/game, category, SKU, barcode when present, VAT-inclusive price and public availability. Exact stock quantities are not exposed.

## Deferred

The following are intentionally not part of this foundation:

- CSV/supplier Import Wizard
- binary Admin image upload
- multi-supplier ranking UI
- full tax engine
- automatic market price feeds
- speculative product claims or fake product data
