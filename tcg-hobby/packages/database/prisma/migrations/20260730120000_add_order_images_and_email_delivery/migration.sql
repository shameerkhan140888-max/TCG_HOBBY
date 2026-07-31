-- Preserve the ordinary product image shown at checkout on immutable order lines.
ALTER TABLE "OrderItem"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imageAlt" TEXT,
ADD COLUMN "imageStorageKey" TEXT;

CREATE INDEX "OrderItem_imageStorageKey_idx" ON "OrderItem"("imageStorageKey");

-- Record order-email attempts independently from payment finalisation.
CREATE TABLE "TransactionalEmailDelivery" (
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

    CONSTRAINT "TransactionalEmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransactionalEmailDelivery_orderId_purpose_key"
ON "TransactionalEmailDelivery"("orderId", "purpose");

CREATE INDEX "TransactionalEmailDelivery_status_updatedAt_idx"
ON "TransactionalEmailDelivery"("status", "updatedAt");

ALTER TABLE "TransactionalEmailDelivery"
ADD CONSTRAINT "TransactionalEmailDelivery_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
