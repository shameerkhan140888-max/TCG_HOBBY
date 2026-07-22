ALTER TABLE "Product"
  ADD COLUMN "searchTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "productHighlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "specificationSummary" TEXT,
  ADD COLUMN "verifiedContents" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProductImage"
  ADD COLUMN "thumbnailUrl" TEXT,
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "storageProvider" TEXT,
  ADD COLUMN "width" INTEGER,
  ADD COLUMN "height" INTEGER,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "byteSize" INTEGER,
  ADD COLUMN "uploadedById" TEXT,
  ADD COLUMN "deletionState" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "ProductImage_storageKey_key" ON "ProductImage"("storageKey");
CREATE INDEX "ProductImage_productId_deletionState_isPrimary_sortOrder_idx" ON "ProductImage"("productId", "deletionState", "isPrimary", "sortOrder");
CREATE TABLE "ProductFact" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "key" TEXT NOT NULL, "value" TEXT NOT NULL,
  "valueType" TEXT NOT NULL DEFAULT 'TEXT', "verificationState" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "sourceReference" TEXT, "notes" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductFact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductFact_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProductFact_productId_key_key" ON "ProductFact"("productId", "key");
CREATE INDEX "ProductFact_productId_verificationState_sortOrder_idx" ON "ProductFact"("productId", "verificationState", "sortOrder");
CREATE TABLE "ProductContentGeneration" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "requestedById" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "requestedFields" JSONB NOT NULL,
  "generatedContent" JSONB NOT NULL, "warnings" JSONB NOT NULL, "appliedFields" JSONB, "previousValues" JSONB,
  "appliedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductContentGeneration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductContentGeneration_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProductContentGeneration_productId_createdAt_idx" ON "ProductContentGeneration"("productId", "createdAt");
CREATE INDEX "ProductContentGeneration_requestedById_createdAt_idx" ON "ProductContentGeneration"("requestedById", "createdAt");
CREATE TABLE "ProductImageCleanup" (
  "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "imageId" TEXT, "objectKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3), CONSTRAINT "ProductImageCleanup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductImageCleanup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProductImageCleanup_status_createdAt_idx" ON "ProductImageCleanup"("status", "createdAt");
CREATE INDEX "ProductImageCleanup_productId_status_idx" ON "ProductImageCleanup"("productId", "status");
