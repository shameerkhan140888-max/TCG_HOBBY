ALTER TABLE "Product" ADD COLUMN "hideWhenOutOfStock" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Product_published_hideWhenOutOfStock_idx" ON "Product"("published", "hideWhenOutOfStock");
