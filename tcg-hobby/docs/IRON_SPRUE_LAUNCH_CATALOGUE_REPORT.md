# Iron Sprue Launch Catalogue Report

Source workbook: `C:\Users\Shameer\Downloads\PO awaiting.xlsx`

Source sheet used for stocked launch data: `Purchase Order`

## Imported Summary

- Accepted genuine stocked product lines: 67.
- Total opening units: 183.
- Store code: `IRON_SPRUE`.
- VAT rate applied by importer: 20%.
- Data file: `apps/iron-sprue/data/launch-products.json`.

## Brands

- Aoshima
- Deluxe Materials
- Expo Tools
- OcCre Creations
- Pintoo
- Tasma

## Categories

The PO-derived data preserves the workbook category values, including model kits, Pintoo 3D products and workshop essentials/tools.

## Pricing

The importer preserves:

- trade ex VAT;
- trade inc VAT;
- provisional launch retail price;
- lowest verified retail where supplied;
- gross-margin source fields where they are part of the workbook source.

The storefront displays VAT-inclusive provisional launch retail prices.

## Media

No third-party retailer images or descriptions were imported. The seed records supplier asset status and supplier asset references from the workbook. Product media must be attached from supplier-approved sources before public launch.

## Rejected Products

No rows from the `Purchase Order` sheet were rejected during the current extraction. The `Held From Launch` sheet remains excluded from opening stock by design.

## Validation Notes

The import validation contract covers required names/SKUs, duplicate SKUs, approved launch brands, category/product type, VAT range, retail price and stock quantities. Idempotent database upsert behaviour is still required in the shared database import step.
