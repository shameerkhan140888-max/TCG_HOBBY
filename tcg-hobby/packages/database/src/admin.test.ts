import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateAvailableStock, calculateMarginPercentage } from './admin-math';
import {
  adjustProductStock,
  createAdminProductRecommendation,
  deleteAdminProductRecommendation,
  generateProductSlug,
  getAdminDashboardData,
  getAdminProducts,
  getAdminSuppliers,
  searchAdminMerchandisingProducts,
  updateProductMerchandisingSettings,
} from './admin';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (typeof originalNodeEnv === 'undefined') {
    delete process.env.NODE_ENV;
    return;
  }

  process.env.NODE_ENV = originalNodeEnv;
});

function createDbMock() {
  return {
    product: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    productRecommendation: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    order: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    supplier: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    stockAdjustment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (operations: any[]) => Promise.all(operations)),
  } as any;
}

describe('admin math', () => {
  it('calculates available stock safely', () => {
    expect(calculateAvailableStock(12, 3)).toBe(9);
    expect(calculateAvailableStock(2, 4)).toBe(0);
  });

  it('calculates margin percentage from retail and cost', () => {
    expect(calculateMarginPercentage(600, 1000)).toBe(40);
    expect(calculateMarginPercentage(0, 0)).toBe(0);
  });
});

