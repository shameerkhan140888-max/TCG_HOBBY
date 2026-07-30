ALTER TABLE "StorefrontBanner"
ADD COLUMN "label" TEXT,
ADD COLUMN "icon" TEXT;

CREATE TABLE "HomepageHeroPlacement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "supportingText" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "ctaHref" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HomepageHeroPlacement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopLandingPage" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "supportingText" TEXT NOT NULL,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featuredProductId" TEXT,
    "heroImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopLandingPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageHeroPlacement_productId_key" ON "HomepageHeroPlacement"("productId");
CREATE INDEX "HomepageHeroPlacement_active_startsAt_endsAt_sortOrder_idx" ON "HomepageHeroPlacement"("active", "startsAt", "endsAt", "sortOrder");
CREATE UNIQUE INDEX "ShopLandingPage_scopeKey_key" ON "ShopLandingPage"("scopeKey");
CREATE INDEX "ShopLandingPage_active_scopeKey_idx" ON "ShopLandingPage"("active", "scopeKey");

ALTER TABLE "HomepageHeroPlacement"
ADD CONSTRAINT "HomepageHeroPlacement_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
