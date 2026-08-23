import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./pricing', () => ({
  refreshProductPricing: vi.fn().mockResolvedValue({}),
}));

import { createAdminProduct, updateAdminProduct } from './admin.js';

const contents = ['1 foil promotional card', '8 booster packs'];

function productInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Manual Contents Product',
    slug: 'manual-contents-product',
    sku: 'CONTENTS-001',
    game: 'Pokemon TCG',
    description: 'Short description',
    longDescription: 'Long description',
    contents,
    condition: 'SEALED',
    categoryId: 'category-1',
    supplierId: 'supplier-1',
    priceMinor: 4999,
    costMinor: 3000,
    stockOnHand: 3,
    reorderPoint: 1,
    locationCode: 'MAIN',
    imageLabel: '',
    featured: false,
    published: false,
    hideWhenOutOfStock: false,
    ...overrides,
  };
}

function productWriteDb() {
  const tx = {
    product: {
      create: vi.fn().mockResolvedValue({ id: 'product-1' }),
      update: vi.fn().mockResolvedValue({ id: 'product-1' }),
    },
    inventoryItem: {
      create: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({}),
    },
    supplierProduct: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    productImage: {
      count: vi.fn().mockResolvedValue(0),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };

  const db = {
    product: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };

  return { db: db as never, tx };
}

describe('manual product contents persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes contents when creating a product without publishing it', async () => {
    const { db, tx } = productWriteDb();

    await createAdminProduct(productInput(), db);

    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verifiedContents: contents,
          published: false,
          lifecycleState: 'DRAFT',
        }),
      }),
    );
  });

  it('replaces contents through normal product editing and keeps empty contents valid', async () => {
    const { db, tx } = productWriteDb();

    await updateAdminProduct('product-1', productInput({ contents: [] }), db);

    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-1' },
        data: expect.objectContaining({
          verifiedContents: [],
          published: false,
          lifecycleState: 'DRAFT',
        }),
      }),
    );
  });
});
