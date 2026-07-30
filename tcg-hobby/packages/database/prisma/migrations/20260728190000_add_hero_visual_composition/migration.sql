ALTER TABLE "HomepageHeroPlacement"
ADD COLUMN "displayMode" TEXT NOT NULL DEFAULT 'FULL_BLEED',
ADD COLUMN "focalPoint" TEXT NOT NULL DEFAULT 'CENTER',
ADD COLUMN "overlayStrength" TEXT NOT NULL DEFAULT 'BALANCED';

UPDATE "HomepageHeroPlacement"
SET
  "displayMode" = 'FULL_BLEED',
  "focalPoint" = 'RIGHT',
  "overlayStrength" = 'BALANCED'
WHERE "productId" = 'prod-mega-greninja-ex-premium-collection';
