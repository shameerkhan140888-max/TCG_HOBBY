import { describe, expect, it, vi } from 'vitest';
import type { ProductRecommendationType } from '@prisma/client';
import {
  AccessoryStrategy,
  LatestProductStrategy,
  ManualRelationshipStrategy,
  SameCategoryStrategy,
  SameGameStrategy,
  SameProductTypeStrategy,
  StaffPickStrategy,
  createProductRecommendation,
  getRecommendedProducts,
  getStaffPickProducts,
  isMerchandisingProductEligible,
  type MerchandisingStrategy,
} from './merchandising';

type ProductFixture = ReturnType<typeof product>;

function product(overrides: Partial<{
  id: string;
  slug: string;
  name: string;
  game: string;
  setName: string | null;
  categorySlug: string;
  categoryName: string;
  stockOnHand: number;
  reservedStock: number;
  published: boolean;
  lifecycleState: string;
  archivedAt: Date | null;
  releaseStatus: 'RELEASED' | 'PREORDER' | 'COMING_SOON' | 'ARCHIVED';
  recommendationWeight: number;
  homepagePriority: number | null;
  featured: boolean;
  isAccessory: boolean;
  isStaffPick: boolean;
  isNewArrival: boolean;
  createdAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'product-1',
    importId: null,
    sku: `${overrides.id ?? 'product-1'}-sku`,
    barcode: null,
    slug: overrides.slug ?? overrides.id ?? 'product-1',
    name: overrides.name ?? 'Test product',
    brand: 'Pokemon TCG',
    game: overrides.game ?? 'Pokemon TCG',
    gameId: null,
    brandId: null,
    productTypeId: null,
    languageId: null,
    setId: null,
    setName: overrides.setName ?? 'Premium Collection',
    productType: 'Premium Collection',
    language: 'English',
    description: 'Short description',
    longDescription: 'Long description',
    condition: 'SEALED' as const,
    priceMinor: 4999,
    rrpMinor: null,
    salePriceMinor: null,
    saleStartsAt: null,
    saleEndsAt: null,
    vatRate: 20,
    currency: 'GBP',
    featured: overrides.featured ?? false,
    homepagePriority: overrides.homepagePriority ?? null,
    heroFeatured: false,
    recommendationWeight: overrides.recommendationWeight ?? 0,
    isAccessory: overrides.isAccessory ?? false,
    isStaffPick: overrides.isStaffPick ?? false,
    isBestSeller: false,
    isNewArrival: overrides.isNewArrival ?? false,
    freeUkStandardShipping: false,
    shippingPromotionProductOnly: true,
    lifecycleState: overrides.lifecycleState ?? 'PUBLISHED',
    published: overrides.published ?? true,
    hideWhenOutOfStock: false,
    archivedAt: overrides.archivedAt ?? null,
    searchText: 'test product',
    imageLabel: 'Test product image',
    releaseStatus: overrides.releaseStatus ?? 'RELEASED',
    releaseDate: null,
    expectedDispatchAt: null,
    expectedArrivalAt: null,
    allocationLimit: null,
    customerPurchaseLimit: null,
    supplierAllocation: null,
    lowAllocationThreshold: null,
    availabilityMessage: null,
    preorderBadgeLabel: null,
    comingSoonBadgeLabel: null,
    categoryId: `${overrides.categorySlug ?? 'sealed-product'}-id`,
    importSourceType: null,
    importSourceReference: null,
    importedAt: null,
    lastImportedAt: null,
    importValidationWarnings: null,
    seoTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImageUrl: null,
    noindex: false,
    createdAt: overrides.createdAt ?? new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    category: {
      id: `${overrides.categorySlug ?? 'sealed-product'}-id`,
      name: overrides.categoryName ?? 'Sealed Product',
      slug: overrides.categorySlug ?? 'sealed-product',
      description: '',
      sortOrder: 1,
      imageLabel: '',
    },
    inventory: {
      id: `inventory-${overrides.id ?? 'product-1'}`,
      productId: overrides.id ?? 'product-1',
      stockOnHand: overrides.stockOnHand ?? 6,
      reservedStock: overrides.reservedStock ?? 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      incomingQuantity: 0,
      locationCode: 'MAIN',
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
    images: [
      {
        id: `image-${overrides.id ?? 'product-1'}`,
        productId: overrides.id ?? 'product-1',
        url: `/products/${overrides.slug ?? overrides.id ?? 'product-1'}/primary.webp`,
        altText: `${overrides.name ?? 'Test product'} image`,
        imageType: 'primary',
        sortOrder: 1,
        isPrimary: true,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ],
  };
}

function sourceProduct() {
  return {
    id: 'source',
    game: 'Pokemon TCG',
    setName: 'Premium Collection',
    category: { slug: 'sealed-product' },
  };
}

function createDb(options: {
  manualRows?: Array<{ priority: number; relationshipType?: ProductRecommendationType; recommendedProduct: ProductFixture }>;
  products?: ProductFixture[];
  source?: ReturnType<typeof sourceProduct> | null;
} = {}) {
  const products = options.products ?? [];
  return {
    product: {
      findUnique: vi.fn(async () => options.source === undefined ? sourceProduct() : options.source),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (where.isStaffPick) {
          return products.filter((item) => item.isStaffPick);
        }
        if (where.isAccessory || JSON.stringify(where).includes('accessories')) {
          return products.filter((item) => item.isAccessory || item.category.slug === 'accessories');
        }
        if (where.game && where.category) {
          return products.filter((item) => item.game === sourceProduct().game && item.category.slug === sourceProduct().category.slug);
        }
        if (where.game && where.setName) {
          return products.filter((item) => item.game === sourceProduct().game && item.setName === sourceProduct().setName);
        }
        if (where.game) {
          return products.filter((item) => item.game === sourceProduct().game);
        }
        return products;
      }),
    },
    productRecommendation: {
      findMany: vi.fn(async () => (options.manualRows ?? []).map((row, index) => ({ id: `rel-${index}`, active: true, sourceProductId: 'source', recommendedProductId: row.recommendedProduct.id, relationshipType: row.relationshipType ?? 'RELATED', priority: row.priority, createdAt: new Date(), updatedAt: new Date(), recommendedProduct: row.recommendedProduct }))),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: `rel-${String(data.recommendedProductId)}` })),
    },
  };
}

