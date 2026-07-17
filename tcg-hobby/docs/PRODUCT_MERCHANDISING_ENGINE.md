# Product Merchandising Engine

Work Package 2A adds the backend foundation for deterministic product merchandising. It does not add a storefront recommendation carousel, Admin editor, campaign UI, analytics storage or personalisation.

## Architecture

The engine lives in `packages/database/src/merchandising.ts` and is exported from `@tcg-hobby/database`.

It is built around three layers:

1. **Context**: placement, source product, limit, exclusions, category/game/product-type filters and optional campaign influence.
2. **Strategies**: small providers that return bounded candidate products.
3. **Orchestrator**: executes strategies in priority order, applies eligibility, deduplicates candidates and returns storefront-safe product-card data.

The engine is reusable by storefront product pages, homepage merchandising, future Admin product management, campaign tools and analytics pipelines.

## Service Methods

The public service surface includes:

- `getRecommendedProducts(context)`
- `getRelatedProducts(context)`
- `getAccessoryRecommendations(context)`
- `getMerchandisingFeaturedProducts(limit)`
- `getMerchandisingLatestProducts(limit)`
- `getMerchandisingStaffPickProducts(limit)`
- `createProductRecommendation(input)`

The homepage-oriented export names avoid clashing with the existing catalogue helpers.

## Merchandising Context

The context can include:

- `sourceProductId`
- `resultLimit`
- `placement`
- `excludedProductIds`
- `requireInStock`
- `categorySlugs`
- `games`
- `productTypes`
- `manualRelationshipTypes`
- `enabledStrategyIds`
- `campaignInfluences`
- `now`

When `enabledStrategyIds` is omitted, all supplied strategies are enabled. Passing an empty array disables all strategies, which is useful for tests and Admin preview tooling.

## Storefront-Safe Projection

Recommendations return `StorefrontSafeMerchandisingProduct` data only:

- id, slug, name
- primary image URL and alt text
- VAT-inclusive public price
- public stock state
- game and category labels
- product-specific free-delivery state
- purchase-limit value where genuine
- wishlist/basket eligibility

The projection does not return:

- exact stock quantity
- supplier names or costs
- supplier-product references
- private inventory metadata
- full descriptions
- full gallery arrays
- recommendation scores
- campaign internals

## Eligibility Rules

A product can be recommended only when it is:

- published
- in lifecycle state `PUBLISHED`
- not archived
- not release-status `ARCHIVED`
- routeable with a slug
- not the source product
- not explicitly excluded
- not already selected
- in stock when `requireInStock` is true

Manual relationships and future campaign boosts do not bypass these rules.

## Deterministic Ranking

The default strategy order is:

1. Manual relationships
2. Same game and category
3. Same game and product type
4. Same game
5. Accessories
6. Featured products
7. Staff picks
8. New arrivals
9. Latest eligible products

Within strategy output, ranking is deterministic:

1. campaign priority, when supplied and active
2. strategy priority
3. strategy rank or manual relationship priority
4. recommendation weight
5. homepage priority
6. featured flag
7. created date
8. stable product id

The engine does not use random ordering, database random ordering or request-time shuffling.

## Strategy Pipeline

Each strategy implements:

```ts
type MerchandisingStrategy = {
  id: string;
  priority: number;
  getCandidates(context, helpers): Promise<MerchandisingCandidate[]>;
};
```

Strategies are independently testable and can be enabled, disabled or reordered without modifying other strategies.

To add a new strategy:

1. Create a strategy object with a stable `id`.
2. Give it a deterministic `priority`.
3. Use the helper query functions to return bounded candidate products.
4. Add it to `defaultMerchandisingStrategies` or pass it explicitly to `getRecommendedProducts`.
5. Add tests for eligibility, ordering and deduplication.

## Manual Product Relationships

The schema includes `ProductRecommendation` with:

- `sourceProductId`
- `recommendedProductId`
- `relationshipType`
- `priority`
- `active`
- timestamps

Relationship types:

- `RELATED`
- `ACCESSORY`
- `UPSELL`
- `CROSS_SELL`
- `MANUAL`

The database enforces uniqueness for source, recommended product and type. The service rejects self-recommendations before writing.

