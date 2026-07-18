CREATE TABLE "Game" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Brand" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "website" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductType" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "group" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductLanguage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductLanguage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductSet" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "releaseDate" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSet_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product"
  ADD COLUMN "gameId" TEXT,
  ADD COLUMN "brandId" TEXT,
  ADD COLUMN "productTypeId" TEXT,
  ADD COLUMN "languageId" TEXT,
  ADD COLUMN "setId" TEXT;

CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");
CREATE INDEX "Game_active_sortOrder_idx" ON "Game"("active", "sortOrder");
CREATE INDEX "Game_name_idx" ON "Game"("name");

CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");
CREATE INDEX "Brand_active_sortOrder_idx" ON "Brand"("active", "sortOrder");
CREATE INDEX "Brand_name_idx" ON "Brand"("name");

CREATE UNIQUE INDEX "ProductType_slug_key" ON "ProductType"("slug");
CREATE INDEX "ProductType_active_sortOrder_idx" ON "ProductType"("active", "sortOrder");
CREATE INDEX "ProductType_group_idx" ON "ProductType"("group");
CREATE INDEX "ProductType_name_idx" ON "ProductType"("name");

CREATE UNIQUE INDEX "ProductLanguage_code_key" ON "ProductLanguage"("code");
CREATE INDEX "ProductLanguage_active_sortOrder_idx" ON "ProductLanguage"("active", "sortOrder");
CREATE INDEX "ProductLanguage_name_idx" ON "ProductLanguage"("name");

CREATE UNIQUE INDEX "ProductSet_gameId_slug_key" ON "ProductSet"("gameId", "slug");
CREATE INDEX "ProductSet_gameId_active_sortOrder_idx" ON "ProductSet"("gameId", "active", "sortOrder");
CREATE INDEX "ProductSet_name_idx" ON "ProductSet"("name");

CREATE INDEX "Product_gameId_idx" ON "Product"("gameId");
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX "Product_productTypeId_idx" ON "Product"("productTypeId");
CREATE INDEX "Product_languageId_idx" ON "Product"("languageId");
CREATE INDEX "Product_setId_idx" ON "Product"("setId");