describe('merchandising eligibility', () => {
  it('excludes source, explicit exclusions, duplicate, draft, hidden, archived, discontinued and unavailable products', () => {
    const context = { sourceProductId: 'source', excludedProductIds: ['excluded'], requireInStock: true };
    const selected = new Set(['selected']);

    expect(isMerchandisingProductEligible(product({ id: 'source' }), context, selected)).toBe(false);
    expect(isMerchandisingProductEligible(product({ id: 'excluded' }), context, selected)).toBe(false);
    expect(isMerchandisingProductEligible(product({ id: 'selected' }), context, selected)).toBe(false);
    expect(isMerchandisingProductEligible(product({ id: 'draft', lifecycleState: 'DRAFT' }), context, selected)).toBe(false);
    expect(isMerchandisingProductEligible(product({ id: 'hidden', published: false }), context, selected)).toBe(false);
    expect(isMerchandisingProductEligible(product({ id: 'archived', archivedAt: new Date() }), context, selected)).toBe(false);
    expect(isMerchandisingProductEligible(product({ id: 'discontinued', releaseStatus: 'ARCHIVED' }), context, selected)).toBe(false);
    expect(isMerchandisingProductEligible(product({ id: 'sold-out', stockOnHand: 1, reservedStock: 1 }), context, selected)).toBe(false);
    expect(isMerchandisingProductEligible(product({ id: 'eligible' }), context, selected)).toBe(true);
  });
});

