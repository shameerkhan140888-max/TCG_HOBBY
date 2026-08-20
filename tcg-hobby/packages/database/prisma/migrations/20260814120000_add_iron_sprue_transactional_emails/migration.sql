ALTER TABLE "IronSprueOrder"
  ADD COLUMN "dispatchedAt" TIMESTAMP(3),
  ADD COLUMN "trackingCarrier" TEXT,
  ADD COLUMN "trackingNumber" TEXT,
  ADD COLUMN "trackingUrl" TEXT;

CREATE TABLE "IronSprueTransactionalEmailDelivery" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "providerMessageId" TEXT,
  "lastErrorCode" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IronSprueTransactionalEmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IronSprueTransactionalEmailDelivery_orderId_purpose_key"
  ON "IronSprueTransactionalEmailDelivery"("orderId", "purpose");

CREATE INDEX "IronSprueTransactionalEmailDelivery_status_updatedAt_idx"
  ON "IronSprueTransactionalEmailDelivery"("status", "updatedAt");

ALTER TABLE "IronSprueTransactionalEmailDelivery"
  ADD CONSTRAINT "IronSprueTransactionalEmailDelivery_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "IronSprueOrder"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
