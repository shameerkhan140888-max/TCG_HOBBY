# Product Availability

TCG Hobby separates product discoverability from purchase availability.

## Default Out-Of-Stock Behaviour

Products remain visible by default when available stock reaches zero. Catalogue cards, search results and direct product pages show `Out of stock`, and customer purchase controls are disabled.

Server-side cart and checkout validation still uses exact internal availability, so a stale browser or crafted request cannot buy a zero-stock product.

## Hide When Out Of Stock

Admin products include a `Hide when out of stock` setting.

When disabled:

- the product remains visible in catalogue listings
- the product remains searchable
- category listings continue to show the product
- the direct product URL remains accessible
- product cards and product detail show `Out of stock`

When enabled and available stock is zero:

- the product is hidden from catalogue listings
- the product is hidden from storefront search results
- the product is hidden from category listings
- the direct product URL remains accessible
- product detail still shows `Out of stock`

The setting defaults to disabled for existing and newly imported products.

## Direct Product Routes

Direct product pages use normal public-route eligibility: published, lifecycle `PUBLISHED`, not archived and not discontinued. They do not use the listing hide-at-zero rule, so staff can share a product URL even while the product is temporarily hidden from discovery.

## Basket Protection

The cart and checkout pipeline validates available stock from inventory and reservations before adding, updating or reserving items. Zero-stock products cannot be purchased even if their direct URL remains visible.

## Merchandising And Recommendations

Out-of-stock products are excluded from merchandising and recommendation rails by default, regardless of `hideWhenOutOfStock`. Manual recommendation relationships may remain configured in Admin, but the public engine will not surface the item until it is eligible and in stock again.

## Admin Location

Admin -> Products -> Product -> Publishing contains the `Hide when out of stock` checkbox.

Admin product lists continue to show every product, including zero-stock products. Products with the setting enabled display a compact `Hide at zero stock` badge.

## Import Manifest Support

`product.json` may include:

```json
{
  "hideWhenOutOfStock": false
}
```

The field is optional. For new imports, omitted means `false`. For existing products, omitted preserves the current Admin value. Use an explicit `true` or `false` only when the import manifest should update the setting.

## Revalidation

Saving a product in Admin revalidates:

- `/catalogue`
- `/catalogue/{slug}` when a slug is available
- `/`
- `/admin/products`
- `/admin/products/{id}`

Merchandising changes continue to revalidate the product route and Admin product surfaces through the existing merchandising revalidation path.

## Troubleshooting

If a zero-stock product still appears in catalogue after enabling the setting, confirm inventory available stock is actually zero after reservations and that the product save completed successfully.

If a direct product URL returns not found, check publication state, lifecycle state, archive state and release status. The hide-at-zero setting alone does not cause a direct-route 404.
