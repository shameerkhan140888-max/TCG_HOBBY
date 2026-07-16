ALTER TABLE "Product" ADD COLUMN "importId" TEXT;
ALTER TABLE "Product" ADD COLUMN "lifecycleState" TEXT NOT NULL DEFAULT 'DRAFT';

CREATE UNIQUE INDEX "Product_importId_key" ON "Product"("importId");
CREATE INDEX "Product_importId_idx" ON "Product"("importId");
CREATE INDEX "Product_lifecycleState_published_idx" ON "Product"("lifecycleState", "published");

CREATE TABLE "ProductImportAudit" (
  "id" TEXT NOT NULL,
  "productId" TEXT,
  "importId" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceReference" TEXT,
  "lifecycleState" TEXT NOT NULL,
  "changedFields" JSONB NOT NULL,
  "previousValues" JSONB,
  "nextValues" JSONB,
  "warnings" TEXT,
  "performedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductImportAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductImportAudit_productId_createdAt_idx" ON "ProductImportAudit"("productId", "createdAt");
CREATE INDEX "ProductImportAudit_importId_idx" ON "ProductImportAudit"("importId");
CREATE INDEX "ProductImportAudit_createdAt_idx" ON "ProductImportAudit"("createdAt");

ALTER TABLE "ProductImportAudit" ADD CONSTRAINT "ProductImportAudit_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
