import type { Prisma, PrismaClient, ProductRecommendationType } from '@prisma/client';
import { prisma } from './client';
import { derivePublicStockState } from './product-import';

export type MerchandisingPlacement =
  | 'PRODUCT_RELATED'
  | 'PRODUCT_ACCESSORIES'
  | 'HOMEPAGE_FEATURED'
  | 'HOMEPAGE_NEW_ARRIVALS'
  | 'ADMIN_PREVIEW'
  | 'CAMPAIGN';

export type StorefrontSafeMerchandisingProduct = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string | null;
  price: {
    amountMinor: number;
    currency: 'GBP' | 'USD' | 'EUR';
  };
  publicStockState: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
  gameLabel: string;
  categoryLabel: string;
  categorySlug: string;
  freeUkStandardShipping: boolean;
  customerPurchaseLimit: number | null;
  wishlistEligible: boolean;
  basketEligible: boolean;
};

export type MerchandisingCampaignProductInfluence = {
  productId: string;
  priority: number;
  active: boolean;
};

export type MerchandisingCampaignInfluence = {
  id: string;
  name: string;
  active: boolean;
  priority: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  products: MerchandisingCampaignProductInfluence[];
};

export type RecommendationAnalyticsEventContext = {
  placement: MerchandisingPlacement;
  sourceProductId?: string;
  recommendedProductId: string;
  strategy: string;
  position: number;
  sessionRef?: string;
  userRef?: string;
  campaignId?: string;
  occurredAt: Date;
};

export type RecommendationAnalyticsEvent =
  | ({ type: 'RECOMMENDATION_IMPRESSION' } & RecommendationAnalyticsEventContext)
  | ({ type: 'RECOMMENDATION_CLICK' } & RecommendationAnalyticsEventContext)
  | ({ type: 'RECOMMENDATION_ADD_TO_BASKET' } & RecommendationAnalyticsEventContext)
  | ({ type: 'RECOMMENDATION_PURCHASE_ATTRIBUTION'; orderId?: string } & RecommendationAnalyticsEventContext);

export type MerchandisingContext = {
  sourceProductId?: string;
  resultLimit?: number;
  placement?: MerchandisingPlacement;
  excludedProductIds?: string[];
  requireInStock?: boolean;
  categorySlugs?: string[];
  games?: string[];
  productTypes?: string[];
  manualRelationshipTypes?: ProductRecommendationType[];
  enabledStrategyIds?: string[];
  campaignInfluences?: MerchandisingCampaignInfluence[];
  now?: Date;
};

type SourceProductContext = {
  id: string;
  game: string;
  setName: string | null;
  categorySlug: string;
};

type MerchandisingCandidateProduct = Prisma.ProductGetPayload<{ include: typeof merchandisingProductInclude }>;

type MerchandisingCandidate = {
  product: MerchandisingCandidateProduct;
  strategyId: string;
  strategyPriority: number;
  rank: number;
  campaignPriority?: number;
};

export type MerchandisingRecommendation = StorefrontSafeMerchandisingProduct & {
  strategyId: string;
};

export type MerchandisingStrategy = {
  id: string;
  priority: number;
  getCandidates(
    context: RequiredMerchandisingContext,
    helpers: MerchandisingStrategyHelpers,
  ): Promise<MerchandisingCandidate[]>;
};

type RequiredMerchandisingContext = MerchandisingContext & {
  resultLimit: number;
  placement: MerchandisingPlacement;
  excludedProductIds: string[];
  requireInStock: boolean;
  enabledStrategyIds: string[];
  now: Date;
};

type MerchandisingStrategyHelpers = {
  db: PrismaClient | Prisma.TransactionClient;
  sourceProduct: SourceProductContext | null;
  take: number;
  buildProductWhere(input?: Prisma.ProductWhereInput): Prisma.ProductWhereInput;
  findProducts(where: Prisma.ProductWhereInput, orderBy?: Prisma.ProductOrderByWithRelationInput[]): Promise<MerchandisingCandidateProduct[]>;
};

