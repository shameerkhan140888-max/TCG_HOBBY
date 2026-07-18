# Catalogue Master Data

Catalogue master data keeps product classification consistent across Admin, imports and the storefront.

## Admin Routes

Admin catalogue settings live under:

- `/admin/catalogue`
- `/admin/catalogue/games`
- `/admin/catalogue/brands`
- `/admin/catalogue/product-types`
- `/admin/catalogue/languages`
- `/admin/catalogue/sets`
- `/admin/catalogue/categories`

Categories remain managed through the existing category data path. Games, brands, product types, languages and sets can be added, edited, activated and deactivated from Catalogue Settings.

## Seeded Lookup Data

The canonical seed inserts:

- Games: Pokemon TCG, Magic: The Gathering, One Piece Card Game
- Brands: Pokemon TCG, Pokemon, Wizards of the Coast, Bandai, Ultra PRO, Dragon Shield, Gamegenic
- Product types: Booster Pack, Booster Box, Elite Trainer Box, Collection Box, Premium Collection, Tin, Bundle, Deck, Single Card and common accessory formats
- Languages: English, Japanese, Korean, Chinese Simplified, Chinese Traditional, French, German, Italian and Spanish
- Sets: Black Bolt and White Flare for Pokemon TCG

Run `npm run db:seed` after migrations in new environments. The seed is idempotent and uses upserts.

## Product Onboarding

Admin product create/edit uses controlled selectors for:

- Game
- Brand
- Product type
- Language
- Set

Game, product type and language are required for admin-created products. Brand and set are optional. The set selector is filtered by the selected game, and server-side validation rejects incompatible game/set combinations.

The legacy text columns on `Product` are retained as transitional display mirrors. New code should prefer the controlled relation IDs.

## CSV Import

CSV import resolves lookup values against Catalogue Settings. It does not auto-create master data.

Preview fails when:

- a required game, product type or language is unknown
- a supplied brand or set is unknown
- a lookup value is inactive
- a supplied set belongs to a different game

This protects imports from accidental duplicate spellings such as `Pokemon`, `Pokemon TCG` and `Pokémon TCG` being treated as separate commercial classifications.

## Storefront Filters

The storefront catalogue supports controlled filters for:

- Game
- Product type
- Set
- Language

Existing search, category, sort and pagination behaviour is preserved. Filters are applied in the database repository before pagination so result counts and pages remain accurate.

## Admin Product List Filters

Admin product list filters are ordered:

1. Search
2. Game
3. Product type
4. Brand
5. Category
6. Supplier
7. Status
8. Sort

Filtering is server-side and can be combined.

## Operational Rules

- Deactivate values that should no longer be used for new products.
- Do not delete lookup rows that may be referenced by existing products.
- Add sets before importing products that reference those sets.
- Keep names customer-readable and slugs stable after launch.
- Avoid changing IDs manually; imports and products reference those records.
