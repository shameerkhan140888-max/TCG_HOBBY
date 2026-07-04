import type { CollectionItem, DeckDetail, DeckSummary, DeckVisibility } from '@tcg-hobby/types';
import { slugify } from '@tcg-hobby/utils';
import { prisma } from './client';
import { calculateLineTotal } from './commerce';
import { getCustomerCollectionItems } from './collection';
import { seedCategories, seedDeckCards, seedDecks, seedProducts } from './seed-data';

type DeckCardRow = {
  id: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    slug: string;
    name: string;
    game: string;
    priceMinor: number;
    category: {
      name: string;
      slug: string;
    };
  };
};

type DeckRecord = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  game: string;
  ruleProfile: string;
  visibility: DeckVisibility;
  notes: string | null;
  imageLabel: string;
  maxCards: number;
  maxCopiesPerCard: number;
  createdAt: Date;
  updatedAt: Date;
  cards: DeckCardRow[];
};

function canUseSeedFallback() {
  return process.env.NODE_ENV !== 'production';
}

function shouldBypassDatabase() {
  return process.env.TCG_HOBBY_DECK_DATA_SOURCE === 'seed';
}

function createDeckDatabaseError(reason: string) {
  return new Error(`Deck database query failed in production: ${reason}`);
}

function calculateMissingFromCollection(cards: DeckCardRow[], collectionItems: CollectionItem[]) {
  const ownedByProduct = new Map<string, number>();

  for (const item of collectionItems) {
    ownedByProduct.set(item.productId, (ownedByProduct.get(item.productId) ?? 0) + item.ownedQuantity);
  }

  return cards
    .map((card) => {
      const owned = ownedByProduct.get(card.product.id) ?? 0;
      const missingQuantity = Math.max(card.quantity - owned, 0);

      return {
        productId: card.product.id,
        productName: card.product.name,
        missingQuantity,
      };
    })
    .filter((card) => card.missingQuantity > 0);
}