## Accessories Fallback

For a product such as Mega Greninja, a future product page can request:

Mega Greninja -> eligible Pokemon products -> eligible accessories -> latest eligible products -> fewer results or no section if nothing qualifies.

If the requested limit is 4 and same-game results provide 2 eligible products, accessories can fill 2 remaining slots. Out-of-stock products are not used just to fill the limit.

## Merchandising Fields

WP2A adds these optional product fields:

- `recommendationWeight`
- `isAccessory`
- `isStaffPick`
- `isBestSeller`
- `isNewArrival`

Existing fields are reused where possible:

- `featured`
- `homepagePriority`
- `heroFeatured`
- `published`
- `lifecycleState`

No real product is automatically marked as a best seller or trending item. Flags are manual or future data-backed signals.

## Product Import Integration

Product import manifests may optionally include:

- `recommendationWeight`
- `isAccessory`
- `isStaffPick`
- `isBestSeller`
- `isNewArrival`

Omitting these fields is valid and applies safe defaults. Negative recommendation weights are rejected. Existing manifests remain backward compatible.

Manual product-to-product relationships are not imported from manifests in WP2A. That avoids creating accidental recommendations before Admin review tooling exists.

## Query Performance

The engine uses bounded candidate queries per strategy. The default per-strategy candidate cap is 24, with modest oversampling before deduplication.

Queries select product, category, inventory and a small primary-image slice only. The engine avoids query-per-card mapping and does not load full descriptions or full galleries.

Recommendations are stock-sensitive and are not cached by this package.

## Campaign Extension Point

WP2A does not add campaign persistence. Instead it defines typed campaign influence inputs:

- campaign id/name
- active flag
- priority
- optional start/end dates
- active product priorities

Campaign influence is deterministic and remains subject to central eligibility. This is enough for future homepage and landing-page placements without overbuilding campaign management now.

## Analytics Event Foundation

WP2A defines typed future analytics events only:

- recommendation impression
- recommendation click
- add to basket from recommendation
- purchase attribution

Event context supports placement, source product, recommended product, strategy, position, session reference, user reference, timestamp and campaign reference.

No cookies, client tracking, personal data collection, dashboards or analytics storage are implemented in WP2A.

## WP2B Storefront Integration

Work Package 2B connects the product-detail page to the merchandising engine.

The customer-facing product page calls:

```ts
getRelatedProducts({
  sourceProductId: product.id,
  resultLimit: 4,
  excludedProductIds: [product.id],
});
```

Selection remains server-side. The browser receives only the storefront-safe recommendation projection, never exact stock, supplier data, inventory metadata or recommendation internals.

The product page renders the rail directly beneath the consolidated Product Information section. If the engine returns no eligible products, the section is not rendered.

## Recommendation Rail

The storefront rail is split into two pieces:

- a server-rendered product rail that maps safe recommendation data into product cards, wishlist controls and add-to-basket forms
- a small client scroller that only handles horizontal navigation, overflow detection and reduced-motion-aware scrolling

The rail supports:

- up to four product-detail recommendations for the current placement
- mobile horizontal swipe with scroll snapping
- keyboard-accessible previous and next controls when overflow exists
- deterministic analytics metadata attributes for future tracking
- public stock states only: `IN STOCK`, `LOW STOCK`, `OUT OF STOCK`
- product-specific free delivery and purchase-limit badges only when backed by data

The rail does not emit analytics events in WP2B. It exposes stable metadata attributes so a future analytics package can record impressions and clicks deliberately.

## Global Payment Trust Banner

WP2B also adds a compact storefront payment reassurance strip above the footer.

The banner uses wording supported by the current checkout implementation:

- card payments are processed through Stripe
- Visa and Mastercard are shown as supported card brands
- VAT is included in product prices

PayPal and other payment methods are intentionally not shown because the current checkout path only creates Stripe card checkout sessions.

## WP2D Homepage Merchandising Rollout

Work Package 2D connects the production homepage to the merchandising engine.

Homepage data is assembled by `apps/storefront/lib/homepage-data.ts` using:

- `getMerchandisingFeaturedProducts(8)`
- `getMerchandisingLatestProducts(8)`
- `getMerchandisingStaffPickProducts(8)`

