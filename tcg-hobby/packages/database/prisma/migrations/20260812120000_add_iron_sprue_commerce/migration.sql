CREATE TABLE "IronSprueCart" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "userId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueCart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueCartItem" (
  "id" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueCartItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueOrder" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "orderNumber" TEXT NOT NULL,
  "userId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'REQUIRES_PAYMENT',
  "paymentStatus" TEXT NOT NULL DEFAULT 'REQUIRES_PAYMENT',
  "fulfilmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "paymentProvider" TEXT,
  "paymentIntentId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "stripeCheckoutUrl" TEXT,
  "checkoutAttemptId" TEXT NOT NULL,
  "subtotalMinor" INTEGER NOT NULL,
  "shippingMinor" INTEGER NOT NULL,
  "taxMinor" INTEGER NOT NULL DEFAULT 0,
  "totalMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "shippingMethodCode" TEXT NOT NULL,
  "shippingMethodName" TEXT NOT NULL,
  "shippingMethodAmountMinor" INTEGER NOT NULL,
  "shippingFullName" TEXT NOT NULL,
  "shippingEmail" TEXT NOT NULL,
  "shippingLine1" TEXT NOT NULL,
  "shippingLine2" TEXT,
  "shippingCity" TEXT NOT NULL,
  "shippingRegion" TEXT,
  "shippingPostalCode" TEXT NOT NULL,
  "shippingCountry" TEXT NOT NULL,
  "reservationExpiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "fulfilledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "productSlug" TEXT NOT NULL,
  "productSku" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceMinor" INTEGER NOT NULL,
  "totalMinor" INTEGER NOT NULL,
  "imageUrl" TEXT,
  "imageAlt" TEXT,
  "imageStorageKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IronSprueOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueStripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "stripeEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "stripeObjectId" TEXT,
  "processingState" TEXT NOT NULL DEFAULT 'RECEIVED',
  "outcome" TEXT,
  "orderId" TEXT,
  "errorCode" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueStripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IronSprueCart_userId_key" ON "IronSprueCart"("userId");
CREATE INDEX "IronSprueCart_storeCode_updatedAt_idx" ON "IronSprueCart"("storeCode", "updatedAt");
CREATE UNIQUE INDEX "IronSprueCartItem_cartId_productId_key" ON "IronSprueCartItem"("cartId", "productId");
CREATE INDEX "IronSprueCartItem_productId_idx" ON "IronSprueCartItem"("productId");
CREATE UNIQUE INDEX "IronSprueOrder_orderNumber_key" ON "IronSprueOrder"("orderNumber");
CREATE UNIQUE INDEX "IronSprueOrder_paymentIntentId_key" ON "IronSprueOrder"("paymentIntentId");
CREATE UNIQUE INDEX "IronSprueOrder_stripeCheckoutSessionId_key" ON "IronSprueOrder"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "IronSprueOrder_checkoutAttemptId_key" ON "IronSprueOrder"("checkoutAttemptId");
CREATE INDEX "IronSprueOrder_storeCode_paymentStatus_createdAt_idx" ON "IronSprueOrder"("storeCode", "paymentStatus", "createdAt");
CREATE INDEX "IronSprueOrder_storeCode_userId_createdAt_idx" ON "IronSprueOrder"("storeCode", "userId", "createdAt");
CREATE INDEX "IronSprueOrderItem_orderId_idx" ON "IronSprueOrderItem"("orderId");
CREATE INDEX "IronSprueOrderItem_productId_idx" ON "IronSprueOrderItem"("productId");
CREATE UNIQUE INDEX "IronSprueStripeWebhookEvent_stripeEventId_key" ON "IronSprueStripeWebhookEvent"("stripeEventId");
CREATE INDEX "IronSprueStripeWebhookEvent_storeCode_processingState_createdAt_idx" ON "IronSprueStripeWebhookEvent"("storeCode", "processingState", "createdAt");
CREATE INDEX "IronSprueStripeWebhookEvent_orderId_idx" ON "IronSprueStripeWebhookEvent"("orderId");

ALTER TABLE "IronSprueCartItem" ADD CONSTRAINT "IronSprueCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "IronSprueCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IronSprueCartItem" ADD CONSTRAINT "IronSprueCartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "IronSprueAdminProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IronSprueOrderItem" ADD CONSTRAINT "IronSprueOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "IronSprueOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IronSprueOrderItem" ADD CONSTRAINT "IronSprueOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "IronSprueAdminProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IronSprueStripeWebhookEvent" ADD CONSTRAINT "IronSprueStripeWebhookEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "IronSprueOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
