-- Remove only the temporary compatibility columns introduced for fresh
-- databases. The durable product-management migration that follows this one
-- re-adds the final text columns in 20260718_product_management_foundation.
ALTER TABLE "Product" DROP COLUMN IF EXISTS "brand";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "productType";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "language";
