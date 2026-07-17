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
- `createProductRecommendation(input)`

The `getMerchandisingFeaturedProducts` and `getMerchandisingLatestProducts` export names avoid clashing with the existing catalogue helpers.

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
6. Featured or staff-pick products
7. New arrivals
8. Latest eligible products

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

## Future Consumers

Future product pages can call `getRelatedProducts({ sourceProductId, resultLimit: 4 })` and render the returned storefront-safe cards.

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

## Intentionally Not Implemented In WP2A

- storefront carousel
- product-page recommendation section
- full Admin relationship editor
- campaign-management UI
- analytics storage
- personalisation
- frequently bought together
- customers also bought
- recently viewed recommendations
