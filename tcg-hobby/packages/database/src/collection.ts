import type { CollectionDashboard, CollectionItem, CollectionSummary, CatalogueProduct } from '@tcg-hobby/types';
import { prisma } from './client';
import { seedCategories, seedCollectionItems, seedCollections, seedDecks, seedProducts } from './seed-data';
import { getWishlistItems, getWishlistProductIds } from './wishlist';

type CollectionItemRow = {
  id: string;
  ownedQuantity: number;
  printVariant: string;
  condition: CollectionItem['condition'];
  foil: boolean;
  language: string;
  notes: string | null;
  dateAcquired: Date | null;
  purchasePriceMinor: number | null;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    slug: string;
    name: string;
    game: string;
    setName: string | null;
    category: {
      name: string;
      slug: string;
    };
  };
};

type CollectionRecord = {
  id: string;
  userId: string;
  items: CollectionItemRow[];
};

type SeedCollectionItemRow = {
  id: string;
  collectionId: string;
  productSlug: string;
  ownedQuantity: number;
  printVariant: CollectionItem['printVariant'];
  condition: CollectionItem['condition'];
  foil: boolean;
  language: string;
  notes: string | null;
  dateAcquired: string | null;
  purchasePriceMinor: number | null;
  createdAt: string;
  updatedAt: string;
};

function canUseSeedFallback() {
  return process.env.NODE_ENV !== 'production';
}

function shouldBypassDatabase() {
  return process.env.TCG_HOBBY_COLLECTION_DATA_SOURCE === 'seed';
}

function createCollectionDatabaseError(reason: string) {
  return new Error(`Collection database query failed in production: ${reason}`);
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.toISOString();
}

