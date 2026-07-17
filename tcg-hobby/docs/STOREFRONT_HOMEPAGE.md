# Production Storefront Homepage

The storefront homepage is the public retail homepage used when `TCG_HOBBY_STOREFRONT_MODE=storefront`.

When `TCG_HOBBY_STOREFRONT_MODE=coming-soon`, `/` continues to render the approved launch landing page. The `/coming-soon` route remains available in both modes.

## Structure

The production homepage renders these sections in order:

1. Storefront header with shop menu, search, account and basket count.
2. Structured merchandising hero carousel.
3. Compact category pill navigation.
4. Featured products from the merchandising engine.
5. Slim pre-order/releases banner.
6. Latest arrivals from the merchandising engine.
7. Staff picks from the merchandising engine, only when eligible products exist.
8. Why TCG Hobby trust commitments.
9. Slim accessories banner.
10. Compact trust strip.
11. Follow TCG Hobby social section, only when approved social URLs are configured.
12. Newsletter strip, payment trust banner and storefront footer from the global layout.

## Data Sources

Homepage data is assembled by `apps/storefront/lib/homepage-data.ts`.

Product sections use the WP2A merchandising engine:

- Featured products: `getMerchandisingFeaturedProducts`
- Latest arrivals: `getMerchandisingLatestProducts`
- Staff picks: `getMerchandisingStaffPickProducts`

The homepage performs only adjacent-section deduplication. Ranking, eligibility and storefront-safe projection stay inside the merchandising engine.

Visual components do not query Prisma directly. The homepage passes typed service results into reusable presentational components.

## Product Selection

Featured products, latest arrivals and staff picks show eligible products only.

Eligibility requires products to be published, routeable, not archived, not discontinued and in stock according to the central merchandising rules.

Sections with no eligible products are hidden instead of displaying fake products or customer-facing filler.

## Product Rendering

Homepage merchandising uses `ProductMerchandisingRail`, the same reusable rail used by product-detail recommendations.

This keeps the following consistent across homepage and catalogue/product flows:

- public stock labels
- product images
- VAT-inclusive prices
- wishlist heart control
- add-to-basket behaviour
- product-specific free-delivery badges
- purchase-limit badges

## Category Links

The compact category pill navigation links to existing catalogue routes:

- Pokemon: `/catalogue?q=Pokemon`
- Magic: `/catalogue?q=Magic`
- Disney Lorcana: `/catalogue?q=Lorcana`
- Yu-Gi-Oh!: `/catalogue?q=Yu-Gi-Oh`
- One Piece Card Game: `/catalogue?q=One+Piece`
- Accessories: `/catalogue?category=accessories`

The row is navigational only. It does not imply product availability where no products are currently published.

## Social Links

The homepage follow section and storefront footer use the shared `SocialLinks` component.

Approved platforms for WP2D:

- Facebook
- Instagram
- TikTok

Configuration:

- `NEXT_PUBLIC_FACEBOOK_URL`
- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_TIKTOK_URL`

Only valid HTTPS URLs are rendered. Placeholder links are not displayed.

## Future Integrations

Future homepage merchandising can add campaign influence through the existing merchandising context without replacing the homepage component structure.

Future social platforms can be added by extending the central site configuration and `SocialLinks` platform map.
