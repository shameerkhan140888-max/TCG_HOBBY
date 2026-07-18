import type { PrismaClient, Prisma } from '@prisma/client';

export type CanonicalCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  imageLabel: string;
};

export type CanonicalSupplier = {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  email: string;
  phone: string | null;
  website: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  preferred: boolean;
  internalNotes: string | null;
};

export type CanonicalGame = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type CanonicalBrand = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type CanonicalProductType = {
  id: string;
  name: string;
  slug: string;
  group: string | null;
  sortOrder: number;
};

export type CanonicalProductLanguage = {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
};

export type CanonicalProductSet = {
  id: string;
  name: string;
  slug: string;
  gameId: string;
  sortOrder: number;
};

export const canonicalCategories: CanonicalCategory[] = [
  {
    id: 'cat-pokemon-tcg',
    name: 'Pokemon TCG',
    slug: 'pokemon-tcg',
    description: 'Pokemon Trading Card Game products and releases.',
    sortOrder: 1,
    imageLabel: 'Pokemon TCG',
  },
  {
    id: 'cat-magic-the-gathering',
    name: 'Magic: The Gathering',
    slug: 'magic-the-gathering',
    description: 'Magic: The Gathering sealed products, singles and accessories.',
    sortOrder: 2,
    imageLabel: 'Magic: The Gathering',
  },
  {
    id: 'cat-one-piece-card-game',
    name: 'One Piece Card Game',
    slug: 'one-piece-card-game',
    description: 'One Piece Card Game sealed products and releases.',
    sortOrder: 3,
    imageLabel: 'One Piece Card Game',
  },
  {
    id: 'cat-accessories',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Sleeves, binders, deck boxes, and protective storage for every collection.',
    sortOrder: 4,
    imageLabel: 'Accessory wall',
  },
  {
    id: 'cat-sealed',
    name: 'Sealed Product',
    slug: 'sealed-product',
    description: 'Booster boxes, bundles, and collector products ready for shelf display.',
    sortOrder: 5,
    imageLabel: 'Display case',
  },
  {
    id: 'cat-singles',
    name: 'Singles',
    slug: 'singles',
    description: 'Individual cards for deck construction, upgrades, and collectability.',
    sortOrder: 6,
    imageLabel: 'Playset tray',
  },
  {
    id: 'cat-supplies',
    name: 'Supplies',
    slug: 'supplies',
    description: 'Consumable hobby supplies and collector essentials.',
    sortOrder: 7,
    imageLabel: 'Supplies shelf',
  },
  {
    id: 'cat-events',
    name: 'Events',
    slug: 'events',
    description: 'Tournament entries, league nights, and organised play products.',
    sortOrder: 8,
    imageLabel: 'Event pass',
  },
];

export const canonicalSuppliers: CanonicalSupplier[] = [
  {
    id: 'sup-card-citadel',
    name: 'Card Citadel',
    slug: 'card-citadel',
    contactName: 'Mia Carter',
    email: 'hello@cardcitadel.example',
    phone: '+44 20 5550 8100',
    website: 'https://cardcitadel.example',
    addressLine1: '12 Spire Road',
    addressLine2: null,
    city: 'Leeds',
    region: 'West Yorkshire',
    postalCode: 'LS1 2AB',
    country: 'GB',
    preferred: true,
    internalNotes: 'Primary sealed product distributor.',
  },
  {
    id: 'sup-gamegrid',
    name: 'GameGrid Wholesale',
    slug: 'gamegrid-wholesale',
    contactName: 'Jonas Reed',
    email: 'sales@gamegrid.example',
    phone: '+44 20 5550 8200',
    website: 'https://gamegrid.example',
    addressLine1: '44 Warehouse Lane',
    addressLine2: 'Unit 8',
    city: 'Manchester',
    region: null,
    postalCode: 'M1 1AA',
    country: 'GB',
    preferred: false,
    internalNotes: 'Accessories and event support partner.',
  },
];

