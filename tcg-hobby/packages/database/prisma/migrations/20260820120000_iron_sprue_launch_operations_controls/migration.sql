-- Iron Sprue launch operations controls: returns, discounts and order snapshots.

ALTER TABLE "IronSprueOrder"
  ADD COLUMN "discountCode" TEXT,
  ADD COLUMN "discountMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "refundedMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "internalNotes" TEXT;

CREATE TABLE "IronSprueDiscountCode" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "code" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "discountType" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "minimumSpendMinor" INTEGER,
  "oneUsePerCustomer" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueDiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueDiscountRedemption" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "discountCodeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IronSprueDiscountRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueOrderReturn" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "orderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "reference" TEXT,
  "notes" TEXT,
  "condition" TEXT,
  "restock" BOOLEAN NOT NULL DEFAULT false,
  "refundAmountMinor" INTEGER NOT NULL DEFAULT 0,
  "refundStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
  "stripeRefundId" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IronSprueOrderReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueOrderReturnLine" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "restock" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IronSprueOrderReturnLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueWishlistItem" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IronSprueWishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IronSprueDiscountCode_storeCode_code_key" ON "IronSprueDiscountCode"("storeCode", "code");
CREATE INDEX "IronSprueDiscountCode_storeCode_enabled_expiresAt_idx" ON "IronSprueDiscountCode"("storeCode", "enabled", "expiresAt");
CREATE INDEX "IronSprueDiscountRedemption_storeCode_userId_createdAt_idx" ON "IronSprueDiscountRedemption"("storeCode", "userId", "createdAt");
CREATE INDEX "IronSprueDiscountRedemption_storeCode_email_createdAt_idx" ON "IronSprueDiscountRedemption"("storeCode", "email", "createdAt");
CREATE INDEX "IronSprueDiscountRedemption_discountCodeId_createdAt_idx" ON "IronSprueDiscountRedemption"("discountCodeId", "createdAt");
CREATE UNIQUE INDEX "IronSprueDiscountRedemption_discountCodeId_orderId_key" ON "IronSprueDiscountRedemption"("discountCodeId", "orderId");
CREATE INDEX "IronSprueOrderReturn_storeCode_status_createdAt_idx" ON "IronSprueOrderReturn"("storeCode", "status", "createdAt");
CREATE INDEX "IronSprueOrderReturn_orderId_createdAt_idx" ON "IronSprueOrderReturn"("orderId", "createdAt");
CREATE INDEX "IronSprueOrderReturnLine_returnId_idx" ON "IronSprueOrderReturnLine"("returnId");
CREATE INDEX "IronSprueOrderReturnLine_productId_idx" ON "IronSprueOrderReturnLine"("productId");
CREATE UNIQUE INDEX "IronSprueWishlistItem_storeCode_userId_productId_key" ON "IronSprueWishlistItem"("storeCode", "userId", "productId");
CREATE INDEX "IronSprueWishlistItem_storeCode_userId_createdAt_idx" ON "IronSprueWishlistItem"("storeCode", "userId", "createdAt");
CREATE INDEX "IronSprueWishlistItem_storeCode_productId_idx" ON "IronSprueWishlistItem"("storeCode", "productId");

ALTER TABLE "IronSprueDiscountRedemption"
  ADD CONSTRAINT "IronSprueDiscountRedemption_discountCodeId_fkey"
  FOREIGN KEY ("discountCodeId") REFERENCES "IronSprueDiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IronSprueDiscountRedemption"
  ADD CONSTRAINT "IronSprueDiscountRedemption_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "IronSprueOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IronSprueOrderReturn"
  ADD CONSTRAINT "IronSprueOrderReturn_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "IronSprueOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IronSprueOrderReturnLine"
  ADD CONSTRAINT "IronSprueOrderReturnLine_returnId_fkey"
  FOREIGN KEY ("returnId") REFERENCES "IronSprueOrderReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IronSprueOrderReturnLine"
  ADD CONSTRAINT "IronSprueOrderReturnLine_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "IronSprueOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IronSprueOrderReturnLine"
  ADD CONSTRAINT "IronSprueOrderReturnLine_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "IronSprueAdminProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IronSprueWishlistItem"
  ADD CONSTRAINT "IronSprueWishlistItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IronSprueWishlistItem"
  ADD CONSTRAINT "IronSprueWishlistItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "IronSprueAdminProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
