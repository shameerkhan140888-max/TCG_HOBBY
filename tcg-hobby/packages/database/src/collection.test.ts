import { describe, expect, it, vi } from 'vitest';
import { calculateCollectionStats, upsertCollectionItem, updateCollectionItemQuantity } from './collection';

function createDbMock() {
  return {
    collection: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    collectionItem: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  } as any;
}

describe('collection repository', () => {
  it('calculates collection stats from owned items', () => {
    const stats = calculateCollectionStats([
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Alpha',
        productSlug: 'alpha',
        game: 'Magic: The Gathering',
        categoryName: 'Singles',
        setName: 'Set A',
        ownedQuantity: 2,
        printVariant: 'HOLO',
        condition: 'NEAR_MINT',
        foil: true,
        language: 'EN',
        notes: null,
        dateAcquired: '2026-07-01T00:00:00.000Z',
        purchasePriceMinor: 1000,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'item-2',
        productId: 'prod-2',
        productName: 'Beta',
        productSlug: 'beta',
        game: 'Pokemon',
        categoryName: 'Singles',
        setName: 'Set B',
        ownedQuantity: 1,
        printVariant: 'REGULAR',
        condition: 'LIGHTLY_PLAYED',
        foil: false,
        language: 'EN',
        notes: null,
        dateAcquired: '2026-07-02T00:00:00.000Z',
        purchasePriceMinor: 500,
        createdAt: '2026-07-02T00:00:00.000Z',
        updatedAt: '2026-07-02T00:00:00.000Z',
      },
    ]);

    expect(stats.cardsOwned).toBe(3);
    expect(stats.setsRepresented).toBe(2);
    expect(stats.productsRepresented).toBe(2);
    expect(stats.favouriteGame).toBe('Magic: The Gathering');
  });

  it('increments the owned quantity when importing the same collection item again', async () => {
    const db = createDbMock();
    db.collection.findUnique.mockResolvedValue({ id: 'collection-1' });
    db.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      slug: 'alpha',
      name: 'Alpha',
    });
    db.collectionItem.upsert.mockResolvedValue({ id: 'item-1' });

    await upsertCollectionItem(
      'user-1',
      {
        productId: 'prod-1',
        ownedQuantity: 2,
        printVariant: 'REGULAR',
        condition: 'NEAR_MINT',
        foil: false,
        language: 'EN',
        notes: null,
        dateAcquired: null,
        purchasePriceMinor: 1000,
      },
      db,
    );

    expect(db.collectionItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          ownedQuantity: {
            increment: 2,
          },
        }),
      }),
    );
  });

  it('removes collection items when quantity is reduced to zero', async () => {
    const db = createDbMock();
    db.collectionItem.findFirst.mockResolvedValue({ id: 'item-1' });

    await updateCollectionItemQuantity('user-1', 'item-1', 0, db);

    expect(db.collectionItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
  });
});
