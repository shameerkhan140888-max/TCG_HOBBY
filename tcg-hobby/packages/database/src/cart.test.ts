import { describe, expect, it, vi } from 'vitest';
import { addProductToCart, clearCart, getCustomerCartDetails, updateCartItemQuantity } from './cart';

function createDbMock() {
  return {
    cart: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
    },
    cartItem: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  } as any;
}

describe('cart repository', () => {
  it('calculates cart totals from persisted cart items', async () => {
    const db = createDbMock();
    db.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      currency: 'GBP',
      items: [
        {
          id: 'item-1',
          quantity: 2,
          unitPriceMinor: 1250,
          product: {
            id: 'prod-1',
            slug: 'alpha',
            name: 'Alpha',
            priceMinor: 1250,
            currency: 'GBP',
            inventory: { stockOnHand: 5, reservedStock: 1 },
          },
        },
        {
          id: 'item-2',
          quantity: 1,
          unitPriceMinor: 499,
          product: {
            id: 'prod-2',
            slug: 'beta',
            name: 'Beta',
            priceMinor: 499,
            currency: 'GBP',
            inventory: { stockOnHand: 5, reservedStock: 0 },
          },
        },
      ],
    });

    const cart = await getCustomerCartDetails('user-1', db);

    expect(cart.subtotalMinor).toBe(2999);
    expect(cart.totalItems).toBe(3);
    expect(cart.items[0]?.productName).toBe('Alpha');
  });

  it('prevents adding more units than are available in stock', async () => {
    const db = createDbMock();
    db.product.findFirst.mockResolvedValue({
      id: 'prod-1',
      slug: 'alpha',
      name: 'Alpha',
      priceMinor: 1250,
      inventory: { stockOnHand: 2, reservedStock: 0 },
    });
    db.cart.findUnique.mockImplementation(async (args: any) => {
      if (args?.select) {
        return { items: [] };
      }

      return null;
    });
    db.cart.create.mockResolvedValue({ id: 'cart-1' });

    await expect(addProductToCart('user-1', 'prod-1', 3, db)).rejects.toThrow('Only 2 in stock for this item.');
    expect(db.product.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          {
            published: true,
            lifecycleState: 'PUBLISHED',
            archivedAt: null,
            releaseStatus: { not: 'ARCHIVED' },
          },
          {
            id: 'prod-1',
            releaseStatus: 'RELEASED',
          },
        ],
      },
    }));
  });

  it('prevents adding more units than the customer purchase limit', async () => {
    const db = createDbMock();
    db.product.findFirst.mockResolvedValue({
      id: 'prod-1',
      slug: 'pokemon-tcg-mega-greninja-ex-premium-collection',
      name: 'Pokemon TCG: Mega Greninja ex Premium Collection',
      priceMinor: 4999,
      customerPurchaseLimit: 1,
      inventory: { stockOnHand: 3, reservedStock: 0 },
    });
    db.cart.findUnique.mockImplementation(async (args: any) => {
      if (args?.select) {
        return { items: [{ quantity: 1 }] };
      }

      return { id: 'cart-1', currency: 'GBP', items: [] };
    });

    await expect(addProductToCart('user-1', 'prod-1', 1, db)).rejects.toThrow('Limited to one collection per person or household.');
  });

  it('removes an item when the requested quantity drops to zero', async () => {
    const db = createDbMock();
    db.product.findFirst.mockResolvedValue({
      id: 'prod-1',
      slug: 'alpha',
      name: 'Alpha',
      priceMinor: 1250,
      inventory: { stockOnHand: 5, reservedStock: 0 },
    });
    db.cart.findUnique.mockImplementation(async (args: any) => {
      if (args?.select) {
        return { items: [{ quantity: 1 }] };
      }

      return { id: 'cart-1', currency: 'GBP', items: [] };
    });
    db.cart.create.mockResolvedValue({ id: 'cart-1' });

    await updateCartItemQuantity('user-1', 'prod-1', 0, db);

    expect(db.cartItem.deleteMany).toHaveBeenCalledWith({
      where: {
        cartId: 'cart-1',
        productId: 'prod-1',
      },
    });
  });

  it('rejects hidden or unpublished products before cart mutation', async () => {
    const db = createDbMock();
    db.product.findFirst.mockResolvedValue(null);

    await expect(addProductToCart('user-1', 'prod-hidden', 1, db)).rejects.toThrow('The selected product is unavailable.');
    expect(db.cart.create).not.toHaveBeenCalled();
    expect(db.cartItem.upsert).not.toHaveBeenCalled();
  });

  it('clears all cart items for the user', async () => {
    const db = createDbMock();
    db.cart.findUnique.mockResolvedValue({ id: 'cart-1' });
    db.cartItem.deleteMany.mockResolvedValue({ count: 2 });
    db.cart.findUnique.mockImplementation(async (args: any) => {
      if (args?.select) {
        return { items: [] };
      }

      return { id: 'cart-1', currency: 'GBP', items: [] };
    });

    await clearCart('user-1', db);

    expect(db.cartItem.deleteMany).toHaveBeenCalledWith({
      where: {
        cartId: 'cart-1',
      },
    });
  });
});
