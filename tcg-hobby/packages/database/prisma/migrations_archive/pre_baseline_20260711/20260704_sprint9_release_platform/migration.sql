DO $$
BEGIN
  CREATE TYPE "ProductReleaseStatus" AS ENUM ('RELEASED', 'PREORDER', 'COMING_SOON', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NotificationPreference" AS ENUM ('ALL', 'PREORDER', 'RELEASE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "releaseStatus" "ProductReleaseStatus" NOT NULL DEFAULT 'RELEASED',
  ADD COLUMN IF NOT EXISTS "releaseDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "expectedDispatchAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "expectedArrivalAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "allocationLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "customerPurchaseLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "supplierAllocation" INTEGER,
  ADD COLUMN IF NOT EXISTS "lowAllocationThreshold" INTEGER,
  ADD COLUMN IF NOT EXISTS "availabilityMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "preorderBadgeLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "comingSoonBadgeLabel" TEXT;

CREATE INDEX IF NOT EXISTS "Product_releaseStatus_releaseDate_idx" ON "Product"("releaseStatus", "releaseDate");
CREATE INDEX IF NOT EXISTS "Product_published_releaseStatus_idx" ON "Product"("published", "releaseStatus");

CREATE TABLE IF NOT EXISTS "Release" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "game" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "releaseDate" TIMESTAMP(3) NOT NULL,
  "expectedDispatchAt" TIMESTAMP(3),
  "expectedArrivalAt" TIMESTAMP(3),
  "announcementText" TEXT,
  "releaseNotes" TEXT,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Release_slug_key" ON "Release"("slug");
CREATE INDEX IF NOT EXISTS "Release_releaseDate_visible_idx" ON "Release"("releaseDate", "visible");
CREATE INDEX IF NOT EXISTS "Release_featuredOnHomepage_visible_idx" ON "Release"("featuredOnHomepage", "visible");
CREATE INDEX IF NOT EXISTS "Release_categoryId_releaseDate_idx" ON "Release"("categoryId", "releaseDate");
CREATE INDEX IF NOT EXISTS "Release_brand_releaseDate_idx" ON "Release"("brand", "releaseDate");

CREATE TABLE IF NOT EXISTS "ReleaseProduct" (
  "id" TEXT NOT NULL,
  "releaseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "status" "ProductReleaseStatus" NOT NULL DEFAULT 'COMING_SOON',
  "releaseDate" TIMESTAMP(3),
  "expectedDispatchAt" TIMESTAMP(3),
  "expectedArrivalAt" TIMESTAMP(3),
  "allocationLimit" INTEGER,
  "customerPurchaseLimit" INTEGER,
  "supplierAllocation" INTEGER,
  "allocatedQuantity" INTEGER NOT NULL DEFAULT 0,
  "lowAllocationThreshold" INTEGER,
  "availabilityMessage" TEXT,
  "preorderBadgeLabel" TEXT,
  "comingSoonBadgeLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReleaseProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReleaseProduct_releaseId_productId_key" ON "ReleaseProduct"("releaseId", "productId");
CREATE INDEX IF NOT EXISTS "ReleaseProduct_productId_status_idx" ON "ReleaseProduct"("productId", "status");
CREATE INDEX IF NOT EXISTS "ReleaseProduct_releaseId_status_idx" ON "ReleaseProduct"("releaseId", "status");
CREATE INDEX IF NOT EXISTS "ReleaseProduct_releaseDate_status_idx" ON "ReleaseProduct"("releaseDate", "status");
CREATE INDEX IF NOT EXISTS "ReleaseProduct_releaseId_productId_idx" ON "ReleaseProduct"("releaseId", "productId");

CREATE TABLE IF NOT EXISTS "NotificationSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "preference" "NotificationPreference" NOT NULL DEFAULT 'ALL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSubscription_userId_productId_key" ON "NotificationSubscription"("userId", "productId");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_productId_createdAt_idx" ON "NotificationSubscription"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_userId_preference_idx" ON "NotificationSubscription"("userId", "preference");

ALTER TABLE "Release"
  ADD CONSTRAINT "Release_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReleaseProduct"
  ADD CONSTRAINT "ReleaseProduct_releaseId_fkey"
  FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ReleaseProduct_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationSubscription"
  ADD CONSTRAINT "NotificationSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "NotificationSubscription_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
