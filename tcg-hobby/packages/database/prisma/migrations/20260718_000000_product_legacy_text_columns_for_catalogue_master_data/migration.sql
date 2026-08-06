-- Compatibility bridge for the historical migration order.
--
-- 20260718_catalogue_master_data backfills relational master-data ids from
-- Product.brand, Product.productType and Product.language, but the original
-- migration chain added those legacy text columns in the following migration.
-- These temporary columns make a fresh database executable without changing the
-- final schema; the companion cleanup migration removes them before the real
-- product-management migration adds the durable columns.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productType" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "language" TEXT;
