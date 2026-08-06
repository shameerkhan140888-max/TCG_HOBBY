-- Iron Sprue dedicated Admin foundation.
-- Additive only: no existing TCG Hobby tables are altered.

CREATE TABLE "IronSprueAdminCategory" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminBrand" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logoUrl" TEXT,
  "logoAltText" TEXT,
  "website" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminBrand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminSupplier" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "website" TEXT,
  "internalNotes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminSupplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminProduct" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "sourceTitle" TEXT NOT NULL,
  "customerTitle" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "supplierProductCode" TEXT,
  "barcode" TEXT,
  "mpn" TEXT,
  "brandId" TEXT,
  "categoryId" TEXT,
  "supplierId" TEXT,
  "shortDescription" TEXT,
  "fullDescription" TEXT,
  "featureBullets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "specifications" JSONB,
  "scale" TEXT,
  "material" TEXT,
  "buildType" TEXT,
  "assemblyMethod" TEXT,
  "glueRequirement" TEXT,
  "difficulty" TEXT,
  "dimensions" TEXT,
  "contents" TEXT,
  "safetyAgeGuidance" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "searchKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "seoTitle" TEXT,
  "metaDescription" TEXT,
  "supplierUnitCostMinor" INTEGER,
  "landedCostMinor" INTEGER,
  "grossPriceMinor" INTEGER,
  "compareAtPriceMinor" INTEGER,
  "vatRate" INTEGER NOT NULL DEFAULT 20,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "publicationState" TEXT NOT NULL DEFAULT 'DRAFT',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "newArrival" BOOLEAN NOT NULL DEFAULT false,
  "comingSoon" BOOLEAN NOT NULL DEFAULT false,
  "specialOffer" BOOLEAN NOT NULL DEFAULT false,
  "hideWhenOutOfStock" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "readyApprovedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminInventory" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "productId" TEXT NOT NULL,
  "expectedQuantity" INTEGER NOT NULL DEFAULT 0,
  "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
  "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
  "missingQuantity" INTEGER NOT NULL DEFAULT 0,
  "availableStock" INTEGER NOT NULL DEFAULT 0,
  "reservedStock" INTEGER NOT NULL DEFAULT 0,
  "reorderPoint" INTEGER NOT NULL DEFAULT 0,
  "locationCode" TEXT NOT NULL DEFAULT 'MAIN',
  "lastReceivedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminInventory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminStockMovement" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "productId" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "beforeQuantity" INTEGER NOT NULL,
  "afterQuantity" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "batchReference" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IronSprueAdminStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminMediaAsset" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "productId" TEXT,
  "role" TEXT NOT NULL,
  "url" TEXT,
  "storageKey" TEXT,
  "altText" TEXT,
  "mimeType" TEXT,
  "byteSize" INTEGER,
  "width" INTEGER,
  "height" INTEGER,
  "approvalState" TEXT NOT NULL DEFAULT 'PENDING',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "uploadedById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminMediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminContentReview" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "productId" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "proposedValue" JSONB NOT NULL,
  "sourceReference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "conflictReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminContentReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminImportBatch" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "sourceName" TEXT NOT NULL,
  "sourceChecksum" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "successfulRows" INTEGER NOT NULL DEFAULT 0,
  "failedRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "zeroQuantityRows" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminHomepagePlacement" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "placementKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "imageUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminHomepagePlacement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminHero" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "headline" TEXT NOT NULL,
  "strapline" TEXT,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "imageUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminHero_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminSpecialOffer" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "productId" TEXT,
  "title" TEXT NOT NULL,
  "badge" TEXT,
  "normalPriceMinor" INTEGER,
  "offerPriceMinor" INTEGER,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminSpecialOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminPermissionGrant" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "grantedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueAdminPermissionGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueAdminAuditLog" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "productId" TEXT,
  "summary" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IronSprueAdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IronSprueAdminCategory_storeCode_slug_key" ON "IronSprueAdminCategory"("storeCode", "slug");
