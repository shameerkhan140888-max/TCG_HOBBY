ALTER TABLE "IronSprueAdminHero"
  ADD COLUMN "merchandisingBadge" TEXT NOT NULL DEFAULT 'NONE';

ALTER TABLE "IronSprueAdminHero"
  ADD CONSTRAINT "IronSprueAdminHero_merchandisingBadge_check"
  CHECK ("merchandisingBadge" IN ('NONE', 'IN_STOCK', 'NEW', 'SALE', 'COMING_SOON', 'PRE_ORDER', 'FEATURED', 'EXCLUSIVE'));

CREATE TABLE "IronSprueAdminTypographySetting" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "headingFamily" TEXT NOT NULL DEFAULT 'IMPACT_CONDENSED',
  "bodyFamily" TEXT NOT NULL DEFAULT 'SYSTEM_SANS',
  "headingWeight" TEXT NOT NULL DEFAULT 'BLACK',
  "bodyWeight" TEXT NOT NULL DEFAULT 'REGULAR',
  "headingScale" TEXT NOT NULL DEFAULT 'STANDARD',
  "bodyScale" TEXT NOT NULL DEFAULT 'STANDARD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminTypographySetting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IronSprueAdminTypographySetting_headingFamily_check"
    CHECK ("headingFamily" IN ('IMPACT_CONDENSED', 'SYSTEM_SANS', 'SERIF_DISPLAY')),
  CONSTRAINT "IronSprueAdminTypographySetting_bodyFamily_check"
    CHECK ("bodyFamily" IN ('SYSTEM_SANS', 'HUMANIST_SANS', 'SERIF')),
  CONSTRAINT "IronSprueAdminTypographySetting_headingWeight_check"
    CHECK ("headingWeight" IN ('BOLD', 'BLACK')),
  CONSTRAINT "IronSprueAdminTypographySetting_bodyWeight_check"
    CHECK ("bodyWeight" IN ('REGULAR', 'MEDIUM')),
  CONSTRAINT "IronSprueAdminTypographySetting_headingScale_check"
    CHECK ("headingScale" IN ('COMPACT', 'STANDARD', 'LARGE')),
  CONSTRAINT "IronSprueAdminTypographySetting_bodyScale_check"
    CHECK ("bodyScale" IN ('COMPACT', 'STANDARD', 'COMFORTABLE'))
);

CREATE UNIQUE INDEX "IronSprueAdminTypographySetting_storeCode_key"
  ON "IronSprueAdminTypographySetting"("storeCode");