export const canonicalGames: CanonicalGame[] = [
  { id: 'game_pokemon_tcg', name: 'Pokemon TCG', slug: 'pokemon-tcg', sortOrder: 1 },
  { id: 'game_magic_the_gathering', name: 'Magic: The Gathering', slug: 'magic-the-gathering', sortOrder: 2 },
  { id: 'game_one_piece_card_game', name: 'One Piece Card Game', slug: 'one-piece-card-game', sortOrder: 3 },
];

export const canonicalBrands: CanonicalBrand[] = [
  { id: 'brand_pokemon_tcg', name: 'Pokemon TCG', slug: 'pokemon-tcg', sortOrder: 1 },
  { id: 'brand_pokemon', name: 'Pokemon', slug: 'pokemon', sortOrder: 2 },
  { id: 'brand_wizards_of_the_coast', name: 'Wizards of the Coast', slug: 'wizards-of-the-coast', sortOrder: 3 },
  { id: 'brand_bandai', name: 'Bandai', slug: 'bandai', sortOrder: 4 },
  { id: 'brand_ultra_pro', name: 'Ultra PRO', slug: 'ultra-pro', sortOrder: 5 },
  { id: 'brand_dragon_shield', name: 'Dragon Shield', slug: 'dragon-shield', sortOrder: 6 },
  { id: 'brand_gamegenic', name: 'Gamegenic', slug: 'gamegenic', sortOrder: 7 },
];

export const canonicalProductTypes: CanonicalProductType[] = [
  { id: 'ptype_booster_pack', name: 'Booster Pack', slug: 'booster-pack', group: 'sealed', sortOrder: 1 },
  { id: 'ptype_booster_box', name: 'Booster Box', slug: 'booster-box', group: 'sealed', sortOrder: 2 },
  { id: 'ptype_elite_trainer_box', name: 'Elite Trainer Box', slug: 'elite-trainer-box', group: 'sealed', sortOrder: 3 },
  { id: 'ptype_collection_box', name: 'Collection Box', slug: 'collection-box', group: 'sealed', sortOrder: 4 },
  { id: 'ptype_premium_collection', name: 'Premium Collection', slug: 'premium-collection', group: 'sealed', sortOrder: 5 },
  { id: 'ptype_tin', name: 'Tin', slug: 'tin', group: 'sealed', sortOrder: 6 },
  { id: 'ptype_bundle', name: 'Bundle', slug: 'bundle', group: 'sealed', sortOrder: 7 },
  { id: 'ptype_deck', name: 'Deck', slug: 'deck', group: 'sealed', sortOrder: 8 },
  { id: 'ptype_single_card', name: 'Single Card', slug: 'single-card', group: 'single', sortOrder: 9 },
  { id: 'ptype_sleeves', name: 'Sleeves', slug: 'sleeves', group: 'accessory', sortOrder: 10 },
  { id: 'ptype_binder', name: 'Binder', slug: 'binder', group: 'accessory', sortOrder: 11 },
  { id: 'ptype_deck_box', name: 'Deck Box', slug: 'deck-box', group: 'accessory', sortOrder: 12 },
  { id: 'ptype_playmat', name: 'Playmat', slug: 'playmat', group: 'accessory', sortOrder: 13 },
  { id: 'ptype_storage_box', name: 'Storage Box', slug: 'storage-box', group: 'accessory', sortOrder: 14 },
  { id: 'ptype_accessory', name: 'Accessory', slug: 'accessory', group: 'accessory', sortOrder: 15 },
];

export const canonicalProductLanguages: CanonicalProductLanguage[] = [
  { id: 'lang_en', name: 'English', code: 'en', sortOrder: 1 },
  { id: 'lang_ja', name: 'Japanese', code: 'ja', sortOrder: 2 },
  { id: 'lang_ko', name: 'Korean', code: 'ko', sortOrder: 3 },
  { id: 'lang_zh_hans', name: 'Chinese Simplified', code: 'zh-Hans', sortOrder: 4 },
  { id: 'lang_zh_hant', name: 'Chinese Traditional', code: 'zh-Hant', sortOrder: 5 },
  { id: 'lang_fr', name: 'French', code: 'fr', sortOrder: 6 },
  { id: 'lang_de', name: 'German', code: 'de', sortOrder: 7 },
  { id: 'lang_it', name: 'Italian', code: 'it', sortOrder: 8 },
  { id: 'lang_es', name: 'Spanish', code: 'es', sortOrder: 9 },
];