ALTER TABLE "ProductSet" ADD CONSTRAINT "ProductSet_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "ProductLanguage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_setId_fkey" FOREIGN KEY ("setId") REFERENCES "ProductSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Game" ("id", "name", "slug", "active", "sortOrder", "updatedAt") VALUES
  ('game_pokemon_tcg', 'Pokémon TCG', 'pokemon-tcg', true, 10, CURRENT_TIMESTAMP),
  ('game_magic_the_gathering', 'Magic: The Gathering', 'magic-the-gathering', true, 20, CURRENT_TIMESTAMP),
  ('game_one_piece_card_game', 'One Piece Card Game', 'one-piece-card-game', true, 30, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Brand" ("id", "name", "slug", "active", "sortOrder", "updatedAt") VALUES
  ('brand_pokemon_tcg', 'Pokémon TCG', 'pokemon-tcg', true, 10, CURRENT_TIMESTAMP),
  ('brand_pokemon', 'Pokémon', 'pokemon', true, 20, CURRENT_TIMESTAMP),
  ('brand_wizards_of_the_coast', 'Wizards of the Coast', 'wizards-of-the-coast', true, 30, CURRENT_TIMESTAMP),
  ('brand_bandai', 'Bandai', 'bandai', true, 40, CURRENT_TIMESTAMP),
  ('brand_ultra_pro', 'Ultra PRO', 'ultra-pro', true, 50, CURRENT_TIMESTAMP),
  ('brand_dragon_shield', 'Dragon Shield', 'dragon-shield', true, 60, CURRENT_TIMESTAMP),
  ('brand_gamegenic', 'Gamegenic', 'gamegenic', true, 70, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductType" ("id", "name", "slug", "group", "active", "sortOrder", "updatedAt") VALUES
  ('ptype_booster_pack', 'Booster Pack', 'booster-pack', 'sealed', true, 10, CURRENT_TIMESTAMP),
  ('ptype_booster_box', 'Booster Box', 'booster-box', 'sealed', true, 20, CURRENT_TIMESTAMP),
  ('ptype_elite_trainer_box', 'Elite Trainer Box', 'elite-trainer-box', 'sealed', true, 30, CURRENT_TIMESTAMP),
  ('ptype_collection_box', 'Collection Box', 'collection-box', 'sealed', true, 40, CURRENT_TIMESTAMP),
  ('ptype_premium_collection', 'Premium Collection', 'premium-collection', 'sealed', true, 50, CURRENT_TIMESTAMP),
  ('ptype_tin', 'Tin', 'tin', 'sealed', true, 60, CURRENT_TIMESTAMP),
  ('ptype_bundle', 'Bundle', 'bundle', 'sealed', true, 70, CURRENT_TIMESTAMP),
  ('ptype_deck', 'Deck', 'deck', 'sealed', true, 80, CURRENT_TIMESTAMP),
  ('ptype_starter_deck', 'Starter Deck', 'starter-deck', 'sealed', true, 90, CURRENT_TIMESTAMP),
  ('ptype_gift_collection', 'Gift Collection', 'gift-collection', 'sealed', true, 100, CURRENT_TIMESTAMP),
  ('ptype_single_card', 'Single Card', 'single-card', 'single', true, 110, CURRENT_TIMESTAMP),
  ('ptype_sleeves', 'Sleeves', 'sleeves', 'accessory', true, 120, CURRENT_TIMESTAMP),
  ('ptype_binder', 'Binder', 'binder', 'accessory', true, 130, CURRENT_TIMESTAMP),
  ('ptype_deck_box', 'Deck Box', 'deck-box', 'accessory', true, 140, CURRENT_TIMESTAMP),
  ('ptype_playmat', 'Playmat', 'playmat', 'accessory', true, 150, CURRENT_TIMESTAMP),
  ('ptype_storage_box', 'Storage Box', 'storage-box', 'accessory', true, 160, CURRENT_TIMESTAMP),
  ('ptype_accessory', 'Accessory', 'accessory', 'accessory', true, 170, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ProductLanguage" ("id", "name", "code", "active", "sortOrder", "updatedAt") VALUES
  ('lang_en', 'English', 'en', true, 10, CURRENT_TIMESTAMP),
  ('lang_ja', 'Japanese', 'ja', true, 20, CURRENT_TIMESTAMP),
  ('lang_ko', 'Korean', 'ko', true, 30, CURRENT_TIMESTAMP),
  ('lang_zh_hans', 'Chinese (Simplified)', 'zh-Hans', true, 40, CURRENT_TIMESTAMP),
  ('lang_zh_hant', 'Chinese (Traditional)', 'zh-Hant', true, 50, CURRENT_TIMESTAMP),
  ('lang_fr', 'French', 'fr', true, 60, CURRENT_TIMESTAMP),
  ('lang_de', 'German', 'de', true, 70, CURRENT_TIMESTAMP),
  ('lang_it', 'Italian', 'it', true, 80, CURRENT_TIMESTAMP),
  ('lang_es', 'Spanish', 'es', true, 90, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "ProductSet" ("id", "name", "slug", "gameId", "active", "sortOrder", "updatedAt") VALUES
  ('set_pokemon_black_bolt', 'Black Bolt', 'black-bolt', 'game_pokemon_tcg', true, 10, CURRENT_TIMESTAMP),
  ('set_pokemon_white_flare', 'White Flare', 'white-flare', 'game_pokemon_tcg', true, 20, CURRENT_TIMESTAMP)
ON CONFLICT ("gameId", "slug") DO NOTHING;

UPDATE "Product"
SET "gameId" = 'game_pokemon_tcg'
WHERE lower(coalesce("game", '')) IN ('pokemon', 'pokémon', 'pokemon tcg', 'pokémon tcg');

UPDATE "Product"
SET "gameId" = 'game_magic_the_gathering'
WHERE lower(coalesce("game", '')) IN ('magic', 'mtg', 'magic: the gathering');

UPDATE "Product"
SET "gameId" = 'game_one_piece_card_game'
WHERE lower(coalesce("game", '')) IN ('one piece', 'one piece card game');

UPDATE "Product"
SET "brandId" = 'brand_pokemon_tcg'
WHERE lower(coalesce("brand", '')) IN ('pokemon tcg', 'pokémon tcg');

UPDATE "Product"
SET "brandId" = 'brand_pokemon'
WHERE lower(coalesce("brand", '')) IN ('pokemon', 'pokémon');

UPDATE "Product"
SET "brandId" = 'brand_wizards_of_the_coast'
WHERE lower(coalesce("brand", '')) IN ('wizards of the coast', 'wotc');

UPDATE "Product"
SET "brandId" = 'brand_bandai'
WHERE lower(coalesce("brand", '')) IN ('bandai');

UPDATE "Product"
SET "productTypeId" = 'ptype_premium_collection'
WHERE lower(coalesce("productType", '')) IN ('premium collection');

UPDATE "Product"
SET "productTypeId" = 'ptype_booster_pack'
WHERE lower(coalesce("productType", '')) IN ('booster pack');

UPDATE "Product"
SET "productTypeId" = 'ptype_booster_box'
WHERE lower(coalesce("productType", '')) IN ('booster box');

UPDATE "Product"
SET "languageId" = 'lang_en'
WHERE lower(coalesce("language", '')) IN ('english', 'en');
