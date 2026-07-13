# Production Storefront Homepage

The storefront homepage is the public retail homepage used when `TCG_HOBBY_STOREFRONT_MODE=storefront`.
When `TCG_HOBBY_STOREFRONT_MODE=coming-soon`, `/` continues to render the approved launch landing page. The `/coming-soon` route remains available in both modes.

## Structure

The production homepage renders these sections in order:

1. Storefront header with shop menu, search, account, wishlist rules and basket count.
2. Merchandising hero carousel with up to three structured slides.
3. Shop by game category tiles.
4. New releases from catalogue data.
5. Coming soon and pre-orders from release data.
6. Featured products from catalogue merchandising data.
7. Today's hot products using honest available catalogue signals.
8. Why TCG Hobby trust commitments.
9. Collection and player tool shortcuts.
10. Latest from TCG Hobby, currently sourced from release announcements.
11. Newsletter signup using the shared privacy-safe launch-list flow.
12. Storefront footer with legal links and configured social links only.

## Data Sources

Homepage data is assembled by `apps/storefront/lib/homepage-data.ts`.

- Categories come from `getCatalogueCategories`.
- New releases and product cards come from `getCatalogueProducts`.
- Featured products come from `getFeaturedCatalogueProducts`.
- Release cards and news items come from `getComingSoonHubData`.
- Newsletter signup uses the existing `LaunchEmailCapture` component and launch subscription server action.

Visual components do not query Prisma directly. The homepage uses typed repository/service results and passes those into presentational sections.

## Product Selection

New releases show up to eight catalogue products sorted by newest data, excluding preorder and coming-soon-only rows.

Featured products show up to eight featured catalogue products and avoid repeating products already shown in New releases where practical.

Today's hot products currently uses a deterministic fallback because reliable analytics are not yet connected. The fallback prioritises in-stock featured products, then available stock, release timing and product name. Badges are only shown when backed by available data:

- `Popular` for featured catalogue products.
- `Recently restocked` for products with comparatively strong available stock.
- `New arrival` for released products with a release date.

Future analytics can replace this fallback with most viewed, recently restocked, most wishlisted or demand-based signals without changing the homepage component structure.

## Shop Links

Shop by game tiles link to existing catalogue routes:

- Pokémon: `/catalogue?q=Pokemon`
- Magic: `/catalogue?q=Magic`
- Disney Lorcana: `/catalogue?q=Lorcana`
- Yu-Gi-Oh!: `/catalogue?q=Yu-Gi-Oh`
- One Piece Card Game: `/catalogue?q=One+Piece`
- Accessories: `/catalogue?category=accessories`

Tiles remain visible even when a category has no current catalogue products, so launch merchandising can be stable without showing fake products.

## Social Links

Storefront social links are configured through environment variables and omitted when not configured:

- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_TIKTOK_URL`
- `NEXT_PUBLIC_X_URL`

Only valid HTTPS URLs are rendered. Placeholder links are not displayed.

## Future Integrations

News content currently uses real release announcements. A future blog or CMS source can be connected by replacing `buildNewsItems` while preserving the homepage section contract.

Hot-product ranking should move to analytics-backed signals when product views, restocks and wishlist counts are available in a reliable production dataset.
