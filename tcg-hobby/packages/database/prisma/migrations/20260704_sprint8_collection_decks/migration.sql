DO $$
BEGIN
  CREATE TYPE "CollectionPrintVariant" AS ENUM ('REGULAR', 'REVERSE_HOLO', 'HOLO', 'PROMO', 'FIRST_EDITION', 'FOIL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DeckVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Collection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Collection_userId_key" ON "Collection"("userId");
CREATE INDEX IF NOT EXISTS "Collection_userId_createdAt_idx" ON "Collection"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "CollectionItem" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "CollectionItem_collectionId_productId_printVariant_condition_fo_idx"
  ON "CollectionItem"("collectionId", "productId", "printVariant", "condition", "foil", "language");
CREATE INDEX IF NOT EXISTS "CollectionItem_collectionId_updatedAt_idx" ON "CollectionItem"("collectionId", "updatedAt");
CREATE INDEX IF NOT EXISTS "CollectionItem_productId_createdAt_idx" ON "CollectionItem"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "CollectionItem_collectionId_productId_idx" ON "CollectionItem"("collectionId", "productId");

CREATE TABLE IF NOT EXISTS "Deck" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "Deck_userId_slug_key" ON "Deck"("userId", "slug");
CREATE INDEX IF NOT EXISTS "Deck_userId_visibility_idx" ON "Deck"("userId", "visibility");
CREATE INDEX IF NOT EXISTS "Deck_game_visibility_idx" ON "Deck"("game", "visibility");
CREATE INDEX IF NOT EXISTS "Deck_game_ruleProfile_idx" ON "Deck"("game", "ruleProfile");
CREATE INDEX IF NOT EXISTS "Deck_createdAt_idx" ON "Deck"("createdAt");

CREATE TABLE IF NOT EXISTS "DeckCard" (
  "id" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeckCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeckCard_deckId_productId_key" ON "DeckCard"("deckId", "productId");
CREATE INDEX IF NOT EXISTS "DeckCard_deckId_updatedAt_idx" ON "DeckCard"("deckId", "updatedAt");
CREATE INDEX IF NOT EXISTS "DeckCard_productId_createdAt_idx" ON "DeckCard"("productId", "createdAt");

ALTER TABLE "Collection"
  ADD CONSTRAINT "Collection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionItem"
  ADD CONSTRAINT "CollectionItem_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deck"
  ADD CONSTRAINT "Deck_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeckCard"
  ADD CONSTRAINT "DeckCard_deckId_fkey"
  FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DeckCard_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