export const canonicalProductSets: CanonicalProductSet[] = [
  { id: 'set_pokemon_black_bolt', name: 'Black Bolt', slug: 'black-bolt', gameId: 'game_pokemon_tcg', sortOrder: 1 },
  { id: 'set_pokemon_white_flare', name: 'White Flare', slug: 'white-flare', gameId: 'game_pokemon_tcg', sortOrder: 2 },
];

type SeedDatabase =
  | Pick<PrismaClient, '$connect' | '$disconnect' | 'category' | 'supplier' | 'game' | 'brand' | 'productType' | 'productLanguage' | 'productSet'>
  | Prisma.TransactionClient;

export async function seedCanonicalLookupData(
  db: SeedDatabase,
  log: (message: string) => void = () => undefined,
): Promise<void> {
  log('Seeding categories...');
  for (const category of canonicalCategories) {
    await db.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        imageLabel: category.imageLabel,
      },
    });
  }

  log('Seeding suppliers...');
  for (const supplier of canonicalSuppliers) {
    await db.supplier.upsert({
      where: { slug: supplier.slug },
      create: supplier,
      update: {
        name: supplier.name,
        contactName: supplier.contactName,
        email: supplier.email,
        phone: supplier.phone,
        website: supplier.website,
        addressLine1: supplier.addressLine1,
        addressLine2: supplier.addressLine2,
        city: supplier.city,
        region: supplier.region,
        postalCode: supplier.postalCode,
        country: supplier.country,
        preferred: supplier.preferred,
        internalNotes: supplier.internalNotes,
        active: true,
      },
    });
  }

  log('Seeding catalogue master data...');
  for (const game of canonicalGames) {
    await db.game.upsert({
      where: { slug: game.slug },
      create: { ...game, active: true },
      update: { name: game.name, sortOrder: game.sortOrder, active: true },
    });
  }

  for (const brand of canonicalBrands) {
    await db.brand.upsert({
      where: { slug: brand.slug },
      create: { ...brand, active: true },
      update: { name: brand.name, sortOrder: brand.sortOrder, active: true },
    });
  }

  for (const productType of canonicalProductTypes) {
    await db.productType.upsert({
      where: { slug: productType.slug },
      create: { ...productType, active: true },
      update: { name: productType.name, group: productType.group, sortOrder: productType.sortOrder, active: true },
    });
  }

  for (const language of canonicalProductLanguages) {
    await db.productLanguage.upsert({
      where: { code: language.code },
      create: { ...language, active: true },
      update: { name: language.name, sortOrder: language.sortOrder, active: true },
    });
  }

  for (const set of canonicalProductSets) {
    await db.productSet.upsert({
      where: { gameId_slug: { gameId: set.gameId, slug: set.slug } },
      create: { ...set, active: true },
      update: { name: set.name, sortOrder: set.sortOrder, active: true },
    });
  }

  log('Seeding products...');
  log('Seeding users...');
}