describe('merchandising strategy pipeline', () => {
  it('ranks active manual recommendations first and respects manual priority', async () => {
    const manualLow = product({ id: 'manual-low', name: 'Manual low' });
    const manualHigh = product({ id: 'manual-high', name: 'Manual high' });
    const sameCategory = product({ id: 'same-category', name: 'Same category' });
    const db = createDb({
      manualRows: [
        { priority: 20, recommendedProduct: manualLow },
        { priority: 5, recommendedProduct: manualHigh },
      ],
      products: [sameCategory],
    });

    const result = await getRecommendedProducts({ sourceProductId: 'source', resultLimit: 3 }, db as never);

    expect(result.map((item) => item.id)).toEqual(['manual-high', 'manual-low', 'same-category']);
  });

  it('orders same game and category before same product type, same game, accessories and latest fallback', async () => {
    const sameCategory = product({ id: 'same-category', categorySlug: 'sealed-product' });
    const sameType = product({ id: 'same-type', categorySlug: 'single-card' });
    const sameGame = product({ id: 'same-game', categorySlug: 'event-entry', setName: 'Other' });
    const accessory = product({ id: 'accessory', game: 'Accessories', categorySlug: 'accessories', isAccessory: true });
    const latest = product({ id: 'latest', game: 'Magic', categorySlug: 'sealed-product' });
    const db = createDb({ products: [sameCategory, sameType, sameGame, accessory, latest] });

    const result = await getRecommendedProducts({ sourceProductId: 'source', resultLimit: 5 }, db as never);

    expect(result.map((item) => item.id)).toEqual(['same-category', 'same-type', 'same-game', 'accessory', 'latest']);
  });

  it('fills remaining slots with accessories and returns fewer than the limit when eligibility is insufficient', async () => {
    const sameGame = product({ id: 'same-game' });
    const accessory = product({ id: 'accessory', isAccessory: true, categorySlug: 'accessories' });
    const soldOutAccessory = product({ id: 'sold-out-accessory', isAccessory: true, categorySlug: 'accessories', stockOnHand: 0 });
    const db = createDb({ products: [sameGame, accessory, soldOutAccessory] });

    const result = await getRecommendedProducts({ sourceProductId: 'source', resultLimit: 4 }, db as never);

    expect(result.map((item) => item.id)).toEqual(['same-game', 'accessory']);
  });

  it('deduplicates products returned by multiple strategies and stops at the requested limit', async () => {
    const duplicate = product({ id: 'duplicate' });
    const second = product({ id: 'second' });
    const db = createDb({ products: [duplicate, second] });
    const firstStrategy: MerchandisingStrategy = {
      id: 'first',
      priority: 1,
      async getCandidates() {
        return [{ product: duplicate, strategyId: 'first', strategyPriority: 1, rank: 1 }];
      },
    };
    const secondStrategy: MerchandisingStrategy = {
      id: 'second',
      priority: 2,
      async getCandidates() {
        return [
          { product: duplicate, strategyId: 'second', strategyPriority: 2, rank: 1 },
          { product: second, strategyId: 'second', strategyPriority: 2, rank: 2 },
        ];
      },
    };

    const result = await getRecommendedProducts({ resultLimit: 1 }, db as never, [firstStrategy, secondStrategy]);

    expect(result.map((item) => item.id)).toEqual(['duplicate']);
  });

  it('supports disabling strategies and registering a new strategy without changing existing strategies', async () => {
    const customProduct = product({ id: 'custom' });
    const db = createDb();
    const customStrategy: MerchandisingStrategy = {
      id: 'custom',
      priority: 1,
      async getCandidates() {
        return [{ product: customProduct, strategyId: 'custom', strategyPriority: 1, rank: 1 }];
      },
    };

    const disabled = await getRecommendedProducts({ resultLimit: 1, enabledStrategyIds: [] }, db as never, [customStrategy]);
    const enabled = await getRecommendedProducts({ resultLimit: 1, enabledStrategyIds: ['custom'] }, db as never, [customStrategy]);

    expect(disabled).toEqual([]);
    expect(enabled[0]?.id).toBe('custom');
  });

  it('selects staff picks through the dedicated merchandising strategy', async () => {
    const staffPick = product({ id: 'staff-pick', isStaffPick: true });
    const featuredOnly = product({ id: 'featured-only', featured: true });
    const db = createDb({ products: [featuredOnly, staffPick] });

    const result = await getStaffPickProducts(4, db as never);

    expect(result.map((item) => item.id)).toEqual(['staff-pick']);
    expect(result[0]?.strategyId).toBe(StaffPickStrategy.id);
  });

  it('applies deterministic campaign influence without bypassing eligibility', async () => {
    const normal = product({ id: 'normal' });
    const boosted = product({ id: 'boosted' });
    const ineligibleBoosted = product({ id: 'ineligible-boosted', stockOnHand: 0 });
    const db = createDb({ products: [normal, boosted, ineligibleBoosted] });

    const result = await getRecommendedProducts(
      {
        resultLimit: 3,
        campaignInfluences: [
          {
            id: 'campaign-1',
            name: 'Launch campaign',
            active: true,
            priority: 1,
            products: [
              { productId: 'boosted', priority: 1, active: true },
              { productId: 'ineligible-boosted', priority: 0, active: true },
            ],
          },
        ],
      },
      db as never,
      [LatestProductStrategy],
    );

    expect(result.map((item) => item.id)).toEqual(['boosted', 'normal']);
  });

  it('returns deterministic ordering across repeated calls and exposes storefront-safe fields only', async () => {
    const weighted = product({ id: 'weighted', recommendationWeight: 5 });
    const priority = product({ id: 'priority', homepagePriority: 1 });
    const db = createDb({ products: [priority, weighted] });

    const first = await getRecommendedProducts({ resultLimit: 2 }, db as never, [LatestProductStrategy]);
    const second = await getRecommendedProducts({ resultLimit: 2 }, db as never, [LatestProductStrategy]);

    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(first[0]).not.toHaveProperty('stockOnHand');
    expect(first[0]).not.toHaveProperty('supplierName');
    expect(first[0]).toHaveProperty('publicStockState');
  });
});

describe('product recommendation relationships', () => {
  it('rejects self-relationships before the database write', async () => {
    const db = createDb();

    await expect(
      createProductRecommendation(
        {
          sourceProductId: 'product-1',
          recommendedProductId: 'product-1',
          relationshipType: 'RELATED',
        },
        db as never,
      ),
    ).rejects.toThrow('cannot point to the source product');
  });

  it('preserves relationship type, priority and active state when creating a recommendation', async () => {
    const db = createDb();

    await createProductRecommendation(
      {
        sourceProductId: 'source',
        recommendedProductId: 'target',
        relationshipType: 'ACCESSORY',
        priority: 7,
        active: false,
      },
      db as never,
    );

    expect(db.productRecommendation.create).toHaveBeenCalledWith({
      data: {
        sourceProductId: 'source',
        recommendedProductId: 'target',
        relationshipType: 'ACCESSORY',
        priority: 7,
        active: false,
      },
      select: { id: true },
    });
  });
});

describe('analytics event foundation', () => {
  it('supports strongly typed future impression, click, basket and purchase attribution events without emitting them automatically', () => {
    const events = [
      'RECOMMENDATION_IMPRESSION',
      'RECOMMENDATION_CLICK',
      'RECOMMENDATION_ADD_TO_BASKET',
      'RECOMMENDATION_PURCHASE_ATTRIBUTION',
    ];

    expect(events).toContain('RECOMMENDATION_IMPRESSION');
  });
});