function mapCollectionItemRow(item: CollectionItemRow): CollectionItem {
  return {
    id: item.id,
    productId: item.product.id,
    productName: item.product.name,
    productSlug: item.product.slug,
    game: item.product.game,
    categoryName: item.product.category.name,
    setName: item.product.setName,
    ownedQuantity: item.ownedQuantity,
    printVariant: item.printVariant as CollectionItem['printVariant'],
    condition: item.condition,
    foil: item.foil,
    language: item.language,
    notes: item.notes,
    dateAcquired: toIsoString(item.dateAcquired),
    purchasePriceMinor: item.purchasePriceMinor,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function mapSeedCollectionItem(item: SeedCollectionItemRow): CollectionItem {
  const product = seedProducts.find((entry) => entry.slug === item.productSlug);
  const resolvedCategory = product ? seedCategories.find((entry) => entry.slug === product.categorySlug) : null;

  if (!product) {
    throw new Error(`Missing seed product for collection item ${item.id}`);
  }

  return {
    ...item,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    game: product.game,
    categoryName: resolvedCategory?.name ?? product.categorySlug,
    setName: product.setName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function collectionStatsFromItems(items: CollectionItem[]) {
  const cardsOwned = items.reduce((sum, item) => sum + item.ownedQuantity, 0);
  const productsRepresented = new Set(items.map((item) => item.productId)).size;
  const setsRepresented = new Set(items.map((item) => item.setName ?? item.categoryName)).size;

  const gameTotals = new Map<string, number>();
  for (const item of items) {
    gameTotals.set(item.game, (gameTotals.get(item.game) ?? 0) + item.ownedQuantity);
  }

  const favouriteGame = [...gameTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
  const recentAdditions = [...items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  return {
    cardsOwned,
    setsRepresented,
    productsRepresented,
    favouriteGame,
    recentAdditions,
  };
}

function collectionDashboardFromItems(
  collectionId: string,
  items: CollectionItem[],
  deckCount: number,
  wishlistIds: string[],
  wishlistItems: Awaited<ReturnType<typeof getWishlistItems>>,
): CollectionDashboard {
  const summary = collectionStatsFromItems(items);
  const largestSets = [...items.reduce((map, item) => {
    const key = item.setName ?? item.categoryName;
    const next = map.get(key) ?? 0;
    map.set(key, next + item.ownedQuantity);
    return map;
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, cardsOwned]) => ({ label, cardsOwned }));

  const wishlistOverlap = items.filter((item) => wishlistIds.includes(item.productId)).slice(0, 4);
  const ownedProductIds = new Set(items.map((item) => item.productId));
  const missingCards = wishlistItems
    .filter((item) => !ownedProductIds.has(item.product.id))
    .slice(0, 4)
    .map((item) => ({
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      game: item.product.game,
      categoryName: item.product.categoryName,
    }));

  const recentlyViewed = summary.recentAdditions.slice(0, 3).map((item) => ({
    id: item.productId,
    name: item.productName,
    slug: item.productSlug,
    game: item.game,
    categoryName: item.categoryName,
  }));

  return {
    summary: {
      id: collectionId,
      itemCount: items.length,
      cardsOwned: summary.cardsOwned,
      setsRepresented: summary.setsRepresented,
      productsRepresented: summary.productsRepresented,
      favouriteGame: summary.favouriteGame,
      recentAdditions: summary.recentAdditions,
    },
    largestSets,
    wishlistOverlap,
    missingCards,
    recentlyViewed,
    deckCount,
    collectionCount: items.length,
  };
}

async function getSeedCollectionItems(userId: string) {
  const collection = seedCollections.find((entry) => entry.userId === userId);
  if (!collection) {
    return [];
  }

  return seedCollectionItems
    .filter((item) => item.collectionId === collection.id)
    .map((item) => mapSeedCollectionItem({
      ...item,
      createdAt: item.dateAcquired ?? new Date().toISOString(),
      updatedAt: item.dateAcquired ?? new Date().toISOString(),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function getCollectionRecord(userId: string, db = prisma): Promise<CollectionRecord | null> {
  const collection = (await db.collection.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  })) as unknown as CollectionRecord | null;

  return collection;
}

async function ensureCollectionExists(userId: string, db = prisma) {
  const collection = await db.collection.findUnique({ where: { userId } });

  if (collection) {
    return collection;
  }

  return db.collection.create({ data: { userId } });
}

export function calculateCollectionStats(items: CollectionItem[]) {
  return collectionStatsFromItems(items);
}

export async function getCustomerCollectionItems(userId: string, db = prisma): Promise<CollectionItem[]> {
  if (shouldBypassDatabase()) {
    return getSeedCollectionItems(userId);
  }

  try {
    const collection = await getCollectionRecord(userId, db);

    if (!collection) {
      return [];
    }

    return collection.items.map(mapCollectionItemRow);
  } catch (error) {
    if (canUseSeedFallback()) {
      return getSeedCollectionItems(userId);
    }

    throw createCollectionDatabaseError(error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function getCustomerCollectionSummary(userId: string, db = prisma): Promise<CollectionSummary> {
  const items = await getCustomerCollectionItems(userId, db);
  const stats = collectionStatsFromItems(items);
  const collectionId = shouldBypassDatabase()
    ? seedCollections.find((entry) => entry.userId === userId)?.id ?? 'collection-seed'
    : (await db.collection.findUnique({ where: { userId }, select: { id: true } }))?.id ?? 'collection-seed';

  return {
    id: collectionId,
    itemCount: items.length,
    cardsOwned: stats.cardsOwned,
    setsRepresented: stats.setsRepresented,
    productsRepresented: stats.productsRepresented,
    favouriteGame: stats.favouriteGame,
    recentAdditions: stats.recentAdditions,
  };
}

export async function getCustomerCollectionDashboard(userId: string, db = prisma): Promise<CollectionDashboard> {
  const [items, wishlistIds, wishlistItems, deckCount] = await Promise.all([
    getCustomerCollectionItems(userId, db),
    getWishlistProductIds(userId, db),
    getWishlistItems(userId, db),
    shouldBypassDatabase()
      ? Promise.resolve(seedDecks.filter((deck) => deck.userId === userId).length)
      : db.deck.count({ where: { userId } }),
  ]);
  const collectionId = shouldBypassDatabase()
    ? seedCollections.find((entry) => entry.userId === userId)?.id ?? 'collection-seed'
    : (await db.collection.findUnique({ where: { userId }, select: { id: true } }))?.id ?? 'collection-seed';

  return collectionDashboardFromItems(collectionId, items, deckCount, wishlistIds, wishlistItems);
}

export type UpsertCollectionItemInput = {
  productId: string;
  ownedQuantity: number;
  printVariant: CollectionItem['printVariant'];
  condition: CollectionItem['condition'];
  foil: boolean;
  language: string;
  notes?: string | null;
  dateAcquired?: string | null;
  purchasePriceMinor?: number | null;
};

export async function upsertCollectionItem(userId: string, input: UpsertCollectionItemInput, db = prisma) {
  const collection = await ensureCollectionExists(userId, db);
  const product = await db.product.findUnique({
    where: { id: input.productId },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!product) {
    throw new Error('The selected product could not be found.');
  }

  if (input.ownedQuantity < 1) {
    throw new Error('Owned quantity must be at least 1.');
  }

  await db.collectionItem.upsert({
    where: {
      collectionId_productId_printVariant_condition_foil_language: {
        collectionId: collection.id,
        productId: input.productId,
        printVariant: input.printVariant,
        condition: input.condition,
        foil: input.foil,
        language: input.language,
      },
    },
    create: {
      collectionId: collection.id,
      productId: input.productId,
      ownedQuantity: input.ownedQuantity,
      printVariant: input.printVariant,
      condition: input.condition,
      foil: input.foil,
      language: input.language,
      notes: input.notes ?? null,
      dateAcquired: input.dateAcquired ? new Date(input.dateAcquired) : null,
      purchasePriceMinor: input.purchasePriceMinor ?? null,
    },
    update: {
      ownedQuantity: {
        increment: input.ownedQuantity,
      },
      notes: input.notes ?? null,
      ...(input.dateAcquired ? { dateAcquired: new Date(input.dateAcquired) } : {}),
      purchasePriceMinor: input.purchasePriceMinor ?? null,
    },
  });

  return getCustomerCollectionItems(userId, db);
}

export async function updateCollectionItemQuantity(userId: string, itemId: string, ownedQuantity: number, db = prisma) {
  const item = await db.collectionItem.findFirst({
    where: {
      id: itemId,
      collection: {
        userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!item) {
    throw new Error('The selected collection item could not be found.');
  }

  if (ownedQuantity <= 0) {
    await db.collectionItem.delete({ where: { id: itemId } });
    return getCustomerCollectionItems(userId, db);
  }

  await db.collectionItem.update({
    where: { id: itemId },
    data: { ownedQuantity },
  });

  return getCustomerCollectionItems(userId, db);
}

export async function removeCollectionItem(userId: string, itemId: string, db = prisma) {
  const item = await db.collectionItem.findFirst({
    where: {
      id: itemId,
      collection: {
        userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!item) {
    return false;
  }

  await db.collectionItem.delete({ where: { id: itemId } });
  return true;
}

export async function getCollectionImportSuggestions(userId: string, db = prisma): Promise<CatalogueProduct[]> {
  const items = await getCustomerCollectionItems(userId, db);

  return items.slice(0, 4).map((item) => ({
    id: item.productId,
    slug: item.productSlug,
    name: item.productName,
    game: item.game,
    description: item.notes ?? 'Already owned in the collection.',
    categoryName: item.categoryName,
    categorySlug: item.categoryName.toLowerCase().replace(/\s+/g, '-'),
    price: { amountMinor: item.purchasePriceMinor ?? 0, currency: 'GBP' },
    featured: false,
    inStock: true,
    stockOnHand: item.ownedQuantity,
    reservedStock: 0,
    supplierName: 'Collection',
    badge: 'Owned',
    imageLabel: item.setName ?? item.categoryName,
  }));
}