function calculateDeckStats(record: Pick<DeckRecord, 'maxCards' | 'maxCopiesPerCard'>, cards: DeckCardRow[], collectionItems: CollectionItem[]) {
  const cardCount = cards.reduce((sum, card) => sum + card.quantity, 0);
  const uniqueCards = cards.length;
  const totalCostMinor = cards.reduce((sum, card) => sum + calculateLineTotal(card.product.priceMinor, card.quantity), 0);
  const averageCostMinor = cardCount > 0 ? Math.round(totalCostMinor / cardCount) : 0;

  const typeBreakdown = [...cards.reduce((map, card) => {
    map.set(card.product.game, (map.get(card.product.game) ?? 0) + card.quantity);
    return map;
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const categoryBreakdown = [...cards.reduce((map, card) => {
    map.set(card.product.category.name, (map.get(card.product.category.name) ?? 0) + card.quantity);
    return map;
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const curveBreakdown = [
    { label: 'Under GBP 5', count: cards.filter((card) => card.product.priceMinor < 500).reduce((sum, card) => sum + card.quantity, 0) },
    { label: 'GBP 5 - GBP 20', count: cards.filter((card) => card.product.priceMinor >= 500 && card.product.priceMinor < 2000).reduce((sum, card) => sum + card.quantity, 0) },
    { label: 'GBP 20+', count: cards.filter((card) => card.product.priceMinor >= 2000).reduce((sum, card) => sum + card.quantity, 0) },
  ];

  const warnings: string[] = [];
  if (cardCount > record.maxCards) {
    warnings.push(`Deck is over the maximum size by ${cardCount - record.maxCards} cards.`);
  }

  for (const card of cards) {
    if (card.quantity > record.maxCopiesPerCard) {
      warnings.push(`${card.product.name} exceeds the duplicate limit of ${record.maxCopiesPerCard}.`);
    }
  }

  const missingCardsFromCollection = calculateMissingFromCollection(cards, collectionItems);
  if (missingCardsFromCollection.length) {
    warnings.push(`${missingCardsFromCollection.length} cards are missing from your collection.`);
  }

  const completionPercent = record.maxCards > 0 ? Math.min(100, Math.round((cardCount / record.maxCards) * 100)) : 0;

  return {
    cardCount,
    uniqueCards,
    typeBreakdown,
    categoryBreakdown,
    curveBreakdown,
    averageCostMinor,
    warnings,
    completionPercent,
    missingCardsFromCollection,
  };
}

function mapDeckCardRow(row: DeckCardRow) {
  return {
    id: row.id,
    productId: row.product.id,
    productName: row.product.name,
    productSlug: row.product.slug,
    game: row.product.game,
    categoryName: row.product.category.name,
    quantity: row.quantity,
    unitPriceMinor: row.product.priceMinor,
    lineTotalMinor: calculateLineTotal(row.product.priceMinor, row.quantity),
  };
}

function mapDeckRecord(record: DeckRecord, collectionItems: CollectionItem[]): DeckDetail {
  const cards = record.cards.map(mapDeckCardRow);
  const stats = calculateDeckStats(record, record.cards, collectionItems);

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    game: record.game,
    visibility: record.visibility,
    imageLabel: record.imageLabel,
    cardCount: stats.cardCount,
    uniqueCards: stats.uniqueCards,
    maxCards: record.maxCards,
    maxCopiesPerCard: record.maxCopiesPerCard,
    updatedAt: record.updatedAt.toISOString(),
    notes: record.notes,
    cards,
    stats,
  };
}

function mapDeckSummary(record: Pick<DeckRecord, 'id' | 'name' | 'slug' | 'game' | 'visibility' | 'imageLabel' | 'maxCards' | 'maxCopiesPerCard' | 'updatedAt' | 'cards'>): DeckSummary {
  const cardCount = record.cards.reduce((sum, card) => sum + card.quantity, 0);

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    game: record.game,
    visibility: record.visibility,
    imageLabel: record.imageLabel,
    cardCount,
    uniqueCards: record.cards.length,
    maxCards: record.maxCards,
    maxCopiesPerCard: record.maxCopiesPerCard,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function findSeedDeck(userId: string, deckId?: string) {
  return seedDecks.find((deck) => deck.userId === userId && (!deckId || deck.id === deckId)) ?? null;
}

function getSeedDeckRecord(userId: string, deckId?: string): DeckRecord | null {
  const deck = findSeedDeck(userId, deckId);
  if (!deck) {
    return null;
  }

  const cards = seedDeckCards
    .filter((card) => card.deckId === deck.id)
    .map((card) => {
      const product = seedProducts.find((entry) => entry.slug === card.productSlug);
      const category = product ? seedCategories.find((entry) => entry.slug === product.categorySlug) : null;

      if (!product || !category) {
        throw new Error(`Missing seed product for deck card ${card.id}`);
      }

      return {
        id: card.id,
        quantity: card.quantity,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          game: product.game,
          priceMinor: product.priceMinor,
          category: {
            name: category.name,
            slug: category.slug,
          },
        },
      };
    });

  return {
    ...deck,
    ruleProfile: 'CUSTOM',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    cards,
  };
}

async function getDeckRecord(userId: string, deckId: string, db = prisma): Promise<DeckRecord | null> {
  const deck = (await db.deck.findFirst({
    where: {
      id: deckId,
      userId,
    },
    include: {
      cards: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  })) as unknown as DeckRecord | null;

  return deck;
}

async function ensureDeckExists(userId: string, name: string, db = prisma, excludeDeckId?: string) {
  const baseSlug = slugify(name);
  let candidate = baseSlug;
  let index = 2;

  while (
    await db.deck.findFirst({
      where: {
        userId,
        slug: candidate,
        ...(excludeDeckId ? { NOT: { id: excludeDeckId } } : {}),
      },
    })
  ) {
    candidate = `${baseSlug}-${index}`;
    index += 1;
  }

  return { slug: candidate };
}

export function generateDeckSlug(name: string) {
  return slugify(name);
}

export function validateDeckCardQuantity(quantity: number, maxCopiesPerCard: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false as const, message: 'Quantity must be at least 1.' };
  }

  if (quantity > maxCopiesPerCard) {
    return {
      ok: false as const,
      message: `You can include at most ${maxCopiesPerCard} copies of a single card.`,
    };
  }

  return { ok: true as const };
}

export function calculateDeckStatistics(record: Pick<DeckRecord, 'maxCards' | 'maxCopiesPerCard'>, cards: DeckCardRow[], collectionItems: CollectionItem[]) {
  return calculateDeckStats(record, cards, collectionItems);
}

export async function getCustomerDecks(userId: string, db = prisma): Promise<DeckSummary[]> {
  if (shouldBypassDatabase()) {
    return seedDecks
      .filter((deck) => deck.userId === userId)
      .map((deck) => {
        const record = getSeedDeckRecord(userId, deck.id);
        return record ? mapDeckSummary(record) : null;
      })
      .filter((deck): deck is DeckSummary => Boolean(deck));
  }

  try {
    const decks = (await db.deck.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        cards: true,
      },
    })) as unknown as DeckRecord[];

    return decks.map((deck) => mapDeckSummary(deck));
  } catch (error) {
    if (canUseSeedFallback()) {
      return seedDecks
        .filter((deck) => deck.userId === userId)
        .map((deck) => {
          const record = getSeedDeckRecord(userId, deck.id);
          return record ? mapDeckSummary(record) : null;
        })
        .filter((deck): deck is DeckSummary => Boolean(deck));
    }

    throw createDeckDatabaseError(error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function getCustomerDeckById(userId: string, deckId: string, db = prisma): Promise<DeckDetail | null> {
  if (shouldBypassDatabase()) {
    const deck = getSeedDeckRecord(userId, deckId);
    return deck ? mapDeckRecord(deck, await getCustomerCollectionItems(userId, db)) : null;
  }

  try {
    const deck = await getDeckRecord(userId, deckId, db);
    if (!deck) {
      return null;
    }

    const collectionItems = await getCustomerCollectionItems(userId, db);
    return mapDeckRecord(deck, collectionItems);
  } catch (error) {
    if (canUseSeedFallback()) {
      const deck = getSeedDeckRecord(userId, deckId);
      return deck ? mapDeckRecord(deck, await getCustomerCollectionItems(userId, db)) : null;
    }

    throw createDeckDatabaseError(error instanceof Error ? error.message : 'Unknown error');
  }
}

export type CreateDeckInput = {
  name: string;
  game: string;
  notes?: string | null;
  visibility?: DeckVisibility;
  imageLabel?: string;
  maxCards?: number;
  maxCopiesPerCard?: number;
};

export async function createDeck(userId: string, input: CreateDeckInput, db = prisma) {
  if (!input.name.trim()) {
    throw new Error('Deck name is required.');
  }

  if (!input.game.trim()) {
    throw new Error('Deck game is required.');
  }

  const { slug } = await ensureDeckExists(userId, input.name, db);

  const deck = await db.deck.create({
    data: {
      userId,
      name: input.name.trim(),
      slug,
      game: input.game.trim(),
      notes: input.notes?.trim() ? input.notes.trim() : null,
      imageLabel: input.imageLabel?.trim() || 'Deck stack',
      visibility: input.visibility ?? 'PRIVATE',
      maxCards: input.maxCards ?? 60,
      maxCopiesPerCard: input.maxCopiesPerCard ?? 4,
    },
  });

  return deck;
}

export async function updateDeckDetails(
  userId: string,
  deckId: string,
  input: Partial<Pick<CreateDeckInput, 'name' | 'game' | 'notes' | 'visibility' | 'imageLabel' | 'maxCards' | 'maxCopiesPerCard'>>,
  db = prisma,
) {
  const deck = await db.deck.findFirst({
    where: { id: deckId, userId },
    select: { id: true, name: true, slug: true },
  });

  if (!deck) {
    throw new Error('The selected deck could not be found.');
  }

  let slug = deck.slug;
  if (input.name && input.name.trim() !== deck.name) {
    slug = await ensureDeckExists(userId, input.name, db, deckId).then((result) => result.slug);
  }

  await db.deck.update({
    where: { id: deckId },
    data: {
      ...(input.name ? { name: input.name.trim(), slug } : {}),
      ...(input.game ? { game: input.game.trim() } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() ? input.notes.trim() : null } : {}),
      ...(input.visibility ? { visibility: input.visibility } : {}),
      ...(input.imageLabel ? { imageLabel: input.imageLabel.trim() } : {}),
      ...(input.maxCards !== undefined ? { maxCards: input.maxCards } : {}),
      ...(input.maxCopiesPerCard !== undefined ? { maxCopiesPerCard: input.maxCopiesPerCard } : {}),
    },
  });

  return getCustomerDeckById(userId, deckId, db);
}

export async function addCardToDeck(userId: string, deckId: string, productId: string, quantity = 1, db = prisma) {
  const deck = await db.deck.findFirst({
    where: { id: deckId, userId },
    include: { cards: true },
  });

  if (!deck) {
    throw new Error('The selected deck could not be found.');
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      name: true,
      priceMinor: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error('The selected product could not be found.');
  }

  const validation = validateDeckCardQuantity(quantity, deck.maxCopiesPerCard);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const currentCount = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  const existing = deck.cards.find((card) => card.productId === productId)?.quantity ?? 0;
  const nextQuantity = existing + quantity;
  if (nextQuantity > deck.maxCopiesPerCard) {
    throw new Error(`You can include at most ${deck.maxCopiesPerCard} copies of a single card.`);
  }

  if (currentCount + quantity > deck.maxCards) {
    throw new Error(`The deck can contain at most ${deck.maxCards} cards.`);
  }

  await db.deckCard.upsert({
    where: {
      deckId_productId: {
        deckId,
        productId,
      },
    },
    create: {
      deckId,
      productId,
      quantity,
    },
    update: {
      quantity: nextQuantity,
    },
  });

  return getCustomerDeckById(userId, deckId, db);
}

export async function updateDeckCardQuantity(userId: string, deckId: string, productId: string, quantity: number, db = prisma) {
  const deck = await db.deck.findFirst({
    where: { id: deckId, userId },
    include: { cards: true },
  });

  if (!deck) {
    throw new Error('The selected deck could not be found.');
  }

  const card = deck.cards.find((entry) => entry.productId === productId);
  if (!card) {
    throw new Error('The selected card could not be found.');
  }

  if (quantity <= 0) {
    await db.deckCard.deleteMany({ where: { deckId, productId } });
    return getCustomerDeckById(userId, deckId, db);
  }

  const validation = validateDeckCardQuantity(quantity, deck.maxCopiesPerCard);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const nextCardCount = deck.cards.reduce((sum, entry) => sum + entry.quantity, 0) - card.quantity + quantity;
  if (nextCardCount > deck.maxCards) {
    throw new Error(`The deck can contain at most ${deck.maxCards} cards.`);
  }

  await db.deckCard.update({
    where: {
      deckId_productId: {
        deckId,
        productId,
      },
    },
    data: {
      quantity,
    },
  });

  return getCustomerDeckById(userId, deckId, db);
}

export async function removeDeckCard(userId: string, deckId: string, productId: string, db = prisma) {
  const card = await db.deckCard.findFirst({
    where: {
      deckId,
      productId,
      deck: { userId },
    },
    select: { id: true },
  });

  if (!card) {
    return false;
  }

  await db.deckCard.delete({ where: { deckId_productId: { deckId, productId } } });
  return true;
}
