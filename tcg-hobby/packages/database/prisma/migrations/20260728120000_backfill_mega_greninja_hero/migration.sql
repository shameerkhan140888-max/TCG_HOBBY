INSERT INTO "HomepageHeroPlacement" (
  "id",
  "productId",
  "headline",
  "supportingText",
  "ctaLabel",
  "ctaHref",
  "imageUrl",
  "imageAlt",
  "active",
  "startsAt",
  "endsAt",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'hero-mega-greninja-ex-premium-collection',
  "id",
  "name",
  "description",
  'Shop now',
  '/catalogue/pokemon-tcg-mega-greninja-ex-premium-collection',
  NULL,
  NULL,
  TRUE,
  NULL,
  NULL,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Product"
WHERE
  "slug" = 'pokemon-tcg-mega-greninja-ex-premium-collection'
  AND "heroFeatured" = TRUE
  AND "published" = TRUE
  AND "archivedAt" IS NULL
ON CONFLICT ("productId") DO NOTHING;
