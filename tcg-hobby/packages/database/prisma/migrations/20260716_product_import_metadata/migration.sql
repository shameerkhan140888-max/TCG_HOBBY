ALTER TABLE "Product" ADD COLUMN "vatRate" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Product" ADD COLUMN "homepagePriority" INTEGER;
ALTER TABLE "Product" ADD COLUMN "heroFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "freeUkStandardShipping" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "shippingPromotionProductOnly" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN "importSourceType" TEXT;
ALTER TABLE "Product" ADD COLUMN "importSourceReference" TEXT;
ALTER TABLE "Product" ADD COLUMN "importedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "lastImportedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "importValidationWarnings" TEXT;

CREATE INDEX "Product_published_featured_homepagePriority_idx" ON "Product"("published", "featured", "homepagePriority");
CREATE INDEX "Product_published_heroFeatured_idx" ON "Product"("published", "heroFeatured");