export async function verifyCanonicalLookupData(
  db: Pick<PrismaClient, 'category' | 'supplier' | 'game' | 'brand' | 'productType' | 'productLanguage' | 'productSet'> | Prisma.TransactionClient,
): Promise<void> {
  const [categories, suppliers, games, brands, productTypes, languages, sets] = await Promise.all([
    db.category.findMany({
      where: { slug: { in: canonicalCategories.map((category) => category.slug) } },
      select: { slug: true },
    }),
    db.supplier.findMany({
      where: { slug: { in: canonicalSuppliers.map((supplier) => supplier.slug) } },
      select: { slug: true },
    }),
    db.game.findMany({
      where: { slug: { in: canonicalGames.map((game) => game.slug) } },
      select: { slug: true },
    }),
    db.brand.findMany({
      where: { slug: { in: canonicalBrands.map((brand) => brand.slug) } },
      select: { slug: true },
    }),
    db.productType.findMany({
      where: { slug: { in: canonicalProductTypes.map((productType) => productType.slug) } },
      select: { slug: true },
    }),
    db.productLanguage.findMany({
      where: { code: { in: canonicalProductLanguages.map((language) => language.code) } },
      select: { code: true },
    }),
    db.productSet.findMany({
      where: { slug: { in: canonicalProductSets.map((set) => set.slug) } },
      select: { slug: true },
    }),
  ]);

  const categorySlugs = new Set(categories.map((category) => category.slug));
  const supplierSlugs = new Set(suppliers.map((supplier) => supplier.slug));
  const gameSlugs = new Set(games.map((game) => game.slug));
  const brandSlugs = new Set(brands.map((brand) => brand.slug));
  const productTypeSlugs = new Set(productTypes.map((productType) => productType.slug));
  const languageCodes = new Set(languages.map((language) => language.code));
  const setSlugs = new Set(sets.map((set) => set.slug));
  const missingCategories = canonicalCategories.filter((category) => !categorySlugs.has(category.slug)).map((category) => category.slug);
  const missingSuppliers = canonicalSuppliers.filter((supplier) => !supplierSlugs.has(supplier.slug)).map((supplier) => supplier.slug);
  const missingGames = canonicalGames.filter((game) => !gameSlugs.has(game.slug)).map((game) => game.slug);
  const missingBrands = canonicalBrands.filter((brand) => !brandSlugs.has(brand.slug)).map((brand) => brand.slug);
  const missingProductTypes = canonicalProductTypes.filter((productType) => !productTypeSlugs.has(productType.slug)).map((productType) => productType.slug);
  const missingLanguages = canonicalProductLanguages.filter((language) => !languageCodes.has(language.code)).map((language) => language.code);
  const missingSets = canonicalProductSets.filter((set) => !setSlugs.has(set.slug)).map((set) => set.slug);

  if (missingCategories.length || missingSuppliers.length || missingGames.length || missingBrands.length || missingProductTypes.length || missingLanguages.length || missingSets.length) {
    throw new Error(
      [
        'Canonical lookup verification failed.',
        missingCategories.length ? `Missing categories: ${missingCategories.join(', ')}` : null,
        missingSuppliers.length ? `Missing suppliers: ${missingSuppliers.join(', ')}` : null,
        missingGames.length ? `Missing games: ${missingGames.join(', ')}` : null,
        missingBrands.length ? `Missing brands: ${missingBrands.join(', ')}` : null,
        missingProductTypes.length ? `Missing product types: ${missingProductTypes.join(', ')}` : null,
        missingLanguages.length ? `Missing languages: ${missingLanguages.join(', ')}` : null,
        missingSets.length ? `Missing sets: ${missingSets.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
}

export async function assertProductImportLookupData(
  db: Pick<PrismaClient, 'category' | 'supplier'> | Prisma.TransactionClient,
  input: { category: string; supplierSlug?: string },
): Promise<void> {
  const category = await db.category.findUnique({
    where: { slug: input.category },
    select: { slug: true },
  });

  if (!category) {
    throw new Error(
      `Product import prerequisite missing: category "${input.category}" does not exist. Run npm run db:seed and ensure canonical category slugs match product.json.`,
    );
  }

  if (!input.supplierSlug) {
    return;
  }

  const supplier = await db.supplier.findUnique({
    where: { slug: input.supplierSlug },
    select: { slug: true },
  });

  if (!supplier) {
    throw new Error(
      `Product import prerequisite missing: supplier "${input.supplierSlug}" does not exist. Run npm run db:seed or correct supplierSlug in product.json.`,
    );
  }
}