CREATE INDEX "IronSprueAdminCategory_storeCode_active_sortOrder_idx" ON "IronSprueAdminCategory"("storeCode", "active", "sortOrder");
CREATE UNIQUE INDEX "IronSprueAdminBrand_storeCode_slug_key" ON "IronSprueAdminBrand"("storeCode", "slug");
CREATE INDEX "IronSprueAdminBrand_storeCode_active_sortOrder_idx" ON "IronSprueAdminBrand"("storeCode", "active", "sortOrder");
CREATE INDEX "IronSprueAdminBrand_storeCode_featured_idx" ON "IronSprueAdminBrand"("storeCode", "featured");
CREATE UNIQUE INDEX "IronSprueAdminSupplier_storeCode_slug_key" ON "IronSprueAdminSupplier"("storeCode", "slug");
CREATE INDEX "IronSprueAdminSupplier_storeCode_active_idx" ON "IronSprueAdminSupplier"("storeCode", "active");
CREATE UNIQUE INDEX "IronSprueAdminProduct_storeCode_sku_key" ON "IronSprueAdminProduct"("storeCode", "sku");
CREATE UNIQUE INDEX "IronSprueAdminProduct_storeCode_slug_key" ON "IronSprueAdminProduct"("storeCode", "slug");
CREATE UNIQUE INDEX "IronSprueAdminProduct_storeCode_barcode_key" ON "IronSprueAdminProduct"("storeCode", "barcode");
CREATE INDEX "IronSprueAdminProduct_storeCode_publicationState_updatedAt_idx" ON "IronSprueAdminProduct"("storeCode", "publicationState", "updatedAt");
CREATE INDEX "IronSprueAdminProduct_storeCode_brandId_idx" ON "IronSprueAdminProduct"("storeCode", "brandId");
CREATE INDEX "IronSprueAdminProduct_storeCode_categoryId_idx" ON "IronSprueAdminProduct"("storeCode", "categoryId");
CREATE INDEX "IronSprueAdminProduct_storeCode_supplierId_idx" ON "IronSprueAdminProduct"("storeCode", "supplierId");
CREATE INDEX "IronSprueAdminProduct_storeCode_featured_idx" ON "IronSprueAdminProduct"("storeCode", "featured");
CREATE INDEX "IronSprueAdminProduct_storeCode_newArrival_idx" ON "IronSprueAdminProduct"("storeCode", "newArrival");
CREATE INDEX "IronSprueAdminProduct_storeCode_specialOffer_idx" ON "IronSprueAdminProduct"("storeCode", "specialOffer");
CREATE UNIQUE INDEX "IronSprueAdminInventory_productId_key" ON "IronSprueAdminInventory"("productId");
CREATE INDEX "IronSprueAdminInventory_storeCode_availableStock_idx" ON "IronSprueAdminInventory"("storeCode", "availableStock");
CREATE INDEX "IronSprueAdminInventory_storeCode_locationCode_idx" ON "IronSprueAdminInventory"("storeCode", "locationCode");
CREATE INDEX "IronSprueAdminStockMovement_storeCode_productId_createdAt_idx" ON "IronSprueAdminStockMovement"("storeCode", "productId", "createdAt");
CREATE INDEX "IronSprueAdminStockMovement_storeCode_movementType_createdAt_idx" ON "IronSprueAdminStockMovement"("storeCode", "movementType", "createdAt");
CREATE UNIQUE INDEX "IronSprueAdminMediaAsset_storeCode_storageKey_key" ON "IronSprueAdminMediaAsset"("storeCode", "storageKey");
CREATE INDEX "IronSprueAdminMediaAsset_storeCode_productId_role_approvalState_idx" ON "IronSprueAdminMediaAsset"("storeCode", "productId", "role", "approvalState");
CREATE INDEX "IronSprueAdminMediaAsset_storeCode_productId_isPrimary_idx" ON "IronSprueAdminMediaAsset"("storeCode", "productId", "isPrimary");
CREATE INDEX "IronSprueAdminContentReview_storeCode_productId_status_idx" ON "IronSprueAdminContentReview"("storeCode", "productId", "status");
CREATE INDEX "IronSprueAdminContentReview_storeCode_status_createdAt_idx" ON "IronSprueAdminContentReview"("storeCode", "status", "createdAt");
CREATE UNIQUE INDEX "IronSprueAdminImportBatch_storeCode_sourceChecksum_key" ON "IronSprueAdminImportBatch"("storeCode", "sourceChecksum");
CREATE INDEX "IronSprueAdminImportBatch_storeCode_status_createdAt_idx" ON "IronSprueAdminImportBatch"("storeCode", "status", "createdAt");
CREATE UNIQUE INDEX "IronSprueAdminHomepagePlacement_storeCode_placementKey_key" ON "IronSprueAdminHomepagePlacement"("storeCode", "placementKey");
CREATE INDEX "IronSprueAdminHomepagePlacement_storeCode_active_sortOrder_idx" ON "IronSprueAdminHomepagePlacement"("storeCode", "active", "sortOrder");
CREATE INDEX "IronSprueAdminHero_storeCode_active_sortOrder_idx" ON "IronSprueAdminHero"("storeCode", "active", "sortOrder");
CREATE INDEX "IronSprueAdminSpecialOffer_storeCode_active_startsAt_endsAt_sortOrder_idx" ON "IronSprueAdminSpecialOffer"("storeCode", "active", "startsAt", "endsAt", "sortOrder");
CREATE UNIQUE INDEX "IronSprueAdminPermissionGrant_storeCode_userId_key" ON "IronSprueAdminPermissionGrant"("storeCode", "userId");
CREATE INDEX "IronSprueAdminPermissionGrant_storeCode_role_active_idx" ON "IronSprueAdminPermissionGrant"("storeCode", "role", "active");
CREATE INDEX "IronSprueAdminAuditLog_storeCode_action_createdAt_idx" ON "IronSprueAdminAuditLog"("storeCode", "action", "createdAt");
CREATE INDEX "IronSprueAdminAuditLog_storeCode_entityType_entityId_idx" ON "IronSprueAdminAuditLog"("storeCode", "entityType", "entityId");
CREATE INDEX "IronSprueAdminAuditLog_productId_createdAt_idx" ON "IronSprueAdminAuditLog"("productId", "createdAt");

ALTER TABLE "IronSprueAdminProduct" ADD CONSTRAINT "IronSprueAdminProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "IronSprueAdminBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IronSprueAdminProduct" ADD CONSTRAINT "IronSprueAdminProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IronSprueAdminCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IronSprueAdminProduct" ADD CONSTRAINT "IronSprueAdminProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "IronSprueAdminSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IronSprueAdminInventory" ADD CONSTRAINT "IronSprueAdminInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "IronSprueAdminProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IronSprueAdminMediaAsset" ADD CONSTRAINT "IronSprueAdminMediaAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "IronSprueAdminProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IronSprueAdminContentReview" ADD CONSTRAINT "IronSprueAdminContentReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "IronSprueAdminProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IronSprueAdminSpecialOffer" ADD CONSTRAINT "IronSprueAdminSpecialOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "IronSprueAdminProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IronSprueAdminAuditLog" ADD CONSTRAINT "IronSprueAdminAuditLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "IronSprueAdminProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