The homepage then performs only adjacent-section deduplication before rendering:

- Featured products
- Latest arrivals
- Staff picks

Sections with no eligible products are not rendered. The page does not show fabricated products or filler empty states.

The visible homepage product cards use the same `ProductMerchandisingRail` component as product-detail recommendations, so stock labels, wishlist controls, free-delivery badges, purchase-limit badges and add-to-basket behaviour remain consistent.

## Staff Pick Strategy

WP2D adds `StaffPickStrategy`.

It selects eligible products where `isStaffPick` is true and ranks them deterministically by:

1. `recommendationWeight`
2. `homepagePriority`
3. creation date
4. product id

Staff picks remain subject to the central eligibility rules. A draft, hidden, archived, unavailable or out-of-stock staff pick is not rendered on the storefront.

## WP2C Admin Merchandising Controls

Work Package 2C adds Admin controls to the existing product detail page at `/admin/products/[id]`.

The Admin panel supports:

- editing `recommendationWeight`
- toggling `isAccessory`, `isStaffPick`, `isBestSeller` and `isNewArrival`
- creating manual `ProductRecommendation` relationships
- editing relationship type, priority and active state
- deleting relationship records without deleting products
- searching bounded product candidates by name, SKU or slug
- viewing eligibility reasons for each manual relationship
- previewing the first four effective recommendations using the actual merchandising engine

## Admin Diagnostic Preview

The Admin preview uses `getRelatedProducts({ sourceProductId, resultLimit: 4 })`.

It returns Admin-safe diagnostic data:

- final position
- product name
- price
- public stock state
- strategy identifier
- whether the product is part of an active manual relationship

It does not expose supplier cost, private inventory metadata, customer data or campaign internals.

## Relationship Priority

Manual relationship priority uses the WP2A convention:

Lower number means higher priority.

Manual relationships are still subject to central eligibility. An active manual relationship can be skipped when the target is draft, hidden, archived, unavailable, out of stock or missing a storefront route.

## Admin Eligibility Visibility

Admin relationship rows show concise eligibility states:

- Eligible
- Inactive relationship
- Unpublished
- Hidden
- Archived
- Discontinued
- Out of stock
- Missing storefront route
- Otherwise ineligible

Stored relationships are preserved even when temporarily ineligible so future publication or stock changes can make them effective again.

## Storefront Revalidation

After Admin merchandising changes, the server actions revalidate:

- `/admin/products`
- `/admin/products/[id]`
- `/catalogue/[source-product-slug]`

This targets the source product page whose recommendation rail can change. The whole storefront is not invalidated.

## Import Versus Admin Ownership

Product import manifests may set merchandising flags when the fields are explicitly provided.

The safe ownership policy is:

- omitted import fields do not overwrite existing Admin merchandising values
- explicitly provided import fields update those values
- manual product relationships are managed through Admin
- repeated imports remain idempotent

## Audit Notes

WP2C does not add a new audit-log subsystem. Relationship records retain `createdAt` and `updatedAt`, and service/action boundaries are structured so a future audit layer can record acting Admin, old values and new values.

## Future Consumers

Product pages call `getRelatedProducts({ sourceProductId, resultLimit: 4 })` and render the returned storefront-safe cards through the recommendation rail.

The production homepage calls the homepage merchandising services and renders the same rail surface with homepage-specific headings.

Future Admin controls can manage `ProductRecommendation` records, merchandising flags and preview placements by calling the same engine with `placement: 'ADMIN_PREVIEW'`.

## Troubleshooting Missing Recommendations

If no recommendations appear, check:

- source product id exists
- candidate products are published and lifecycle `PUBLISHED`
- candidate products have stock available
- products are not archived or release-status `ARCHIVED`
- explicit exclusions do not remove every result
- manual relationships are active
- campaign influence is active and date-valid
- requested strategy IDs are enabled

## Intentionally Not Implemented In WP2A-WP2D

- campaign-management UI
- analytics storage
- personalisation
- frequently bought together
- customers also bought
- recently viewed recommendations
- client recommendation selection
- fake analytics, fake products or unsupported payment-method claims
