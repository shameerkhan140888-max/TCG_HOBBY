-- Production product-management foundation fields.
ALTER TABLE "Product" ADD COLUMN "barcode" TEXT;
ALTER TABLE "Product" ADD COLUMN "brand" TEXT;
ALTER TABLE "Product" ADD COLUMN "productType" TEXT;
ALTER TABLE "Product" ADD COLUMN "language" TEXT;
ALTER TABLE "Product" ADD COLUMN "rrpMinor" INTEGER;
ALTER TABLE "Product" ADD COLUMN "salePriceMinor" INTEGER;
ALTER TABLE "Product" ADD COLUMN "saleStartsAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "saleEndsAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Product" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN "canonicalUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "ogImageUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "noindex" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "InventoryItem" ADD COLUMN "reorderQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN "incomingQuantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "SupplierProduct" ADD COLUMN "supplierProductUrl" TEXT;
ALTER TABLE "SupplierProduct" ADD COLUMN "minimumOrderQuantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SupplierProduct" ADD COLUMN "packQuantity" INTEGER;
ALTER TABLE "SupplierProduct" ADD COLUMN "lastPriceUpdatedAt" TIMESTAMP(3);
ALTER TABLE "SupplierProduct" ADD COLUMN "preferred" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX "Product_brand_idx" ON "Product"("brand");
CREATE INDEX "Product_productType_idx" ON "Product"("productType");
CREATE INDEX "InventoryItem_incomingQuantity_idx" ON "InventoryItem"("incomingQuantity");
CREATE INDEX "SupplierProduct_productId_preferred_idx" ON "SupplierProduct"("productId", "preferred");
CREATE INDEX "SupplierProduct_supplierId_active_idx" ON "SupplierProduct"("supplierId", "active");
