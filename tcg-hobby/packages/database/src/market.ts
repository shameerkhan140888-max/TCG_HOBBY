import type {
  CollectionInsightSnapshot,
  CollectionInsights,
  MarketSnapshot,
  MarketTrend,
  NotificationCenterPreference,
  NotificationType,
  PriceHistoryPoint,
  WatchlistItem,
  WatchlistSubjectType,
} from '@tcg-hobby/types';
import { prisma } from './client';
import { calculateCollectionStats, getCustomerCollectionItems } from './collection';
import { getCustomerDecks } from './deck';
import { getWishlistProductIds } from './wishlist';
import { seedCollectionInsightSnapshots, seedMarketSnapshots, seedNotificationCenterPreferences, seedProducts, seedReleases, seedWatchlistItems } from './seed-data';

type MarketSnapshotRow = {
  id: string;
  productId: string;
  currentEstimateMinor: number;
  yesterdayMinor: number;
  sevenDayMinor: number;
  thirtyDayMinor: number;
  trend: MarketTrend;
  confidenceScore: number;
  lastUpdatedAt: Date;
  source: string;
  currency: string;
  product: {
    id: string;
    slug: string;
    name: string;
    game: string;
    priceMinor: number;
    category: { name: string; slug: string };
  };
  history: Array<{ label: string; valueMinor: number; recordedAt: Date; createdAt: Date }>;
};

type WatchlistRow = {
  id: string;
  subjectType: WatchlistSubjectType;
  subjectKey: string;
  productId: string | null;
  releaseId: string | null;
  collectionItemId: string | null;
  notificationType: NotificationType;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  marketSnapshot: MarketSnapshotRow | null;
  product: MarketSnapshotRow['product'] | null;
  release: {
    id: string;
    name: string;
    slug: string;
    brand: string;
    game: string;
    releaseDate: Date;
    products: Array<{
      product: MarketSnapshotRow['product'];
      status: string;
      allocationLimit: number | null;
      allocatedQuantity: number;
      lowAllocationThreshold: number | null;
      availabilityMessage: string | null;
    }>;
  } | null;
  collectionItem: {
    id: string;
    ownedQuantity: number;
    createdAt: Date;
    updatedAt: Date;
    product: MarketSnapshotRow['product'];
  } | null;
};

type NotificationCenterPreferenceRow = {
  id: string;
  notificationType: NotificationType;
  subjectType: WatchlistSubjectType | null;
  subjectLabel: string | null;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CollectionInsightRow = {
  id: string;
  userId: string;
  collectionId: string;
  estimatedValueMinor: number;
  previousValueMinor: number;
  sevenDayValueMinor: number;
  thirtyDayValueMinor: number;
  collectionHealthScore: number;
  cardsOwned: number;
  setsOwned: number;
  favouriteGame: string;
  wishlistOverlapCount: number;
  deckCompletionPercent: number;
  recentGrowthMinor: number;
  heatMap: unknown;
  recentActivity: unknown;
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type InsightContext = {
  snapshot: CollectionInsightRow | null;
  items: Awaited<ReturnType<typeof getCustomerCollectionItems>>;
  marketSnapshots: MarketSnapshot[];
  wishlistIds: string[];
  decks: Awaited<ReturnType<typeof getCustomerDecks>>;
};

function canUseSeedFallback() {
  return process.env.NODE_ENV !== 'production';
}

function shouldBypassDatabase() {
  return process.env.TCG_HOBBY_MARKET_DATA_SOURCE === 'seed';
}

function createMarketDatabaseError(reason: string) {
  return new Error(`Market data is unavailable in production: ${reason}`);
}

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.toISOString();
}

function toMarketTrend(currentMinor: number, baselineMinor: number): MarketTrend {
  if (baselineMinor <= 0) {
    return currentMinor === 0 ? 'FLAT' : 'UP';
  }

  const deltaPercent = ((currentMinor - baselineMinor) / baselineMinor) * 100;

  if (Math.abs(deltaPercent) < 1) {
    return 'FLAT';
  }

  if (Math.abs(deltaPercent) > 12) {
    return 'VOLATILE';
  }

  return deltaPercent > 0 ? 'UP' : 'DOWN';
}

function uniqueByProduct(items: Array<{ productId: string; productName: string; productSlug: string; game: string; categoryName: string; currentEstimateMinor: number; trend: MarketTrend; lastUpdatedAt: string }>) {
  return [...items].sort((a, b) => b.currentEstimateMinor - a.currentEstimateMinor);
}

function buildHeatMap(items: Awaited<ReturnType<typeof getCustomerCollectionItems>>) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.game, (counts.get(item.game) ?? 0) + item.ownedQuantity);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