const merchandisingProductInclude = {
  category: true,
  inventory: true,
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 2 },
} as const satisfies Prisma.ProductInclude;

const DEFAULT_LIMIT = 4;
const MAX_STRATEGY_CANDIDATES = 24;
const DEFAULT_RELATIONSHIP_TYPES: ProductRecommendationType[] = ['MANUAL', 'RELATED', 'ACCESSORY', 'UPSELL', 'CROSS_SELL'];

function normalizeContext(context: MerchandisingContext): RequiredMerchandisingContext {
  return {
    ...context,
    resultLimit: Math.max(0, Math.min(context.resultLimit ?? DEFAULT_LIMIT, 24)),
    placement: context.placement ?? 'PRODUCT_RELATED',
    excludedProductIds: context.excludedProductIds ?? [],
    requireInStock: context.requireInStock ?? true,
    enabledStrategyIds: context.enabledStrategyIds ?? ['*'],
    now: context.now ?? new Date(),
  };
}

function calculateAvailableStock(product: { inventory: { stockOnHand: number; reservedStock: number } | null }): number {
  if (!product.inventory) {
    return 0;
  }

  return Math.max(product.inventory.stockOnHand - product.inventory.reservedStock, 0);
}

export function isMerchandisingProductEligible(
  product: Pick<MerchandisingCandidateProduct, 'id' | 'published' | 'lifecycleState' | 'archivedAt' | 'releaseStatus' | 'slug'> & {
    inventory: { stockOnHand: number; reservedStock: number } | null;
  },
  context: Pick<RequiredMerchandisingContext, 'sourceProductId' | 'excludedProductIds' | 'requireInStock'>,
  alreadySelected = new Set<string>(),
): boolean {
  if (!product.slug || product.id === context.sourceProductId || context.excludedProductIds.includes(product.id) || alreadySelected.has(product.id)) {
    return false;
  }

  if (!product.published || product.lifecycleState !== 'PUBLISHED' || product.archivedAt || product.releaseStatus === 'ARCHIVED') {
    return false;
  }

  return !context.requireInStock || calculateAvailableStock(product) > 0;
}

function sortCandidates(a: MerchandisingCandidate, b: MerchandisingCandidate): number {
  if ((a.campaignPriority ?? Number.MAX_SAFE_INTEGER) !== (b.campaignPriority ?? Number.MAX_SAFE_INTEGER)) {
    return (a.campaignPriority ?? Number.MAX_SAFE_INTEGER) - (b.campaignPriority ?? Number.MAX_SAFE_INTEGER);
  }

  if (a.strategyPriority !== b.strategyPriority) return a.strategyPriority - b.strategyPriority;
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.product.recommendationWeight !== b.product.recommendationWeight) return b.product.recommendationWeight - a.product.recommendationWeight;

  const priorityA = a.product.homepagePriority ?? Number.MAX_SAFE_INTEGER;
  const priorityB = b.product.homepagePriority ?? Number.MAX_SAFE_INTEGER;
  if (priorityA !== priorityB) return priorityA - priorityB;
  if (a.product.featured !== b.product.featured) return a.product.featured ? -1 : 1;
  if (a.product.createdAt.getTime() !== b.product.createdAt.getTime()) return b.product.createdAt.getTime() - a.product.createdAt.getTime();
  return a.product.id.localeCompare(b.product.id);
}

function productToStorefrontSafeCard(product: MerchandisingCandidateProduct): StorefrontSafeMerchandisingProduct {
  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0] ?? null;
  const availableStock = calculateAvailableStock(product);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: primaryImage?.url ?? null,
    imageAlt: primaryImage?.altText ?? null,
    price: {
      amountMinor: product.priceMinor,
      currency: product.currency as StorefrontSafeMerchandisingProduct['price']['currency'],
    },
    publicStockState: derivePublicStockState(availableStock),
    gameLabel: product.game,
    categoryLabel: product.category.name,
    categorySlug: product.category.slug,
    freeUkStandardShipping: product.freeUkStandardShipping,
    customerPurchaseLimit: product.customerPurchaseLimit,
    wishlistEligible: true,
    basketEligible: availableStock > 0 && product.releaseStatus === 'RELEASED',
  };
}

