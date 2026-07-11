-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('MINT', 'NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED', 'SEALED');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'ABANDONED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'FULFILLING', 'SHIPPED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('REQUIRES_PAYMENT', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfilmentStatus" AS ENUM ('PENDING', 'PICKING', 'PACKED', 'SHIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('MANUAL', 'COST_PLUS_PERCENT', 'FIXED_MARGIN', 'SUPPLIER_COST', 'PROMOTIONAL', 'FUTURE_MARKET_FEED');

-- CreateEnum
CREATE TYPE "PricingRuleScope" AS ENUM ('GLOBAL', 'PRODUCT', 'CATEGORY', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "PriceStatus" AS ENUM ('ACTIVE', 'MANUAL_OVERRIDE', 'DISABLED', 'FUTURE');

-- CreateEnum
CREATE TYPE "BuylistStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "ProductReleaseStatus" AS ENUM ('RELEASED', 'PREORDER', 'COMING_SOON', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationPreference" AS ENUM ('ALL', 'PREORDER', 'RELEASE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PRICE_MOVEMENT', 'UPCOMING_RELEASE', 'WISHLIST_AVAILABILITY', 'COLLECTION_UPDATES', 'BUYLIST_UPDATES');

-- CreateEnum
CREATE TYPE "MarketingSubscriberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "WatchlistSubjectType" AS ENUM ('PRODUCT', 'RELEASE', 'COLLECTION_ITEM');

-- CreateEnum
CREATE TYPE "MarketTrend" AS ENUM ('UP', 'DOWN', 'FLAT', 'VOLATILE');

-- CreateEnum
CREATE TYPE "CollectionPrintVariant" AS ENUM ('REGULAR', 'REVERSE_HOLO', 'HOLO', 'PROMO', 'FIRST_EDITION', 'FOIL');

-- CreateEnum
CREATE TYPE "DeckVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageLabel" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'GB',
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "internalNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "setName" TEXT,
    "description" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "condition" "ProductCondition" NOT NULL DEFAULT 'SEALED',
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "searchText" TEXT NOT NULL,
    "imageLabel" TEXT NOT NULL,
    "releaseStatus" "ProductReleaseStatus" NOT NULL DEFAULT 'RELEASED',
    "releaseDate" TIMESTAMP(3),
    "expectedDispatchAt" TIMESTAMP(3),
    "expectedArrivalAt" TIMESTAMP(3),
    "allocationLimit" INTEGER,
    "customerPurchaseLimit" INTEGER,
    "supplierAllocation" INTEGER,
    "lowAllocationThreshold" INTEGER,
    "availabilityMessage" TEXT,
    "preorderBadgeLabel" TEXT,
    "comingSoonBadgeLabel" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "imageType" TEXT NOT NULL DEFAULT 'gallery',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "expectedDispatchAt" TIMESTAMP(3),
    "expectedArrivalAt" TIMESTAMP(3),
    "announcementText" TEXT,
    "releaseNotes" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseProduct" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "ProductReleaseStatus" NOT NULL DEFAULT 'COMING_SOON',
    "releaseDate" TIMESTAMP(3),
    "expectedDispatchAt" TIMESTAMP(3),
    "expectedArrivalAt" TIMESTAMP(3),
    "allocationLimit" INTEGER,
    "customerPurchaseLimit" INTEGER,
    "supplierAllocation" INTEGER,
    "allocatedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowAllocationThreshold" INTEGER,
    "availabilityMessage" TEXT,
    "preorderBadgeLabel" TEXT,
    "comingSoonBadgeLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "preference" "NotificationPreference" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationCenterPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "subjectType" "WatchlistSubjectType",
    "subjectLabel" TEXT,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationCenterPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentAt" TIMESTAMP(3),
    "consentSource" TEXT,
    "privacyPolicyVersion" TEXT,
    "consentIpHash" TEXT,
    "source" TEXT NOT NULL DEFAULT 'storefront',
    "lastUpdatedSource" TEXT,
    "status" "MarketingSubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
    "customerId" TEXT,
    "unsubscribeToken" TEXT NOT NULL,
    "lastSignupAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmationEmailSentAt" TIMESTAMP(3),
    "confirmationEmailLastAttemptAt" TIMESTAMP(3),
    "confirmationEmailError" TEXT,
    "lastEmailSentAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "suppressedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSubscriberTag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSubscriberTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingSubscriberTagAssignment" (
    "subscriberId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingSubscriberTagAssignment_pkey" PRIMARY KEY ("subscriberId","tagId")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "audienceDefinition" JSONB NOT NULL,
    "createdById" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentEstimateMinor" INTEGER NOT NULL,
    "yesterdayMinor" INTEGER NOT NULL,
    "sevenDayMinor" INTEGER NOT NULL,
    "thirtyDayMinor" INTEGER NOT NULL,
    "trend" "MarketTrend" NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPriceHistory" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "valueMinor" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectType" "WatchlistSubjectType" NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "productId" TEXT,
    "releaseId" TEXT,
    "collectionItemId" TEXT,
    "marketSnapshotId" TEXT,
    "notificationType" "NotificationType" NOT NULL DEFAULT 'PRICE_MOVEMENT',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "locationCode" TEXT NOT NULL DEFAULT 'MAIN',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'REQUIRES_PAYMENT',
    "fulfilmentStatus" "FulfilmentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentProvider" TEXT,
    "paymentIntentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripeCheckoutUrl" TEXT,
    "subtotalMinor" INTEGER NOT NULL,
    "shippingMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "shippingMethodCode" TEXT NOT NULL,
    "shippingMethodName" TEXT NOT NULL,
    "shippingMethodAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "shippingFullName" TEXT NOT NULL,
    "shippingEmail" TEXT NOT NULL,
    "shippingLine1" TEXT NOT NULL,
    "shippingLine2" TEXT,
    "shippingCity" TEXT NOT NULL,
    "shippingRegion" TEXT,
    "shippingPostalCode" TEXT NOT NULL,
    "shippingCountry" TEXT NOT NULL,
    "shippingAddressId" TEXT,
    "reservationExpiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "beforeStock" INTEGER NOT NULL,
    "afterStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierSku" TEXT NOT NULL,
    "costMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" "PricingRuleType" NOT NULL,
    "ruleScope" "PricingRuleScope" NOT NULL DEFAULT 'GLOBAL',
    "productId" TEXT,
    "categoryId" TEXT,
    "supplierId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPricing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pricingRuleId" TEXT,
    "costMinor" INTEGER NOT NULL,
    "retailMinor" INTEGER NOT NULL,
    "buyMinor" INTEGER NOT NULL,
    "marginMinor" INTEGER NOT NULL,
    "markupPercent" INTEGER NOT NULL,
    "profitMinor" INTEGER NOT NULL,
    "minimumMarginPercent" INTEGER NOT NULL DEFAULT 0,
    "maximumDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "priceSource" TEXT NOT NULL,
    "priceStatus" "PriceStatus" NOT NULL DEFAULT 'ACTIVE',
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buylist" (
    "id" TEXT NOT NULL,
    "buylistNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BuylistStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "estimatedPayoutMinor" INTEGER NOT NULL DEFAULT 0,
    "offeredPayoutMinor" INTEGER NOT NULL DEFAULT 0,
    "customerNotes" TEXT,
    "staffNotes" TEXT,
    "paymentReference" TEXT,
    "submittedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Buylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuylistItem" (
    "id" TEXT NOT NULL,
    "buylistId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimatedBuyMinor" INTEGER NOT NULL,
    "offeredBuyMinor" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuylistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionInsightSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "estimatedValueMinor" INTEGER NOT NULL,
    "previousValueMinor" INTEGER NOT NULL,
    "sevenDayValueMinor" INTEGER NOT NULL,
    "thirtyDayValueMinor" INTEGER NOT NULL,
    "collectionHealthScore" INTEGER NOT NULL,
    "cardsOwned" INTEGER NOT NULL,
    "setsOwned" INTEGER NOT NULL,
    "favouriteGame" TEXT NOT NULL,
    "wishlistOverlapCount" INTEGER NOT NULL,
    "deckCompletionPercent" INTEGER NOT NULL,
    "recentGrowthMinor" INTEGER NOT NULL,
    "heatMap" JSONB NOT NULL,
    "recentActivity" JSONB NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionInsightSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ownedQuantity" INTEGER NOT NULL DEFAULT 1,
    "printVariant" "CollectionPrintVariant" NOT NULL DEFAULT 'REGULAR',
    "condition" "ProductCondition" NOT NULL DEFAULT 'NEAR_MINT',
    "foil" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'EN',
    "notes" TEXT,
    "dateAcquired" TIMESTAMP(3),
    "purchasePriceMinor" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "ruleProfile" TEXT NOT NULL DEFAULT 'CUSTOM',
    "visibility" "DeckVisibility" NOT NULL DEFAULT 'PRIVATE',
    "notes" TEXT,
    "imageLabel" TEXT NOT NULL,
    "maxCards" INTEGER NOT NULL DEFAULT 60,
    "maxCopiesPerCard" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckCard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeckCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Address_userId_country_idx" ON "Address"("userId", "country");

-- CreateIndex
CREATE INDEX "Address_postalCode_city_idx" ON "Address"("postalCode", "city");

-- CreateIndex
CREATE INDEX "Account_userId_provider_idx" ON "Account"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_expires_idx" ON "Session"("userId", "expires");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_slug_key" ON "Supplier"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_slug_published_idx" ON "Product"("slug", "published");

-- CreateIndex
CREATE INDEX "Product_categoryId_published_idx" ON "Product"("categoryId", "published");

-- CreateIndex
CREATE INDEX "Product_archivedAt_published_idx" ON "Product"("archivedAt", "published");

-- CreateIndex
CREATE INDEX "Product_published_featured_idx" ON "Product"("published", "featured");

-- CreateIndex
CREATE INDEX "Product_releaseStatus_releaseDate_idx" ON "Product"("releaseStatus", "releaseDate");

-- CreateIndex
CREATE INDEX "Product_published_releaseStatus_idx" ON "Product"("published", "releaseStatus");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_searchText_idx" ON "Product"("searchText");

-- CreateIndex
CREATE INDEX "ProductImage_productId_isPrimary_idx" ON "ProductImage"("productId", "isPrimary");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Release_slug_key" ON "Release"("slug");

-- CreateIndex
CREATE INDEX "Release_releaseDate_visible_idx" ON "Release"("releaseDate", "visible");

-- CreateIndex
CREATE INDEX "Release_featuredOnHomepage_visible_idx" ON "Release"("featuredOnHomepage", "visible");

-- CreateIndex
CREATE INDEX "Release_categoryId_releaseDate_idx" ON "Release"("categoryId", "releaseDate");

-- CreateIndex
CREATE INDEX "Release_brand_releaseDate_idx" ON "Release"("brand", "releaseDate");

-- CreateIndex
CREATE INDEX "ReleaseProduct_productId_status_idx" ON "ReleaseProduct"("productId", "status");

-- CreateIndex
CREATE INDEX "ReleaseProduct_releaseId_status_idx" ON "ReleaseProduct"("releaseId", "status");

-- CreateIndex
CREATE INDEX "ReleaseProduct_releaseDate_status_idx" ON "ReleaseProduct"("releaseDate", "status");

-- CreateIndex
CREATE INDEX "ReleaseProduct_releaseId_productId_idx" ON "ReleaseProduct"("releaseId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseProduct_releaseId_productId_key" ON "ReleaseProduct"("releaseId", "productId");

-- CreateIndex
CREATE INDEX "NotificationSubscription_productId_createdAt_idx" ON "NotificationSubscription"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationSubscription_userId_preference_idx" ON "NotificationSubscription"("userId", "preference");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSubscription_userId_productId_key" ON "NotificationSubscription"("userId", "productId");

-- CreateIndex
CREATE INDEX "NotificationCenterPreference_userId_notificationType_idx" ON "NotificationCenterPreference"("userId", "notificationType");

-- CreateIndex
CREATE INDEX "NotificationCenterPreference_notificationType_emailEnabled_idx" ON "NotificationCenterPreference"("notificationType", "emailEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationCenterPreference_userId_notificationType_subjec_key" ON "NotificationCenterPreference"("userId", "notificationType", "subjectType", "subjectLabel");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingSubscriber_email_key" ON "MarketingSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingSubscriber_unsubscribeToken_key" ON "MarketingSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "MarketingSubscriber_status_marketingConsent_idx" ON "MarketingSubscriber"("status", "marketingConsent");

-- CreateIndex
CREATE INDEX "MarketingSubscriber_source_createdAt_idx" ON "MarketingSubscriber"("source", "createdAt");

-- CreateIndex
CREATE INDEX "MarketingSubscriber_lastSignupAt_idx" ON "MarketingSubscriber"("lastSignupAt");

-- CreateIndex
CREATE INDEX "MarketingSubscriber_customerId_idx" ON "MarketingSubscriber"("customerId");

-- CreateIndex
CREATE INDEX "MarketingSubscriber_unsubscribedAt_idx" ON "MarketingSubscriber"("unsubscribedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingSubscriberTag_slug_key" ON "MarketingSubscriberTag"("slug");

-- CreateIndex
CREATE INDEX "MarketingSubscriberTag_label_idx" ON "MarketingSubscriberTag"("label");

-- CreateIndex
CREATE INDEX "MarketingSubscriberTagAssignment_tagId_idx" ON "MarketingSubscriberTagAssignment"("tagId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_status_createdAt_idx" ON "MarketingCampaign"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MarketingCampaign_scheduledAt_idx" ON "MarketingCampaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "MarketingCampaign_createdById_idx" ON "MarketingCampaign"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSnapshot_productId_key" ON "MarketSnapshot"("productId");

-- CreateIndex
CREATE INDEX "MarketSnapshot_trend_lastUpdatedAt_idx" ON "MarketSnapshot"("trend", "lastUpdatedAt");

-- CreateIndex
CREATE INDEX "MarketSnapshot_confidenceScore_lastUpdatedAt_idx" ON "MarketSnapshot"("confidenceScore", "lastUpdatedAt");

-- CreateIndex
CREATE INDEX "MarketSnapshot_source_lastUpdatedAt_idx" ON "MarketSnapshot"("source", "lastUpdatedAt");

-- CreateIndex
CREATE INDEX "MarketPriceHistory_snapshotId_recordedAt_idx" ON "MarketPriceHistory"("snapshotId", "recordedAt");

-- CreateIndex
CREATE INDEX "MarketPriceHistory_label_recordedAt_idx" ON "MarketPriceHistory"("label", "recordedAt");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_notificationType_idx" ON "WatchlistItem"("userId", "notificationType");

-- CreateIndex
CREATE INDEX "WatchlistItem_productId_createdAt_idx" ON "WatchlistItem"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "WatchlistItem_releaseId_createdAt_idx" ON "WatchlistItem"("releaseId", "createdAt");

-- CreateIndex
CREATE INDEX "WatchlistItem_collectionItemId_createdAt_idx" ON "WatchlistItem"("collectionItemId", "createdAt");

-- CreateIndex
CREATE INDEX "WatchlistItem_marketSnapshotId_createdAt_idx" ON "WatchlistItem"("marketSnapshotId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_subjectType_subjectKey_key" ON "WatchlistItem"("userId", "subjectType", "subjectKey");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_key" ON "Wishlist"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_createdAt_idx" ON "WishlistItem"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "WishlistItem_wishlistId_createdAt_idx" ON "WishlistItem"("wishlistId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_wishlistId_productId_key" ON "WishlistItem"("wishlistId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_productId_key" ON "InventoryItem"("productId");

-- CreateIndex
CREATE INDEX "InventoryItem_stockOnHand_idx" ON "InventoryItem"("stockOnHand");

-- CreateIndex
CREATE INDEX "InventoryItem_reservedStock_idx" ON "InventoryItem"("reservedStock");

-- CreateIndex
CREATE INDEX "InventoryItem_reorderPoint_locationCode_idx" ON "InventoryItem"("reorderPoint", "locationCode");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentIntentId_key" ON "Order"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StockAdjustment_productId_createdAt_idx" ON "StockAdjustment"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockAdjustment_createdAt_idx" ON "StockAdjustment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_supplierSku_key" ON "SupplierProduct"("supplierId", "supplierSku");

-- CreateIndex
CREATE INDEX "PricingRule_active_priority_idx" ON "PricingRule"("active", "priority");

-- CreateIndex
CREATE INDEX "PricingRule_ruleScope_active_idx" ON "PricingRule"("ruleScope", "active");

-- CreateIndex
CREATE INDEX "PricingRule_productId_active_idx" ON "PricingRule"("productId", "active");

-- CreateIndex
CREATE INDEX "PricingRule_categoryId_active_idx" ON "PricingRule"("categoryId", "active");

-- CreateIndex
CREATE INDEX "PricingRule_supplierId_active_idx" ON "PricingRule"("supplierId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPricing_productId_key" ON "ProductPricing"("productId");

-- CreateIndex
CREATE INDEX "ProductPricing_buyMinor_idx" ON "ProductPricing"("buyMinor");

-- CreateIndex
CREATE INDEX "ProductPricing_priceSource_manualOverride_idx" ON "ProductPricing"("priceSource", "manualOverride");

-- CreateIndex
CREATE INDEX "ProductPricing_updatedAt_idx" ON "ProductPricing"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Buylist_buylistNumber_key" ON "Buylist"("buylistNumber");

-- CreateIndex
CREATE INDEX "Buylist_userId_status_idx" ON "Buylist"("userId", "status");

-- CreateIndex
CREATE INDEX "Buylist_status_createdAt_idx" ON "Buylist"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Buylist_createdAt_idx" ON "Buylist"("createdAt");

-- CreateIndex
CREATE INDEX "BuylistItem_productId_createdAt_idx" ON "BuylistItem"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BuylistItem_buylistId_productId_key" ON "BuylistItem"("buylistId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_key" ON "Collection"("userId");

-- CreateIndex
CREATE INDEX "Collection_userId_createdAt_idx" ON "Collection"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionInsightSnapshot_userId_key" ON "CollectionInsightSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionInsightSnapshot_collectionId_key" ON "CollectionInsightSnapshot"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionInsightSnapshot_collectionHealthScore_lastUpdated_idx" ON "CollectionInsightSnapshot"("collectionHealthScore", "lastUpdatedAt");

-- CreateIndex
CREATE INDEX "CollectionInsightSnapshot_estimatedValueMinor_lastUpdatedAt_idx" ON "CollectionInsightSnapshot"("estimatedValueMinor", "lastUpdatedAt");

-- CreateIndex
CREATE INDEX "CollectionItem_collectionId_updatedAt_idx" ON "CollectionItem"("collectionId", "updatedAt");

-- CreateIndex
CREATE INDEX "CollectionItem_productId_createdAt_idx" ON "CollectionItem"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionItem_collectionId_productId_idx" ON "CollectionItem"("collectionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_productId_printVariant_conditio_key" ON "CollectionItem"("collectionId", "productId", "printVariant", "condition", "foil", "language");

-- CreateIndex
CREATE INDEX "Deck_userId_visibility_idx" ON "Deck"("userId", "visibility");

-- CreateIndex
CREATE INDEX "Deck_game_visibility_idx" ON "Deck"("game", "visibility");

-- CreateIndex
CREATE INDEX "Deck_game_ruleProfile_idx" ON "Deck"("game", "ruleProfile");

-- CreateIndex
CREATE INDEX "Deck_createdAt_idx" ON "Deck"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deck_userId_slug_key" ON "Deck"("userId", "slug");

-- CreateIndex
CREATE INDEX "DeckCard_deckId_updatedAt_idx" ON "DeckCard"("deckId", "updatedAt");

-- CreateIndex
CREATE INDEX "DeckCard_productId_createdAt_idx" ON "DeckCard"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCard_deckId_productId_key" ON "DeckCard"("deckId", "productId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseProduct" ADD CONSTRAINT "ReleaseProduct_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseProduct" ADD CONSTRAINT "ReleaseProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSubscription" ADD CONSTRAINT "NotificationSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSubscription" ADD CONSTRAINT "NotificationSubscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationCenterPreference" ADD CONSTRAINT "NotificationCenterPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingSubscriber" ADD CONSTRAINT "MarketingSubscriber_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingSubscriberTagAssignment" ADD CONSTRAINT "MarketingSubscriberTagAssignment_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "MarketingSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingSubscriberTagAssignment" ADD CONSTRAINT "MarketingSubscriberTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MarketingSubscriberTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSnapshot" ADD CONSTRAINT "MarketSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketPriceHistory" ADD CONSTRAINT "MarketPriceHistory_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MarketSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "CollectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_marketSnapshotId_fkey" FOREIGN KEY ("marketSnapshotId") REFERENCES "MarketSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPricing" ADD CONSTRAINT "ProductPricing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPricing" ADD CONSTRAINT "ProductPricing_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buylist" ADD CONSTRAINT "Buylist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuylistItem" ADD CONSTRAINT "BuylistItem_buylistId_fkey" FOREIGN KEY ("buylistId") REFERENCES "Buylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuylistItem" ADD CONSTRAINT "BuylistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionInsightSnapshot" ADD CONSTRAINT "CollectionInsightSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionInsightSnapshot" ADD CONSTRAINT "CollectionInsightSnapshot_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

