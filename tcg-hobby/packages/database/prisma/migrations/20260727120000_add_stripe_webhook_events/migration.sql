CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "stripeObjectId" TEXT,
    "orderId" TEXT,
    "processingState" TEXT NOT NULL DEFAULT 'RECEIVED',
    "outcome" TEXT,
    "errorCode" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");
CREATE INDEX "StripeWebhookEvent_orderId_createdAt_idx" ON "StripeWebhookEvent"("orderId", "createdAt");
CREATE INDEX "StripeWebhookEvent_processingState_createdAt_idx" ON "StripeWebhookEvent"("processingState", "createdAt");

ALTER TABLE "StripeWebhookEvent"
ADD CONSTRAINT "StripeWebhookEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