describe('admin repositories', () => {
  it('generates stable product slugs', () => {
    expect(generateProductSlug('Arcane Booster Box')).toBe('arcane-booster-box');
  });

  it('paginates and filters admin products', async () => {
    const db = createDbMock();
    db.product.count.mockResolvedValue(1);
    db.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        sku: 'SKU-1',
        slug: 'arcane-booster-box',
        name: 'Arcane Booster Box',
        game: 'Magic',
        setName: 'Arcane Horizons',
        description: 'Desc',
        longDescription: 'Long',
        condition: 'SEALED',
        priceMinor: 1299,
        currency: 'GBP',
        featured: true,
        published: true,
        archivedAt: null,
        searchText: 'arcane booster box',
        imageLabel: 'Box',
        category: { id: 'cat-1', name: 'Sealed Product', slug: 'sealed-product', description: 'x', sortOrder: 1 },
        inventory: { stockOnHand: 8, reservedStock: 2, reorderPoint: 3, locationCode: 'MAIN' },
        images: [],
        supplierProducts: [
          {
            id: 'sp-1',
            supplierSku: 'CC-1',
            costMinor: 800,
            currency: 'GBP',
            leadTimeDays: 4,
            supplier: {
              id: 'sup-1',
              name: 'Card Citadel',
              slug: 'card-citadel',
              email: null,
              phone: null,
              website: null,
              preferred: true,
              active: true,
              contactName: null,
              addressLine1: null,
              addressLine2: null,
              city: null,
              region: null,
              postalCode: null,
              country: 'GB',
              internalNotes: null,
            },
          },
        ],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ]);
    db.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Sealed Product', slug: 'sealed-product' }]);
    db.supplier.findMany.mockResolvedValue([{ id: 'sup-1', name: 'Card Citadel', slug: 'card-citadel' }]);

    const result = await getAdminProducts({ search: 'arcane', sort: 'price-desc', page: 2, pageSize: 10 }, db);

    expect(db.product.count).toHaveBeenCalled();
    expect(db.product.findMany).toHaveBeenCalled();
    expect(result.products[0]?.slug).toBe('arcane-booster-box');
    expect(result.pagination.page).toBe(1);
  });

  it('returns supplier rows with product counts', async () => {
    const db = createDbMock();
    db.supplier.count.mockResolvedValue(1);
    db.supplier.findMany.mockResolvedValue([
      {
        id: 'sup-1',
        name: 'Card Citadel',
        slug: 'card-citadel',
        email: 'hello@example.test',
        phone: '+44 20 5550 8100',
        website: 'https://example.test',
        preferred: true,
        active: true,
        contactName: 'Mia Carter',
        addressLine1: '12 Spire Road',
        addressLine2: null,
        city: 'Leeds',
        region: 'West Yorkshire',
        postalCode: 'LS1 2AB',
        country: 'GB',
        internalNotes: 'Primary',
        createdAt: new Date('2026-01-01'),
        supplierProducts: [{ id: 'sp-1', productId: 'prod-1', product: { id: 'prod-1', name: 'Arcane Booster Box', slug: 'arcane-booster-box' } }],
      },
    ]);

    const result = await getAdminSuppliers({ search: 'card', page: 1, pageSize: 10 }, db);

    expect(result.suppliers[0]?.productCount).toBe(1);
    expect(result.pagination.totalItems).toBe(1);
  });

  it('records stock adjustments through the repository service', async () => {
    const db = createDbMock();
    db.inventoryItem.findUnique.mockResolvedValue({ id: 'inv-1', stockOnHand: 8 });
    db.inventoryItem.update.mockResolvedValue({ id: 'inv-1', stockOnHand: 10 });
    db.stockAdjustment.create.mockResolvedValue({ id: 'adj-1' });
    db.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        sku: 'SKU-1',
        slug: 'arcane-booster-box',
        name: 'Arcane Booster Box',
        game: 'Magic',
        setName: 'Arcane Horizons',
        description: 'Desc',
        longDescription: 'Long',
        condition: 'SEALED',
        priceMinor: 1299,
        currency: 'GBP',
        featured: true,
        published: true,
        archivedAt: null,
        searchText: 'arcane booster box',
        imageLabel: 'Box',
        category: { id: 'cat-1', name: 'Sealed Product', slug: 'sealed-product', description: 'x', sortOrder: 1 },
        inventory: { stockOnHand: 8, reservedStock: 2, reorderPoint: 3, locationCode: 'MAIN' },
        images: [],
        supplierProducts: [
          {
            id: 'sp-1',
            supplierSku: 'CC-1',
            costMinor: 800,
            currency: 'GBP',
            leadTimeDays: 4,
            supplier: {
              id: 'sup-1',
              name: 'Card Citadel',
              slug: 'card-citadel',
              email: null,
              phone: null,
              website: null,
              preferred: true,
              active: true,
              contactName: null,
              addressLine1: null,
              addressLine2: null,
              city: null,
              region: null,
              postalCode: null,
              country: 'GB',
              internalNotes: null,
            },
          },
        ],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ]);

    await adjustProductStock('prod-1', 2, 'New delivery', 'Operations Desk', db);

    expect(db.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { stockOnHand: 10 },
    });
    expect(db.stockAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: 'prod-1',
          delta: 2,
          reason: 'New delivery',
          performedBy: 'Operations Desk',
        }),
      }),
    );
  });

  it('falls back to seeded dashboard data in development when the database is unavailable', async () => {
    process.env.NODE_ENV = 'development';

    const db = createDbMock();
    db.product.count.mockRejectedValue(new Error('database unavailable'));
    db.order.count.mockResolvedValue(0);
    db.user.count.mockResolvedValue(0);
    db.supplier.count.mockResolvedValue(0);
    db.category.count.mockResolvedValue(0);
    db.order.findMany.mockResolvedValue([]);
    db.product.findMany.mockResolvedValue([]);
    db.inventoryItem.findMany.mockResolvedValue([]);

    const data = await getAdminDashboardData(db);

    expect(data.metrics.length).toBe(8);
    expect(data.recentOrders.length).toBeGreaterThan(0);
    expect(data.recentlyAddedProducts.length).toBeGreaterThan(0);
    expect(db.product.count).toHaveBeenCalled();
  });

  it('throws a clear error in production when the dashboard database is unavailable', async () => {
    process.env.NODE_ENV = 'production';

    const db = createDbMock();
    db.product.count.mockRejectedValue(new Error('database unavailable'));
    db.order.count.mockResolvedValue(0);
    db.user.count.mockResolvedValue(0);
    db.supplier.count.mockResolvedValue(0);
    db.category.count.mockResolvedValue(0);
    db.order.findMany.mockResolvedValue([]);
    db.product.findMany.mockResolvedValue([]);
    db.inventoryItem.findMany.mockResolvedValue([]);

    await expect(getAdminDashboardData(db)).rejects.toThrow('Admin dashboard data is unavailable in production');
  });

  it('updates merchandising settings without touching unrelated product fields', async () => {
    const db = createDbMock();
    db.product.findUnique.mockResolvedValue({ id: 'prod-1' });
    db.product.update.mockResolvedValue({ id: 'prod-1' });

    await updateProductMerchandisingSettings(
      'prod-1',
      {
        recommendationWeight: 25,
        isAccessory: true,
        isStaffPick: false,
        isBestSeller: false,
        isNewArrival: true,
      },
      db,
    );

    expect(db.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: {
        recommendationWeight: 25,
        isAccessory: true,
        isStaffPick: false,
        isBestSeller: false,
        isNewArrival: true,
      },
    });
  });

  it('rejects invalid merchandising weight values', async () => {
    const db = createDbMock();

    await expect(updateProductMerchandisingSettings('prod-1', { recommendationWeight: 5000 }, db)).rejects.toThrow('Recommendation weight');
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it('creates a valid manual product recommendation', async () => {
    const db = createDbMock();
    db.product.findUnique.mockResolvedValueOnce({ id: 'source' }).mockResolvedValueOnce({ id: 'target' });
    db.productRecommendation.create.mockResolvedValue({ id: 'rel-1' });

    const result = await createAdminProductRecommendation(
      {
        sourceProductId: 'source',
        recommendedProductId: 'target',
        relationshipType: 'RELATED',
        priority: 10,
        active: true,
      },
      db,
    );

    expect(result.id).toBe('rel-1');
    expect(db.productRecommendation.create).toHaveBeenCalledWith({
      data: {
        sourceProductId: 'source',
        recommendedProductId: 'target',
        relationshipType: 'RELATED',
        priority: 10,
        active: true,
      },
      select: { id: true },
    });
  });

  it('rejects self-recommendations before writing', async () => {
    const db = createDbMock();

    await expect(
      createAdminProductRecommendation(
        {
          sourceProductId: 'prod-1',
          recommendedProductId: 'prod-1',
          relationshipType: 'RELATED',
          priority: 100,
          active: true,
        },
        db,
      ),
    ).rejects.toThrow('cannot recommend itself');
    expect(db.productRecommendation.create).not.toHaveBeenCalled();
  });

  it('translates duplicate recommendation constraint failures', async () => {
    const db = createDbMock();
    db.product.findUnique.mockResolvedValueOnce({ id: 'source' }).mockResolvedValueOnce({ id: 'target' });
    db.productRecommendation.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      createAdminProductRecommendation(
        {
          sourceProductId: 'source',
          recommendedProductId: 'target',
          relationshipType: 'ACCESSORY',
          priority: 100,
          active: true,
        },
        db,
      ),
    ).rejects.toThrow('already exists');
  });

  it('deletes only the recommendation relationship', async () => {
    const db = createDbMock();
    db.productRecommendation.findUnique.mockResolvedValue({ id: 'rel-1' });
    db.productRecommendation.delete.mockResolvedValue({ id: 'rel-1' });

    await deleteAdminProductRecommendation('rel-1', db);

    expect(db.productRecommendation.delete).toHaveBeenCalledWith({ where: { id: 'rel-1' } });
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it('searches bounded recommendation candidates while excluding source and linked products', async () => {
    const db = createDbMock();
    db.productRecommendation.findMany.mockResolvedValue([{ recommendedProductId: 'linked' }]);
    db.product.findMany.mockResolvedValue([
      {
        id: 'target',
        sku: 'SKU-TARGET',
        slug: 'target-product',
        name: 'Target Product',
        game: 'Pokemon TCG',
        setName: 'Premium Collection',
        priceMinor: 4999,
        currency: 'GBP',
        lifecycleState: 'PUBLISHED',
        published: true,
        archivedAt: null,
        releaseStatus: 'RELEASED',
        category: { name: 'Pokemon', slug: 'pokemon' },
        inventory: { stockOnHand: 3, reservedStock: 0 },
        images: [],
      },
    ]);

    const results = await searchAdminMerchandisingProducts({ sourceProductId: 'source', search: 'target', take: 12 }, db);

    expect(db.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: ['source', 'linked'] },
        }),
        take: 12,
      }),
    );
    expect(results[0]?.publicStockState).toBe('LOW_STOCK');
  });
});
