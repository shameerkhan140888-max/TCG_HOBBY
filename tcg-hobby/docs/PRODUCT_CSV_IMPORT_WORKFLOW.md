# Product CSV Import Workflow

This workflow lets TCG Hobby prepare launch inventory without direct database editing.

## Add Products In Five Steps

1. Open Admin > Products > Import CSV.
2. Download the CSV template.
3. Complete one row per product using canonical category, supplier and catalogue master-data values.
4. Select **Preview import** and fix any row errors.
5. Select **Import ready rows**, then review each product in Admin before publishing.

## Required Columns

The required headers are:

- `name`
- `sku`
- `categorySlug`
- `supplierSlug`
- `game`
- `priceMinor`
- `vatRate`
- `costMinor`
- `stockOnHand`
- `description`
- `longDescription`

Prices are stored in minor units. For example, `4999` means GBP 49.99. Storefront product prices are VAT inclusive.

## Controlled Catalogue Values

CSV rows are resolved against Admin > Catalogue Settings. The importer does not create games, brands, product types, languages or sets from CSV data.

Use existing active values for:

- `game`: game name or slug, for example `Pokemon TCG` or `pokemon-tcg`
- `brand`: brand name or slug, for example `Pokemon TCG` or `pokemon-tcg`
- `productType`: product type name or slug, for example `Premium Collection`
- `language`: language name or code, for example `English` or `en`
- `setSlug`: optional set or expansion slug, for example `black-bolt`

If a set is supplied, it must belong to the selected game. Unknown or inactive values are rejected during preview and no import is written.

## Duplicate Matching

The CSV importer detects existing products in this order:

1. SKU
2. Barcode, when supplied
3. Slug

If a match is found, the row updates the existing product. If no match is found, the row creates a new product.

## Validation

Preview checks:

- required fields
- whole-number pricing and stock
- non-negative inventory values
- valid category and supplier slugs
- valid active game, brand, product type, language and set values
- set/game compatibility
- duplicate SKU, barcode and slug values inside the same CSV
- managed image paths or HTTP(S) image URLs
- supported product conditions
- supported boolean values

Rows with errors cannot be imported.

## Atomic Imports

An import runs in one database transaction. If any row fails during execution, the whole import is rolled back.

The importer updates:

- product identity and commercial fields
- inventory planning fields
- preferred supplier product metadata
- primary image URL, when supplied
- import audit history

Existing cart, wishlist and order references are preserved because matched products keep their product ID.

## Template Notes

Use the downloaded template from the Admin import page as the source of truth. Optional columns can be left blank.

Recommended launch-stock defaults:

- `condition`: `SEALED`
- `currency`: handled automatically as GBP
- `setSlug`: leave blank unless the set already exists in Catalogue Settings
- `published`: `false` until reviewed
- `locationCode`: `MAIN`
- `minimumOrderQuantity`: `1`
- `supplierLeadTimeDays`: `7`

Do not use CSV import to invent product contents, reviews, rarity claims or supplier claims.

## Payment Trust Notes

The storefront payment strip displays only enabled, checkout-supported methods. Visa and Mastercard are enabled through Stripe card checkout. PayPal remains configured but disabled until PayPal checkout is implemented and verified.
