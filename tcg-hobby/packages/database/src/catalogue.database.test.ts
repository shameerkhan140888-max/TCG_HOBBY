import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
  },
}));

const originalNodeEnv = process.env.NODE_ENV;
const originalDataSource = process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE;

async function loadCatalogueWithMock() {
  vi.doMock('./client', () => ({
    prisma: prismaMock,
  }));

  return import('./catalogue');
}

function routeableProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-without-optional-media',
    slug: 'routeable-product-without-image',
    name: 'Routeable Product Without Image',
    brand: null,
    game: 'Pokemon TCG',
    setName: null,
    productType: 'Booster Pack',
    language: null,
    description: 'A test product that should remain routeable.',
    longDescription: 'A longer test product description.',
    condition: 'SEALED',
    priceMinor: 499,
    currency: 'GBP',
    featured: false,
    homepagePriority: null,
    heroFeatured: false,
    lifecycleState: 'PUBLISHED',
    published: true,
    archivedAt: null,
    hideWhenOutOfStock: false,
    releaseStatus: 'RELEASED',
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
    vatRate: 20,
    sku: 'ROUTEABLE-NO-IMAGE',
    barcode: null,
    searchText: 'routeable product without image',
    imageLabel: 'Product image',
    freeUkStandardShipping: false,
    shippingPromotionProductOnly: true,
    seoTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImageUrl: null,
    noindex: false,
    category: {
      id: 'cat-pokemon',
      name: 'Pokemon TCG',
      slug: 'pokemon-tcg',
      description: 'Pokemon products',
      sortOrder: 1,
    },
    gameRef: { name: 'Pokemon TCG' },
    brandRef: null,
    productTypeRef: { name: 'Booster Pack' },
    languageRef: null,
    setRef: null,
    inventory: null,
    images: [],
    supplierProducts: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetModules();
  prismaMock.product.findMany.mockReset();
  prismaMock.product.findUnique.mockReset();
  prismaMock.category.findMany.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalDataSource === undefined) {
    delete process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE;
  } else {
    process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE = originalDataSource;
  }
});

describe('database-backed catalogue routing', () => {
  it('keeps a published database product routeable when optional supplier, inventory and image data is absent', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE;
    const { getCatalogueProductBySlug } = await loadCatalogueWithMock();

    prismaMock.product.findUnique.mockResolvedValueOnce(routeableProduct());
    prismaMock.product.findMany.mockResolvedValueOnce([]);

    const product = await getCatalogueProductBySlug('routeable-product-without-image');

    expect(product).not.toBeNull();
    expect(product?.slug).toBe('routeable-product-without-image');
    expect(product?.supplierName).toBe('Unassigned');
    expect(product?.stockOnHand).toBe(0);
    expect(product?.reservedStock).toBe(0);
    expect(product?.imageUrl).toBeNull();
    expect(product?.images).toEqual([]);
  });

  it('uses the same optional-data tolerant mapping for catalogue listings', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE;
    const { getCatalogueProducts } = await loadCatalogueWithMock();

    prismaMock.product.findMany.mockResolvedValueOnce([
      routeableProduct({
        inventory: { stockOnHand: 72, reservedStock: 0 },
      }),
    ]);
    prismaMock.category.findMany.mockResolvedValueOnce([]);

    const result = await getCatalogueProducts({
      search: '',
      category: '',
      sort: 'featured',
      page: 1,
      pageSize: 24,
    });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.slug).toBe('routeable-product-without-image');
    expect(result.products[0]?.imageUrl).toBeNull();
    expect(result.products[0]?.inStock).toBe(true);
  });

  it('does not fall back to seeded products when a database detail lookup fails', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE;
    const { getCatalogueProductBySlug } = await loadCatalogueWithMock();

    prismaMock.product.findUnique.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(getCatalogueProductBySlug('seed-only-product')).rejects.toThrow('Catalogue database query failed in production: database unavailable');
  });

  it('matches canonical game slugs against legacy text game fields for catalogue filters', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE;
    const { getCatalogueProducts } = await loadCatalogueWithMock();

    prismaMock.product.findMany.mockResolvedValueOnce([
      routeableProduct({
        game: 'Pokemon TCG',
        gameRef: null,
        inventory: { stockOnHand: 72, reservedStock: 0 },
      }),
    ]);
    prismaMock.category.findMany.mockResolvedValueOnce([]);

    const result = await getCatalogueProducts({
      search: '',
      category: '',
      game: 'pokemon-tcg',
      sort: 'featured',
      page: 1,
      pageSize: 24,
    });

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { game: { contains: 'pokemon tcg', mode: 'insensitive' } },
              ]),
            }),
          ]),
        }),
      }),
    );
    expect(result.products).toHaveLength(1);
  });
});
