-- Iron Sprue operational order controls: manual order metadata and customer service requests.

ALTER TABLE "IronSprueOrder"
  ADD COLUMN "sourceChannel" TEXT NOT NULL DEFAULT 'ONLINE',
  ADD COLUMN "paymentMethodLabel" TEXT,
  ADD COLUMN "externalReference" TEXT,
  ADD COLUMN "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "IronSprueOrder"
SET "placedAt" = "createdAt"
WHERE "placedAt" IS NULL;

CREATE INDEX "IronSprueOrder_storeCode_sourceChannel_placedAt_idx"
  ON "IronSprueOrder"("storeCode", "sourceChannel", "placedAt");

CREATE TABLE "IronSprueOrderCustomerRequest" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "orderId" TEXT NOT NULL,
  "userId" TEXT,
  "requestType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reason" TEXT NOT NULL,
  "customerMessage" TEXT,
  "adminNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "IronSprueOrderCustomerRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IronSprueOrderCustomerRequest_storeCode_status_createdAt_idx"
  ON "IronSprueOrderCustomerRequest"("storeCode", "status", "createdAt");
CREATE INDEX "IronSprueOrderCustomerRequest_orderId_createdAt_idx"
  ON "IronSprueOrderCustomerRequest"("orderId", "createdAt");
CREATE INDEX "IronSprueOrderCustomerRequest_userId_createdAt_idx"
  ON "IronSprueOrderCustomerRequest"("userId", "createdAt");

ALTER TABLE "IronSprueOrderCustomerRequest"
  ADD CONSTRAINT "IronSprueOrderCustomerRequest_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "IronSprueOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IronSprueOrderCustomerRequest"
  ADD CONSTRAINT "IronSprueOrderCustomerRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