function isCampaignActive(campaign: MerchandisingCampaignInfluence, now: Date): boolean {
  return campaign.active && (!campaign.startsAt || campaign.startsAt <= now) && (!campaign.endsAt || campaign.endsAt >= now);
}

function applyCampaignInfluence(candidate: MerchandisingCandidate, context: RequiredMerchandisingContext): MerchandisingCandidate {
  const campaignRanks = (context.campaignInfluences ?? [])
    .filter((campaign) => isCampaignActive(campaign, context.now))
    .flatMap((campaign) =>
      campaign.products
        .filter((product) => product.active && product.productId === candidate.product.id)
        .map((product) => campaign.priority * 10_000 + product.priority),
    );

  if (campaignRanks.length === 0) {
    return candidate;
  }

  return { ...candidate, campaignPriority: Math.min(...campaignRanks) };
}

async function resolveSourceProduct(
  db: PrismaClient | Prisma.TransactionClient,
  sourceProductId: string | undefined,
): Promise<SourceProductContext | null> {
  if (!sourceProductId) {
    return null;
  }

  const product = await db.product.findUnique({
    where: { id: sourceProductId },
    select: {
      id: true,
      game: true,
      setName: true,
      category: { select: { slug: true } },
    },
  });

  return product ? { id: product.id, game: product.game, setName: product.setName, categorySlug: product.category.slug } : null;
}

function createStrategyHelpers(
  db: PrismaClient | Prisma.TransactionClient,
  context: RequiredMerchandisingContext,
  sourceProduct: SourceProductContext | null,
): MerchandisingStrategyHelpers {
  const take = Math.min(MAX_STRATEGY_CANDIDATES, Math.max(context.resultLimit * 4, context.resultLimit + context.excludedProductIds.length + 4));

  function buildProductWhere(input: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
    return {
      published: true,
      lifecycleState: 'PUBLISHED',
      archivedAt: null,
      releaseStatus: { not: 'ARCHIVED' },
      ...(context.categorySlugs?.length ? { category: { slug: { in: context.categorySlugs } } } : {}),
      ...(context.games?.length ? { game: { in: context.games } } : {}),
      ...(context.productTypes?.length ? { setName: { in: context.productTypes } } : {}),
      ...input,
    };
  }

  async function findProducts(
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'asc' }],
  ): Promise<MerchandisingCandidateProduct[]> {
    return db.product.findMany({
      where,
      include: merchandisingProductInclude,
      orderBy,
      take,
    });
  }

  return { db, sourceProduct, take, buildProductWhere, findProducts };
}

function rankRows(strategy: MerchandisingStrategy, products: MerchandisingCandidateProduct[]): MerchandisingCandidate[] {
  return products.map((product, index) => ({
    product,
    strategyId: strategy.id,
    strategyPriority: strategy.priority,
    rank: index + 1,
  }));
}

export const ManualRelationshipStrategy: MerchandisingStrategy = {
  id: 'manual-relationships',
  priority: 10,
  async getCandidates(context, helpers) {
    if (!context.sourceProductId) {
      return [];
    }

    const rows = await helpers.db.productRecommendation.findMany({
      where: {
        sourceProductId: context.sourceProductId,
        active: true,
        relationshipType: { in: context.manualRelationshipTypes ?? DEFAULT_RELATIONSHIP_TYPES },
      },
      include: { recommendedProduct: { include: merchandisingProductInclude } },
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      take: helpers.take,
    });

    return rows.map((row, index) => ({
      product: row.recommendedProduct,
      strategyId: ManualRelationshipStrategy.id,
      strategyPriority: ManualRelationshipStrategy.priority,
      rank: row.priority * 100 + index,
    }));
  },
};

