-- Product merchandising engine foundation.
-- Additive and non-destructive: existing product, inventory, order and wishlist data is preserved.

CREATE TYPE "ProductRecommendationType" AS ENUM ('RELATED', 'ACCESSORY', 'UPSELL', 'CROSS_SELL', 'MANUAL');

ALTER TABLE "Product"
  ADD COLUMN "recommendationWeight" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isAccessory" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isStaffPick" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isNewArrival" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ProductRecommendation" (
  "id" TEXT NOT NULL,
  "sourceProductId" TEXT NOT NULL,
  "recommendedProductId" TEXT NOT NULL,
  "relationshipType" "ProductRecommendationType" NOT NULL DEFAULT 'RELATED',
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductRecommendation_sourceProductId_recommendedProductId_relationshipType_key"
  ON "ProductRecommendation"("sourceProductId", "recommendedProductId", "relationshipType");

CREATE INDEX "ProductRecommendation_sourceProductId_active_priority_idx"
  ON "ProductRecommendation"("sourceProductId", "active", "priority");

CREATE INDEX "ProductRecommendation_recommendedProductId_idx"
  ON "ProductRecommendation"("recommendedProductId");

CREATE INDEX "ProductRecommendation_relationshipType_active_idx"
  ON "ProductRecommendation"("relationshipType", "active");

CREATE INDEX "Product_published_recommendationWeight_idx"
  ON "Product"("published", "recommendationWeight");

CREATE INDEX "Product_published_isAccessory_idx"
  ON "Product"("published", "isAccessory");

CREATE INDEX "Product_published_isStaffPick_idx"
  ON "Product"("published", "isStaffPick");

CREATE INDEX "Product_published_isBestSeller_idx"
  ON "Product"("published", "isBestSeller");

CREATE INDEX "Product_published_isNewArrival_idx"
  ON "Product"("published", "isNewArrival");

ALTER TABLE "ProductRecommendation"
  ADD CONSTRAINT "ProductRecommendation_sourceProductId_fkey"
  FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductRecommendation"
  ADD CONSTRAINT "ProductRecommendation_recommendedProductId_fkey"
  FOREIGN KEY ("recommendedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
