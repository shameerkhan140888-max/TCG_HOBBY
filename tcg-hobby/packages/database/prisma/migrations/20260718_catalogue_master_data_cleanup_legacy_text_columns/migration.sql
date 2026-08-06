-- Remove only the temporary compatibility columns introduced for fresh
-- databases. Existing environments that have already applied
-- 20260718_product_management_foundation keep their durable columns intact.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "_prisma_migrations"
    WHERE migration_name = '20260718_product_management_foundation'
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  ) THEN
    ALTER TABLE "Product" DROP COLUMN IF EXISTS "brand";
    ALTER TABLE "Product" DROP COLUMN IF EXISTS "productType";
    ALTER TABLE "Product" DROP COLUMN IF EXISTS "language";
  END IF;
END $$;
