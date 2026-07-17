# Admin Merchandising Management

Work Package 2C adds product-level merchandising controls to the existing Admin product detail page.

## Location

Open:

`/admin/products/[id]`

The Merchandising management panel appears below the standard product form.

## Merchandising Settings

Administrators can edit:

- `recommendationWeight`
- `isAccessory`
- `isStaffPick`
- `isBestSeller`
- `isNewArrival`

`recommendationWeight` must be a whole number from `-1000` to `1000`.

These fields influence ranking only. They do not make a draft, hidden, archived or out-of-stock product eligible for the storefront.

Best-seller should only be enabled when supported by genuine sales data or an authorised merchandising decision. WP2C does not calculate best sellers automatically.

## Manual Recommendations

The Admin panel supports manual product-to-product relationships.

Relationship types come from the Prisma enum:

- `RELATED`
- `ACCESSORY`
- `UPSELL`
- `CROSS_SELL`
- `MANUAL`

The add flow is server-backed:

1. Search by product name, SKU or slug.
2. Select a target product.
3. Choose relationship type.
4. Set priority.
5. Choose active state.
6. Save.

Search is bounded and excludes the current source product plus already-linked target products where practical. It does not load the full catalogue into the browser.

## Priority Convention

Lower priority numbers appear first.

Manual recommendations rank before automatic strategies when they are active and eligible.

## Eligibility

A manual relationship can remain stored while the target is temporarily ineligible.

Admin shows concise eligibility labels such as:

- Eligible
- Inactive relationship
- Unpublished
- Hidden
- Archived
- Discontinued
- Out of stock
- Missing storefront route
- Otherwise ineligible

Relationships influence ranking; they do not bypass storefront eligibility rules.

## Preview

The preview calls the same merchandising engine used by storefront product pages.

It shows the first four effective recommendations and includes:

- position
- product name
- price
- public stock state
- strategy identifier
- whether the result came from an active manual relationship

If no products qualify, Admin shows an Admin-only empty state. The customer-facing rail remains hidden when no products qualify.

## Deletion

Removing a recommendation deletes only the relationship record.

It never deletes either product. The delete form requires explicit confirmation.

## Revalidation

After settings or relationship changes, Admin revalidates:

- `/admin/products`
- `/admin/products/[id]`
- `/catalogue/[source-product-slug]`

The recommended product page is not revalidated unless its own data changes.

## Import Ownership

Product imports and Admin merchandising edits share ownership safely:

- omitted merchandising fields in an import leave existing values unchanged
- explicitly provided merchandising fields update those values
- manual recommendation relationships are managed through Admin
- repeated imports remain idempotent

## Audit Behaviour

There is no dedicated WP2C audit-log subsystem.

ProductRecommendation records retain `createdAt` and `updatedAt`. The service/action boundaries are structured so future audit events can record the acting Admin, old values and new values without changing the UI contract.

## Permissions

WP2C uses the existing Admin application boundary and server actions. Mutations validate IDs and payloads on the server and do not accept arbitrary product update objects.

## Intentionally Not Included

WP2C does not implement:

- campaign management
- campaign scheduling
- analytics dashboards
- A/B testing
- personalised recommendations
- customers-also-bought administration
- frequently-bought-together administration
- automatic best-seller calculation