export const SameCategoryStrategy: MerchandisingStrategy = {
  id: 'same-game-category',
  priority: 20,
  async getCandidates(_context, helpers) {
    if (!helpers.sourceProduct) return [];
    const products = await helpers.findProducts(
      helpers.buildProductWhere({
        game: helpers.sourceProduct.game,
        category: { slug: helpers.sourceProduct.categorySlug },
      }),
    );
    return rankRows(SameCategoryStrategy, products);
  },
};

export const SameProductTypeStrategy: MerchandisingStrategy = {
  id: 'same-game-product-type',
  priority: 30,
  async getCandidates(_context, helpers) {
    if (!helpers.sourceProduct?.setName) return [];
    const products = await helpers.findProducts(
      helpers.buildProductWhere({
        game: helpers.sourceProduct.game,
        setName: helpers.sourceProduct.setName,
      }),
    );
    return rankRows(SameProductTypeStrategy, products);
  },
};

export const SameGameStrategy: MerchandisingStrategy = {
  id: 'same-game',
  priority: 40,
  async getCandidates(_context, helpers) {
    if (!helpers.sourceProduct) return [];
    const products = await helpers.findProducts(helpers.buildProductWhere({ game: helpers.sourceProduct.game }));
    return rankRows(SameGameStrategy, products);
  },
};

export const AccessoryStrategy: MerchandisingStrategy = {
  id: 'accessories',
  priority: 50,
  async getCandidates(_context, helpers) {
    const products = await helpers.findProducts(helpers.buildProductWhere({ OR: [{ isAccessory: true }, { category: { slug: 'accessories' } }] }));
    return rankRows(AccessoryStrategy, products);
  },
};

export const FeaturedStrategy: MerchandisingStrategy = {
  id: 'featured',
  priority: 60,
  async getCandidates(_context, helpers) {
    const products = await helpers.findProducts(helpers.buildProductWhere({ OR: [{ featured: true }, { isStaffPick: true }] }), [
      { homepagePriority: 'asc' },
      { recommendationWeight: 'desc' },
      { createdAt: 'desc' },
      { id: 'asc' },
    ]);
    return rankRows(FeaturedStrategy, products);
  },
};

export const StaffPickStrategy: MerchandisingStrategy = {
  id: 'staff-picks',
  priority: 65,
  async getCandidates(_context, helpers) {
    const products = await helpers.findProducts(helpers.buildProductWhere({ isStaffPick: true }), [
      { recommendationWeight: 'desc' },
      { homepagePriority: 'asc' },
      { createdAt: 'desc' },
      { id: 'asc' },
    ]);
    return rankRows(StaffPickStrategy, products);
  },
};

export const NewArrivalStrategy: MerchandisingStrategy = {
  id: 'new-arrivals',
  priority: 70,
  async getCandidates(_context, helpers) {
    const products = await helpers.findProducts(helpers.buildProductWhere({ OR: [{ isNewArrival: true }, { releaseStatus: 'RELEASED' }] }), [
      { isNewArrival: 'desc' },
      { createdAt: 'desc' },
      { id: 'asc' },
    ]);
    return rankRows(NewArrivalStrategy, products);
  },
};

export const LatestProductStrategy: MerchandisingStrategy = {
  id: 'latest-products',
  priority: 80,
  async getCandidates(_context, helpers) {
    const products = await helpers.findProducts(helpers.buildProductWhere(), [{ createdAt: 'desc' }, { id: 'asc' }]);
    return rankRows(LatestProductStrategy, products);
  },
};

export const defaultMerchandisingStrategies: MerchandisingStrategy[] = [
  ManualRelationshipStrategy,
  SameCategoryStrategy,
  SameProductTypeStrategy,
  SameGameStrategy,
  AccessoryStrategy,
  FeaturedStrategy,
  StaffPickStrategy,
  NewArrivalStrategy,
  LatestProductStrategy,
];

