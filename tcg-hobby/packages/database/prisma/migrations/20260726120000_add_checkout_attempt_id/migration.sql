ALTER TABLE "Order"
ADD COLUMN "checkoutAttemptId" TEXT;

CREATE UNIQUE INDEX "Order_checkoutAttemptId_key"
ON "Order"("checkoutAttemptId");

CREATE TABLE "StorefrontBanner" (
  "id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorefrontBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorefrontBanner_active_startsAt_endsAt_sortOrder_idx"
ON "StorefrontBanner"("active", "startsAt", "endsAt", "sortOrder");
