ALTER TABLE "HomepageHeroPlacement"
ADD COLUMN "imageSource" TEXT NOT NULL DEFAULT 'PRODUCT',
ADD COLUMN "selectedProductImageId" TEXT,
ADD COLUMN "imageStorageKey" TEXT,
ADD COLUMN "imageThumbnailUrl" TEXT,
ADD COLUMN "imageWidth" INTEGER,
ADD COLUMN "imageHeight" INTEGER,
ADD COLUMN "imageMimeType" TEXT,
ADD COLUMN "imageByteSize" INTEGER,
ADD COLUMN "imageUploadedAt" TIMESTAMP(3),
ADD COLUMN "imageUploadedById" TEXT,
ADD COLUMN "imageDeletionState" TEXT NOT NULL DEFAULT 'ACTIVE';

UPDATE "HomepageHeroPlacement"
SET "imageSource" = 'CUSTOM'
WHERE "imageUrl" IS NOT NULL;

CREATE UNIQUE INDEX "HomepageHeroPlacement_imageStorageKey_key"
ON "HomepageHeroPlacement"("imageStorageKey");

CREATE INDEX "HomepageHeroPlacement_selectedProductImageId_idx"
ON "HomepageHeroPlacement"("selectedProductImageId");

CREATE INDEX "HomepageHeroPlacement_imageDeletionState_idx"
ON "HomepageHeroPlacement"("imageDeletionState");

ALTER TABLE "HomepageHeroPlacement"
ADD CONSTRAINT "HomepageHeroPlacement_selectedProductImageId_fkey"
FOREIGN KEY ("selectedProductImageId") REFERENCES "ProductImage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