export async function getRecommendedProducts(
  context: MerchandisingContext,
  db: PrismaClient | Prisma.TransactionClient = prisma,
  strategies: MerchandisingStrategy[] = defaultMerchandisingStrategies,
): Promise<MerchandisingRecommendation[]> {
  const resolvedContext = normalizeContext(context);
  if (resolvedContext.resultLimit === 0) {
    return [];
  }

  const sourceProduct = await resolveSourceProduct(db, resolvedContext.sourceProductId);
  const helpers = createStrategyHelpers(db, resolvedContext, sourceProduct);
  const selected = new Map<string, MerchandisingCandidate>();

  for (const strategy of [...strategies].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))) {
    if (!resolvedContext.enabledStrategyIds.includes('*') && !resolvedContext.enabledStrategyIds.includes(strategy.id)) {
      continue;
    }

    const candidates = (await strategy.getCandidates(resolvedContext, helpers)).map((candidate) => applyCampaignInfluence(candidate, resolvedContext));
    for (const candidate of candidates.sort(sortCandidates)) {
      if (!isMerchandisingProductEligible(candidate.product, resolvedContext, new Set(selected.keys()))) {
        continue;
      }

      selected.set(candidate.product.id, candidate);
      if (selected.size >= resolvedContext.resultLimit) {
        return [...selected.values()].sort(sortCandidates).map((candidate) => ({
          ...productToStorefrontSafeCard(candidate.product),
          strategyId: candidate.strategyId,
        }));
      }
    }
  }

  return [...selected.values()].sort(sortCandidates).map((candidate) => ({
    ...productToStorefrontSafeCard(candidate.product),
    strategyId: candidate.strategyId,
  }));
}

export function getRelatedProducts(context: Omit<MerchandisingContext, 'placement'>, db: PrismaClient | Prisma.TransactionClient = prisma) {
  return getRecommendedProducts({ ...context, placement: 'PRODUCT_RELATED' }, db);
}

export function getAccessoryRecommendations(context: Omit<MerchandisingContext, 'placement'>, db: PrismaClient | Prisma.TransactionClient = prisma) {
  return getRecommendedProducts({ ...context, placement: 'PRODUCT_ACCESSORIES', enabledStrategyIds: ['manual-relationships', 'accessories', 'latest-products'] }, db);
}

export function getFeaturedProducts(limit = DEFAULT_LIMIT, db: PrismaClient | Prisma.TransactionClient = prisma) {
  return getRecommendedProducts({ resultLimit: limit, placement: 'HOMEPAGE_FEATURED', enabledStrategyIds: ['featured', 'latest-products'] }, db);
}

export function getLatestProducts(limit = DEFAULT_LIMIT, db: PrismaClient | Prisma.TransactionClient = prisma) {
  return getRecommendedProducts({ resultLimit: limit, placement: 'HOMEPAGE_NEW_ARRIVALS', enabledStrategyIds: ['new-arrivals', 'latest-products'] }, db);
}

export function getStaffPickProducts(limit = DEFAULT_LIMIT, db: PrismaClient | Prisma.TransactionClient = prisma) {
  return getRecommendedProducts({ resultLimit: limit, placement: 'HOMEPAGE_FEATURED', enabledStrategyIds: ['staff-picks'] }, db);
}

export async function createProductRecommendation(
  input: {
    sourceProductId: string;
    recommendedProductId: string;
    relationshipType: ProductRecommendationType;
    priority?: number;
    active?: boolean;
  },
  db: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<{ id: string }> {
  if (input.sourceProductId === input.recommendedProductId) {
    throw new Error('Product recommendations cannot point to the source product.');
  }

  return db.productRecommendation.create({
    data: {
      sourceProductId: input.sourceProductId,
      recommendedProductId: input.recommendedProductId,
      relationshipType: input.relationshipType,
      priority: input.priority ?? 100,
      active: input.active ?? true,
    },
    select: { id: true },
  });
}
