CREATE TYPE "MarketingSubscriberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'SUPPRESSED');
CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED', 'FAILED');

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

CREATE TABLE "MarketingSubscriberTag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSubscriberTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketingSubscriberTagAssignment" (
    "subscriberId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingSubscriberTagAssignment_pkey" PRIMARY KEY ("subscriberId","tagId")
);

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

CREATE UNIQUE INDEX "MarketingSubscriber_email_key" ON "MarketingSubscriber"("email");
CREATE UNIQUE INDEX "MarketingSubscriber_unsubscribeToken_key" ON "MarketingSubscriber"("unsubscribeToken");
CREATE INDEX "MarketingSubscriber_status_marketingConsent_idx" ON "MarketingSubscriber"("status", "marketingConsent");
CREATE INDEX "MarketingSubscriber_source_createdAt_idx" ON "MarketingSubscriber"("source", "createdAt");
CREATE INDEX "MarketingSubscriber_lastSignupAt_idx" ON "MarketingSubscriber"("lastSignupAt");
CREATE INDEX "MarketingSubscriber_customerId_idx" ON "MarketingSubscriber"("customerId");
CREATE INDEX "MarketingSubscriber_unsubscribedAt_idx" ON "MarketingSubscriber"("unsubscribedAt");
CREATE UNIQUE INDEX "MarketingSubscriberTag_slug_key" ON "MarketingSubscriberTag"("slug");
CREATE INDEX "MarketingSubscriberTag_label_idx" ON "MarketingSubscriberTag"("label");
CREATE INDEX "MarketingSubscriberTagAssignment_tagId_idx" ON "MarketingSubscriberTagAssignment"("tagId");
CREATE INDEX "MarketingCampaign_status_createdAt_idx" ON "MarketingCampaign"("status", "createdAt");
CREATE INDEX "MarketingCampaign_scheduledAt_idx" ON "MarketingCampaign"("scheduledAt");
CREATE INDEX "MarketingCampaign_createdById_idx" ON "MarketingCampaign"("createdById");

ALTER TABLE "MarketingSubscriber" ADD CONSTRAINT "MarketingSubscriber_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketingSubscriberTagAssignment" ADD CONSTRAINT "MarketingSubscriberTagAssignment_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "MarketingSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingSubscriberTagAssignment" ADD CONSTRAINT "MarketingSubscriberTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MarketingSubscriberTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "MarketingSubscriberTag" ("id", "slug", "label", "description", "createdAt", "updatedAt")
VALUES
  ('marketing-tag-launch', 'launch', 'Launch', 'Launch list signups and launch-day updates.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-newsletter', 'newsletter', 'Newsletter', 'General product news and selected marketing updates.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-pokemon', 'pokemon', 'Pokémon', 'Pokémon launch, preorder, and restock interest.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-mtg', 'magic-the-gathering', 'Magic: The Gathering', 'Magic release and restock interest.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-lorcana', 'lorcana', 'Lorcana', 'Lorcana release and restock interest.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-one-piece', 'one-piece', 'One Piece Card Game', 'One Piece Card Game release and restock interest.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-yugioh', 'yugioh', 'Yu-Gi-Oh!', 'Yu-Gi-Oh! release and restock interest.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-fab', 'flesh-and-blood', 'Flesh and Blood', 'Flesh and Blood release and restock interest.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-vip', 'vip', 'VIP', 'High-priority customer communication segment.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-customer', 'customer', 'Customer', 'Subscribers linked to customer accounts.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-preorder', 'preorder', 'Preorder', 'Preorder notification interest.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing-tag-restock-alert', 'restock-alert', 'Restock Alert', 'Restock notification interest.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "MarketingSubscriber" (
  "id",
  "email",
  "source",
  "lastUpdatedSource",
  "unsubscribeToken",
  "lastSignupAt",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  lower("email"),
  "source",
  "source",
  md5("id" || ':' || lower("email") || ':' || CURRENT_TIMESTAMP::text),
  "updatedAt",
  "createdAt",
  "updatedAt"
FROM "LaunchSignup"
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "MarketingSubscriberTagAssignment" ("subscriberId", "tagId", "createdAt")
SELECT "MarketingSubscriber"."id", 'marketing-tag-launch', CURRENT_TIMESTAMP
FROM "MarketingSubscriber"
LEFT JOIN "MarketingSubscriberTagAssignment"
  ON "MarketingSubscriberTagAssignment"."subscriberId" = "MarketingSubscriber"."id"
  AND "MarketingSubscriberTagAssignment"."tagId" = 'marketing-tag-launch'
WHERE "MarketingSubscriberTagAssignment"."subscriberId" IS NULL;

DROP TABLE IF EXISTS "LaunchSignup";
