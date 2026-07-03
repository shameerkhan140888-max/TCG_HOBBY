import { describe, expect, it, vi } from 'vitest';
import {
  addProductToWishlist,
  getWishlistItems,
  getWishlistProductIds,
  isProductWishlisted,
  removeProductFromWishlist,
  toggleWishlistItem,
} from './wishlist';

function createDbMock(overrides: Record<string, unknown> = {}) {
  return {
    wishlist: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    wishlistItem: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    ...overrides,
  } as any;
}

describe('wishlist repository', () => {
  it('returns product ids for a wishlist', async () => {
    const db = createDbMock();
    db.wishlist.findUnique.mockResolvedValue({
      items: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
    });

    await expect(getWishlistProductIds('user-1', db)).resolves.toEqual(['prod-1', 'prod-2']);
  });

  it('reports wishlist membership from the database', async () => {
    const db = createDbMock();
    db.wishlist.findUnique.mockResolvedValue({
      items: [{ id: 'item-1' }],
    });

    await expect(isProductWishlisted('user-1', 'prod-1', db)).resolves.toBe(true);
  });

  it('creates wishlist entries when toggled on and removes them when toggled off', async () => {
    const db = createDbMock();
    let wishlistExists = false;
    let wishlisted = false;
    db.wishlist.findUnique.mockImplementation(async () =>
      wishlistExists
        ? {
            id: 'wishlist-1',
            items: wishlisted ? [{ id: 'item-1' }] : [],
          }
        : null,
    );
    db.wishlist.create.mockImplementation(async () => {
      wishlistExists = true;
      return { id: 'wishlist-1' };
    });
    db.wishlistItem.upsert.mockImplementation(async () => {
      wishlisted = true;
    });
    db.wishlistItem.deleteMany.mockImplementation(async () => {
      wishlisted = false;
    });

    await expect(toggleWishlistItem('user-1', 'prod-1', db)).resolves.toEqual({ wishlisted: true });
    await expect(toggleWishlistItem('user-1', 'prod-1', db)).resolves.toEqual({ wishlisted: false });

    expect(db.wishlist.create).toHaveBeenCalledWith({ data: { userId: 'user-1' } });
    expect(db.wishlistItem.upsert).toHaveBeenCalled();
    expect(db.wishlistItem.deleteMany).toHaveBeenCalled();
  });

  it('removes items only when a wishlist exists', async () => {
    const db = createDbMock();
    db.wishlist.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'wishlist-1' });

    await expect(removeProductFromWishlist('user-1', 'prod-1', db)).resolves.toBe(false);
    await expect(addProductToWishlist('user-1', 'prod-1', db)).resolves.toBe(true);
  });

  it('maps wishlist items to catalogue product shapes', async () => {
    const db = createDbMock();
    db.wishlist.findUnique.mockResolvedValue({
      items: [
        {
          id: 'item-1',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          product: {
            id: 'prod-1',
            slug: 'alpha-card',
            name: 'Alpha Card',
            game: 'Magic: The Gathering',
            description: 'A test card',
            featured: true,
            imageLabel: 'Card',
            category: {
              name: 'Singles',
              slug: 'singles',
            },
            inventory: {
              stockOnHand: 5,
              reservedStock: 1,
            },
            supplierProducts: [
              {
                supplier: {
                  name: 'Card Citadel',
                },
              },
            ],
            priceMinor: 1234,
            currency: 'GBP',
          },
        },
      ],
    });

    const items = await getWishlistItems('user-1', db);

    expect(items).toHaveLength(1);
    expect(items[0]?.product.slug).toBe('alpha-card');
    expect(items[0]?.product.inStock).toBe(true);
  });
});