function calculateDeckCompletionPercent(decks: Awaited<ReturnType<typeof getCustomerDecks>>) {
  if (!decks.length) {
    return 0;
  }

  const totalCompletion = decks.reduce((sum, deck) => sum + Math.round((deck.cardCount / Math.max(deck.maxCards, 1)) * 100), 0);
  return Math.min(100, Math.round(totalCompletion / decks.length));
}

function mapMarketSnapshotRow(row: MarketSnapshotRow): MarketSnapshot {
  return {
    id: row.id,
    productId: row.product.id,
    productName: row.product.name,
    productSlug: row.product.slug,
    currentEstimateMinor: row.currentEstimateMinor,
    yesterdayMinor: row.yesterdayMinor,
    sevenDayMinor: row.sevenDayMinor,
    thirtyDayMinor: row.thirtyDayMinor,
    trend: row.trend,
    confidenceScore: row.confidenceScore,
    lastUpdatedAt: row.lastUpdatedAt.toISOString(),
    source: row.source,
    currency: row.currency as MarketSnapshot['currency'],
    history: row.history.map((entry) => ({
      label: entry.label,
      valueMinor: entry.valueMinor,
      recordedAt: entry.recordedAt.toISOString(),
      source: row.source,
    })),
  };
}

function mapNotificationPreferenceRow(row: NotificationCenterPreferenceRow): NotificationCenterPreference {
  return {
    id: row.id,
    notificationType: row.notificationType,
    subjectType: row.subjectType,
    subjectLabel: row.subjectLabel,
    emailEnabled: row.emailEnabled,
    pushEnabled: row.pushEnabled,
    inAppEnabled: row.inAppEnabled,
    lastTriggeredAt: toIso(row.lastTriggeredAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSeedMarketSnapshot(seed: (typeof seedMarketSnapshots)[number]): MarketSnapshot {
  const product = seedProducts.find((entry) => entry.slug === seed.productSlug);
  if (!product) {
    throw new Error(`Missing product for seed market snapshot ${seed.id}`);
  }

  return {
    id: seed.id,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    currentEstimateMinor: seed.currentEstimateMinor,
    yesterdayMinor: seed.yesterdayMinor,
    sevenDayMinor: seed.sevenDayMinor,
    thirtyDayMinor: seed.thirtyDayMinor,
    trend: seed.trend,
    confidenceScore: seed.confidenceScore,
    lastUpdatedAt: seed.lastUpdatedAt,
    source: seed.source,
    currency: 'GBP',
    history: seed.history.map((entry) => ({
      label: entry.label,
      valueMinor: entry.valueMinor,
      recordedAt: entry.recordedAt,
      source: seed.source,
    })),
  };
}

function buildMarketEstimateRows(items: Awaited<ReturnType<typeof getCustomerCollectionItems>>, marketSnapshots: MarketSnapshot[]) {
  const marketByProductId = new Map(marketSnapshots.map((snapshot) => [snapshot.productId, snapshot]));

  return items.map((item) => {
    const market = marketByProductId.get(item.productId);
    const currentEstimateMinor = market?.currentEstimateMinor ?? item.purchasePriceMinor ?? 0;
    const trend = market?.trend ?? 'FLAT';

    return {
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      game: item.game,
      categoryName: item.categoryName,
      currentEstimateMinor: currentEstimateMinor * item.ownedQuantity,
      trend,
      lastUpdatedAt: market?.lastUpdatedAt ?? item.updatedAt,
      source: market?.source ?? 'Collection snapshot',
    };
  });
}

function calculateInsights(context: InsightContext): CollectionInsights {
  const stats = calculateCollectionStats(context.items);
  const totalCurrentValue = context.items.reduce((sum, item) => {
    const market = context.marketSnapshots.find((snapshot) => snapshot.productId === item.productId);
    return sum + ((market?.currentEstimateMinor ?? item.purchasePriceMinor ?? 0) * item.ownedQuantity);
  }, 0);
  const previousValueMinor = context.snapshot?.previousValueMinor ?? Math.round(totalCurrentValue * 0.96);
  const sevenDayValueMinor = context.snapshot?.sevenDayValueMinor ?? Math.round(totalCurrentValue * 0.98);
  const thirtyDayValueMinor = context.snapshot?.thirtyDayValueMinor ?? Math.round(totalCurrentValue * 0.93);
  const estimatedValueMinor = context.snapshot?.estimatedValueMinor ?? totalCurrentValue;
  const wishlistOverlap = context.items
    .filter((item) => context.wishlistIds.includes(item.productId))
    .map((item) => {
      const market = context.marketSnapshots.find((snapshot) => snapshot.productId === item.productId);
      return {
        id: item.id,
        productName: item.productName,
        productSlug: item.productSlug,
        estimateMinor: (market?.currentEstimateMinor ?? item.purchasePriceMinor ?? 0) * item.ownedQuantity,
        trend: market?.trend ?? 'FLAT',
      };
    });

  const valuedCards = buildMarketEstimateRows(context.items, context.marketSnapshots);
  const mostValuableCards = uniqueByProduct(valuedCards)
    .slice(0, 5)
    .map((item) => ({
      id: item.productId,
      name: item.productName,
      slug: item.productSlug,
      game: item.game,
      categoryName: item.categoryName,
      estimateMinor: item.currentEstimateMinor,
      trend: item.trend,
      lastUpdatedAt: item.lastUpdatedAt,
    }));

  const gainRows = uniqueByProduct(valuedCards)
    .map((item) => {
      const market = context.marketSnapshots.find((snapshot) => snapshot.productId === item.productId);
      const delta = item.currentEstimateMinor - ((market?.thirtyDayMinor ?? item.currentEstimateMinor) * 1);
      const trend: MarketTrend = delta >= 0 ? 'UP' : 'DOWN';
      return {
        id: item.productId,
        name: item.productName,
        slug: item.productSlug,
        game: item.game,
        categoryName: item.categoryName,
        estimateMinor: item.currentEstimateMinor,
        trend,
        lastUpdatedAt: item.lastUpdatedAt,
        delta,
      };
    })
    .sort((a, b) => b.delta - a.delta);

  const biggestGainers = gainRows.filter((item) => item.delta > 0).slice(0, 5);
  const biggestDecliners = gainRows.filter((item) => item.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);

  const recentMarketActivity = [...valuedCards].sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt)).slice(0, 5).map((item) => ({
    id: item.productId,
    name: item.productName,
    slug: item.productSlug,
    game: item.game,
    categoryName: item.categoryName,
    estimateMinor: item.currentEstimateMinor,
    trend: item.trend,
    lastUpdatedAt: item.lastUpdatedAt,
  }));

  const valueTrendPercent = previousValueMinor > 0 ? Math.round(((estimatedValueMinor - previousValueMinor) / previousValueMinor) * 100) : 0;
  const collectionHealthScore = context.snapshot?.collectionHealthScore ?? Math.min(100, Math.max(40, 55 + context.items.length * 4 + context.wishlistIds.length * 2 + context.decks.length * 3));
  const heatMap =
    context.snapshot?.heatMap && typeof context.snapshot.heatMap === 'object'
      ? (context.snapshot.heatMap as Record<string, number>)
      : Object.fromEntries(buildHeatMap(context.items).map((entry) => [entry.label, entry.count]));
  const recentActivity =
    context.snapshot?.recentActivity && Array.isArray(context.snapshot.recentActivity)
      ? (context.snapshot.recentActivity as Array<{ label: string; value: string }>)
      : context.items.slice(0, 4).map((item) => ({ label: item.productName, value: item.categoryName }));

  return {
    id: context.snapshot?.id ?? 'insight-computed',
    userId: context.snapshot?.userId ?? 'unknown',
    collectionId: context.snapshot?.collectionId ?? 'unknown',
    estimatedValueMinor,
    previousValueMinor,
    sevenDayValueMinor,
    thirtyDayValueMinor,
    collectionHealthScore,
    cardsOwned: context.snapshot?.cardsOwned ?? stats.cardsOwned,
    setsOwned: context.snapshot?.setsOwned ?? stats.setsRepresented,
    favouriteGame: context.snapshot?.favouriteGame ?? stats.favouriteGame,
    wishlistOverlapCount: context.snapshot?.wishlistOverlapCount ?? wishlistOverlap.length,
    deckCompletionPercent: context.snapshot?.deckCompletionPercent ?? calculateDeckCompletionPercent(context.decks),
    recentGrowthMinor: context.snapshot?.recentGrowthMinor ?? estimatedValueMinor - thirtyDayValueMinor,
    heatMap,
    recentActivity,
    lastUpdatedAt: context.snapshot?.lastUpdatedAt.toISOString() ?? new Date().toISOString(),
    createdAt: context.snapshot?.createdAt.toISOString() ?? new Date().toISOString(),
    updatedAt: context.snapshot?.updatedAt.toISOString() ?? new Date().toISOString(),
    mostValuableCards,
    biggestGainers,
    biggestDecliners,
    recentMarketActivity,
    wishlistOverlap,
    collectionHeatMap: buildHeatMap(context.items),
    valueTrendPercent,
  };
}

async function loadMarketSnapshotsFromDatabase(productIds: string[] = [], db = prisma): Promise<MarketSnapshot[]> {
  const rows = (await db.marketSnapshot.findMany({
    ...(productIds.length ? { where: { productId: { in: productIds } } } : {}),
    include: {
      product: {
        include: {
          category: true,
        },
      },
      history: {
        orderBy: { recordedAt: 'asc' },
      },
    },
    orderBy: [{ lastUpdatedAt: 'desc' }],
  })) as unknown as MarketSnapshotRow[];

  return rows.map(mapMarketSnapshotRow);
}

async function loadCollectionInsightSnapshotFromDatabase(userId: string, db = prisma): Promise<CollectionInsightRow | null> {
  const row = (await db.collectionInsightSnapshot.findUnique({
    where: { userId },
  })) as unknown as CollectionInsightRow | null;

  return row as CollectionInsightRow | null;
}

async function loadNotificationPreferencesFromDatabase(userId: string, db = prisma): Promise<NotificationCenterPreference[]> {
  const rows = (await db.notificationCenterPreference.findMany({
    where: { userId },
    orderBy: [{ notificationType: 'asc' }, { subjectLabel: 'asc' }],
  })) as unknown as NotificationCenterPreferenceRow[];

  return rows.map(mapNotificationPreferenceRow);
}

async function loadWatchlistFromDatabase(userId: string, db = prisma): Promise<WatchlistItem[]> {
  const rows = (await db.watchlistItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      release: {
        include: {
          products: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      collectionItem: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
      marketSnapshot: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
          history: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  })) as unknown as WatchlistRow[];

  return rows.map((row) => {
    const product = row.product ?? row.release?.products[0]?.product ?? row.collectionItem?.product ?? row.marketSnapshot?.product ?? null;
    const marketSnapshot = row.marketSnapshot ?? null;
    const currentEstimateMinor = marketSnapshot?.currentEstimateMinor ?? product?.priceMinor ?? 0;
    const trend = marketSnapshot?.trend ?? (marketSnapshot ? toMarketTrend(marketSnapshot.currentEstimateMinor, marketSnapshot.thirtyDayMinor) : 'FLAT');

    return {
      id: row.id,
      subjectType: row.subjectType,
      subjectKey: row.subjectKey,
      subjectLabel: product?.name ?? row.release?.name ?? row.collectionItem?.product.name ?? row.subjectKey,
      productId: row.productId,
      releaseId: row.releaseId,
      collectionItemId: row.collectionItemId,
      currentEstimateMinor,
      yesterdayMinor: marketSnapshot?.yesterdayMinor ?? currentEstimateMinor,
      sevenDayMinor: marketSnapshot?.sevenDayMinor ?? currentEstimateMinor,
      thirtyDayMinor: marketSnapshot?.thirtyDayMinor ?? currentEstimateMinor,
      trend,
      notificationType: row.notificationType,
      emailEnabled: row.emailEnabled,
      pushEnabled: row.pushEnabled,
      inAppEnabled: row.inAppEnabled,
      note: row.note,
      lastUpdatedAt: marketSnapshot?.lastUpdatedAt.toISOString() ?? row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

function getSeedMarketSnapshotsForProductIds(productIds: string[] = []) {
  return seedMarketSnapshots
    .filter((snapshot) => (productIds.length ? productIds.includes(seedProducts.find((product) => product.slug === snapshot.productSlug)?.id ?? '') : true))
    .map(mapSeedMarketSnapshot);
}

function getSeedCollectionInsightSnapshot(userId: string): CollectionInsightSnapshot | null {
  const snapshot = seedCollectionInsightSnapshots.find((entry) => entry.userId === userId);
  if (!snapshot) {
    return null;
  }

  return {
    id: snapshot.id,
    userId: snapshot.userId,
    collectionId: snapshot.collectionId,
    estimatedValueMinor: snapshot.estimatedValueMinor,
    previousValueMinor: snapshot.previousValueMinor,
    sevenDayValueMinor: snapshot.sevenDayValueMinor,
    thirtyDayValueMinor: snapshot.thirtyDayValueMinor,
    collectionHealthScore: snapshot.collectionHealthScore,
    cardsOwned: snapshot.cardsOwned,
    setsOwned: snapshot.setsOwned,
    favouriteGame: snapshot.favouriteGame,
    wishlistOverlapCount: snapshot.wishlistOverlapCount,
    deckCompletionPercent: snapshot.deckCompletionPercent,
    recentGrowthMinor: snapshot.recentGrowthMinor,
    heatMap: snapshot.heatMap,
    recentActivity: snapshot.recentActivity,
    lastUpdatedAt: snapshot.lastUpdatedAt,
    createdAt: snapshot.lastUpdatedAt,
    updatedAt: snapshot.lastUpdatedAt,
  };
}

function getSeedWatchlistItems(userId: string): WatchlistItem[] {
  return seedWatchlistItems
    .filter((item) => item.userId === userId)
    .map((item) => {
      const product = item.productSlug ? seedProducts.find((entry) => entry.slug === item.productSlug) : null;
      const release = item.releaseSlug ? seedReleases.find((entry) => entry.slug === item.releaseSlug) : null;
      const productMarket = product ? seedMarketSnapshots.find((entry) => entry.productSlug === product.slug) : null;
      const subjectLabel = product?.name ?? release?.name ?? item.subjectKey;

      return {
        id: item.id,
        subjectType: item.subjectType,
        subjectKey: item.subjectKey,
        subjectLabel,
        productId: product?.id ?? null,
        releaseId: release?.id ?? null,
        collectionItemId: item.collectionItemId ?? null,
        currentEstimateMinor: productMarket?.currentEstimateMinor ?? product?.priceMinor ?? 0,
        yesterdayMinor: productMarket?.yesterdayMinor ?? product?.priceMinor ?? 0,
        sevenDayMinor: productMarket?.sevenDayMinor ?? product?.priceMinor ?? 0,
        thirtyDayMinor: productMarket?.thirtyDayMinor ?? product?.priceMinor ?? 0,
        trend: productMarket?.trend ?? 'FLAT',
        notificationType: item.notificationType,
        emailEnabled: item.emailEnabled,
        pushEnabled: item.pushEnabled,
        inAppEnabled: item.inAppEnabled,
        note: item.note,
        lastUpdatedAt: productMarket?.lastUpdatedAt ?? new Date().toISOString(),
        createdAt: productMarket?.lastUpdatedAt ?? new Date().toISOString(),
        updatedAt: productMarket?.lastUpdatedAt ?? new Date().toISOString(),
      };
    });
}

function getSeedNotificationPreferences(userId: string): NotificationCenterPreference[] {
  return seedNotificationCenterPreferences
    .filter((item) => item.userId === userId)
    .map((item) => ({
      id: item.id,
      notificationType: item.notificationType,
      subjectType: item.subjectType,
      subjectLabel: item.subjectLabel,
      emailEnabled: item.emailEnabled,
      pushEnabled: item.pushEnabled,
      inAppEnabled: item.inAppEnabled,
      lastTriggeredAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
}

async function loadMarketSnapshotsWithFallback(productIds: string[] = [], db = prisma): Promise<MarketSnapshot[]> {
  if (shouldBypassDatabase()) {
    return getSeedMarketSnapshotsForProductIds(productIds);
  }

  try {
    return await loadMarketSnapshotsFromDatabase(productIds, db);
  } catch (error) {
    if (canUseSeedFallback()) {
      return getSeedMarketSnapshotsForProductIds(productIds);
    }

    throw createMarketDatabaseError(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function loadCollectionInsightSnapshotWithFallback(userId: string, db = prisma): Promise<CollectionInsightRow | null> {
  if (shouldBypassDatabase()) {
    return getSeedCollectionInsightSnapshot(userId) as unknown as CollectionInsightRow | null;
  }

  try {
    return await loadCollectionInsightSnapshotFromDatabase(userId, db);
  } catch (error) {
    if (canUseSeedFallback()) {
      return getSeedCollectionInsightSnapshot(userId) as unknown as CollectionInsightRow | null;
    }

    throw createMarketDatabaseError(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function loadWatchlistWithFallback(userId: string, db = prisma) {
  if (shouldBypassDatabase()) {
    return getSeedWatchlistItems(userId);
  }

  try {
    return await loadWatchlistFromDatabase(userId, db);
  } catch (error) {
    if (canUseSeedFallback()) {
      return getSeedWatchlistItems(userId);
    }

    throw createMarketDatabaseError(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function loadNotificationPreferencesWithFallback(userId: string, db = prisma) {
  if (shouldBypassDatabase()) {
    return getSeedNotificationPreferences(userId);
  }

  try {
    return await loadNotificationPreferencesFromDatabase(userId, db);
  } catch (error) {
    if (canUseSeedFallback()) {
      return getSeedNotificationPreferences(userId);
    }

    throw createMarketDatabaseError(error instanceof Error ? error.message : 'Unknown error');
  }
}

export interface MarketPriceProvider {
  getMarketSnapshot(productId: string): Promise<MarketSnapshot | null>;
  listMarketSnapshots(productIds?: string[]): Promise<MarketSnapshot[]>;
  getMarketHistory(productId: string): Promise<PriceHistoryPoint[]>;
}

export interface CollectionInsightsService {
  getCollectionInsights(userId: string): Promise<CollectionInsights>;
}

export interface MarketValueService extends MarketPriceProvider, CollectionInsightsService {
  getWatchlist(userId: string): Promise<WatchlistItem[]>;
  toggleWatchlistItem(userId: string, input: WatchlistItemInput): Promise<{ watchlisted: boolean; item: WatchlistItem | null }>;
}

export type WatchlistItemInput = {
  subjectType: WatchlistSubjectType;
  subjectKey: string;
  subjectLabel: string;
  productId?: string | null;
  releaseId?: string | null;
  collectionItemId?: string | null;
  notificationType?: NotificationType;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  note?: string | null;
};

export async function getMarketSnapshot(productId: string, db = prisma): Promise<MarketSnapshot | null> {
  const snapshots = await loadMarketSnapshotsWithFallback([productId], db);
  return snapshots.find((snapshot) => snapshot.productId === productId) ?? null;
}

export async function getMarketHistory(productId: string, db = prisma): Promise<PriceHistoryPoint[]> {
  const snapshot = await getMarketSnapshot(productId, db);
  return snapshot?.history ?? [];
}

export async function getMarketSnapshots(productIds: string[] = [], db = prisma): Promise<MarketSnapshot[]> {
  return loadMarketSnapshotsWithFallback(productIds, db);
}

export async function getCollectionInsights(userId: string, db = prisma): Promise<CollectionInsights> {
  const [snapshot, items, wishlistIds, decks, marketSnapshots] = await Promise.all([
    loadCollectionInsightSnapshotWithFallback(userId, db),
    getCustomerCollectionItems(userId, db),
    getWishlistProductIds(userId, db),
    getCustomerDecks(userId, db),
    loadMarketSnapshotsWithFallback([], db),
  ]);

  const insight = calculateInsights({
    snapshot,
    items,
    marketSnapshots,
    wishlistIds,
    decks,
  });

  return {
    ...insight,
  };
}

export async function getWatchlist(userId: string, db = prisma): Promise<WatchlistItem[]> {
  return loadWatchlistWithFallback(userId, db);
}

export async function getNotificationCenterPreferences(userId: string, db = prisma): Promise<NotificationCenterPreference[]> {
  return loadNotificationPreferencesWithFallback(userId, db);
}

export async function toggleWatchlistItem(userId: string, input: WatchlistItemInput, db = prisma) {
  const existing = await db.watchlistItem.findUnique({
    where: {
      userId_subjectType_subjectKey: {
        userId,
        subjectType: input.subjectType,
        subjectKey: input.subjectKey,
      },
    },
    include: {
      marketSnapshot: true,
      product: true,
      release: true,
      collectionItem: true,
    },
  });

  if (existing) {
    await db.watchlistItem.delete({
      where: {
        userId_subjectType_subjectKey: {
          userId,
          subjectType: input.subjectType,
          subjectKey: input.subjectKey,
        },
      },
    });

    return { watchlisted: false, item: null };
  }

  const marketSnapshot = input.productId
    ? await db.marketSnapshot.findUnique({ where: { productId: input.productId } })
    : null;

  const created = await db.watchlistItem.create({
    data: {
      userId,
      subjectType: input.subjectType,
      subjectKey: input.subjectKey,
      productId: input.productId ?? null,
      releaseId: input.releaseId ?? null,
      collectionItemId: input.collectionItemId ?? null,
      marketSnapshotId: marketSnapshot?.id ?? null,
      notificationType: input.notificationType ?? 'PRICE_MOVEMENT',
      emailEnabled: input.emailEnabled ?? true,
      pushEnabled: input.pushEnabled ?? false,
      inAppEnabled: input.inAppEnabled ?? true,
      note: input.note ?? null,
    },
  });

  return {
    watchlisted: true,
    item: {
      id: created.id,
      subjectType: created.subjectType,
      subjectKey: created.subjectKey,
      subjectLabel: input.subjectLabel,
      productId: created.productId,
      releaseId: created.releaseId,
      collectionItemId: created.collectionItemId,
      currentEstimateMinor: marketSnapshot?.currentEstimateMinor ?? 0,
      yesterdayMinor: marketSnapshot?.yesterdayMinor ?? 0,
      sevenDayMinor: marketSnapshot?.sevenDayMinor ?? 0,
      thirtyDayMinor: marketSnapshot?.thirtyDayMinor ?? 0,
      trend: marketSnapshot?.trend ?? 'FLAT',
      notificationType: created.notificationType,
      emailEnabled: created.emailEnabled,
      pushEnabled: created.pushEnabled,
      inAppEnabled: created.inAppEnabled,
      note: created.note,
      lastUpdatedAt: marketSnapshot?.lastUpdatedAt.toISOString() ?? created.updatedAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
  };
}

export async function updateWatchlistItemPreferences(userId: string, input: WatchlistItemInput, db = prisma) {
  const marketSnapshot = input.productId
    ? await db.marketSnapshot.findUnique({ where: { productId: input.productId } })
    : null;

  const item = await db.watchlistItem.upsert({
    where: {
      userId_subjectType_subjectKey: {
        userId,
        subjectType: input.subjectType,
        subjectKey: input.subjectKey,
      },
    },
    create: {
      userId,
      subjectType: input.subjectType,
      subjectKey: input.subjectKey,
      productId: input.productId ?? null,
      releaseId: input.releaseId ?? null,
      collectionItemId: input.collectionItemId ?? null,
      marketSnapshotId: marketSnapshot?.id ?? null,
      notificationType: input.notificationType ?? 'PRICE_MOVEMENT',
      emailEnabled: input.emailEnabled ?? true,
      pushEnabled: input.pushEnabled ?? false,
      inAppEnabled: input.inAppEnabled ?? true,
      note: input.note ?? null,
    },
    update: {
      productId: input.productId ?? null,
      releaseId: input.releaseId ?? null,
      collectionItemId: input.collectionItemId ?? null,
      marketSnapshotId: marketSnapshot?.id ?? null,
      notificationType: input.notificationType ?? 'PRICE_MOVEMENT',
      emailEnabled: input.emailEnabled ?? true,
      pushEnabled: input.pushEnabled ?? false,
      inAppEnabled: input.inAppEnabled ?? true,
      note: input.note ?? null,
    },
  });

  return item;
}

export async function updateNotificationCenterPreference(
  userId: string,
  notificationType: NotificationType,
  input: {
    subjectType: WatchlistSubjectType;
    subjectLabel: string;
    emailEnabled: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
  },
  db = prisma,
) {
  return db.notificationCenterPreference.upsert({
    where: {
      userId_notificationType_subjectType_subjectLabel: {
        userId,
        notificationType,
        subjectType: input.subjectType,
        subjectLabel: input.subjectLabel,
      },
    },
    create: {
      userId,
      notificationType,
      subjectType: input.subjectType,
      subjectLabel: input.subjectLabel,
      emailEnabled: input.emailEnabled,
      pushEnabled: input.pushEnabled,
      inAppEnabled: input.inAppEnabled,
    },
    update: {
      emailEnabled: input.emailEnabled,
      pushEnabled: input.pushEnabled,
      inAppEnabled: input.inAppEnabled,
    },
  });
}

export function calculateApproximateCollectionValue(items: Awaited<ReturnType<typeof getCustomerCollectionItems>>, marketSnapshots: MarketSnapshot[]) {
  const marketByProductId = new Map(marketSnapshots.map((snapshot) => [snapshot.productId, snapshot]));
  return items.reduce((sum, item) => {
    const snapshot = marketByProductId.get(item.productId);
    return sum + ((snapshot?.currentEstimateMinor ?? item.purchasePriceMinor ?? 0) * item.ownedQuantity);
  }, 0);
}

export function calculateTrend(currentMinor: number, baselineMinor: number) {
  return toMarketTrend(currentMinor, baselineMinor);
}
