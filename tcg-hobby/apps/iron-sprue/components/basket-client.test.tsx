import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IRON_SPRUE_BASKET_STORAGE_KEY,
  IRON_SPRUE_LEGACY_BASKET_STORAGE_KEYS,
  IRON_SPRUE_PENDING_PAYMENT_BASKET_STORAGE_KEY,
  addIronSprueBasketItem,
  addIronSprueBasketItemWithLiveStock,
  clearIronSprueBasketAfterPaidCheckout,
  hasIronSpruePendingPaymentBasket,
  holdIronSprueBasketForPendingPayment,
  readIronSprueBasketCount,
  restoreIronSprueBasketAfterFailedPayment,
  updateIronSprueBasketItemQuantity,
} from './basket-client';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

const queenAnne = {
  productId: 'is-cub-queen-anne',
  productName: "Queen Anne's Revenge",
  productSlug: 'cubicfun-queen-annes-revenge',
  unitPriceMinor: 2999,
  quantity: 1,
};

const toyota = {
  productId: 'is-aos-05628',
  productName: 'Toyota 2000GT Red',
  productSlug: 'aoshima-05628-toyota-2000gt-red',
  unitPriceMinor: 1999,
  quantity: 1,
};

describe('Iron Sprue basket persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('CustomEvent', class CustomEvent<T = unknown> extends Event {
      detail: T | undefined;
      constructor(type: string, init?: CustomEventInit<T>) {
        super(type);
        this.detail = init?.detail;
      }
    });
    vi.stubGlobal('window', {
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('clears every basket persistence layer after paid checkout before later additions hydrate', async () => {
    addIronSprueBasketItem(queenAnne);
    for (const key of IRON_SPRUE_LEGACY_BASKET_STORAGE_KEYS) {
      window.localStorage.setItem(key, JSON.stringify([queenAnne]));
      window.sessionStorage.setItem(key, JSON.stringify([queenAnne]));
    }

    await clearIronSprueBasketAfterPaidCheckout();
    addIronSprueBasketItem(toyota);

    expect(readIronSprueBasketCount()).toBe(1);
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toEqual([toyota]);
    for (const key of IRON_SPRUE_LEGACY_BASKET_STORAGE_KEYS) {
      expect(window.localStorage.getItem(key)).toBeNull();
      expect(window.sessionStorage.getItem(key)).toBeNull();
    }
  });

  it('keeps basket state intact when checkout is cancelled', () => {
    addIronSprueBasketItem(queenAnne);
    addIronSprueBasketItem(toyota);

    expect(readIronSprueBasketCount()).toBe(2);
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toHaveLength(2);
  });

  it('hides the visible basket during payment processing while keeping it recoverable', () => {
    addIronSprueBasketItem(queenAnne);
    addIronSprueBasketItem(toyota);

    expect(hasIronSpruePendingPaymentBasket()).toBe(false);

    const held = holdIronSprueBasketForPendingPayment();

    expect(held).toHaveLength(2);
    expect(hasIronSpruePendingPaymentBasket()).toBe(true);
    expect(readIronSprueBasketCount()).toBe(0);
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toEqual([]);
    expect(JSON.parse(window.sessionStorage.getItem(IRON_SPRUE_PENDING_PAYMENT_BASKET_STORAGE_KEY) ?? '[]')).toHaveLength(2);
  });

  it('restores the exact basket after a failed embedded payment attempt', () => {
    addIronSprueBasketItem(queenAnne);
    addIronSprueBasketItem(toyota);
    holdIronSprueBasketForPendingPayment();

    const restored = restoreIronSprueBasketAfterFailedPayment();

    expect(restored).toEqual([queenAnne, toyota]);
    expect(hasIronSpruePendingPaymentBasket()).toBe(false);
    expect(readIronSprueBasketCount()).toBe(2);
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toEqual([queenAnne, toyota]);
    expect(window.sessionStorage.getItem(IRON_SPRUE_PENDING_PAYMENT_BASKET_STORAGE_KEY)).toBeNull();
  });

  it('rejects an already out-of-stock product before it enters the basket', () => {
    const result = addIronSprueBasketItem({ ...toyota, availableQuantity: 0 });

    expect(result).toEqual({ ok: false, message: 'This item is out of stock.' });
    expect(readIronSprueBasketCount()).toBe(0);
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toEqual([]);
  });

  it('checks live stock before a stale storefront add enters the guest basket', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ ...toyota, availableQuantity: 0, inStock: false }],
      }),
    } as Response);

    const result = await addIronSprueBasketItemWithLiveStock({ ...toyota, availableQuantity: 9 });

    expect(result).toEqual({ ok: false, message: 'This item is out of stock.' });
    expect(readIronSprueBasketCount()).toBe(0);
  });

  it('accepts live stock confirmation when the resolver returns the canonical database product id for a SKU request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          ...toyota,
          productId: 'iron-sprue-admin-product-db-id',
          availableQuantity: 2,
          inStock: true,
        }],
      }),
    } as Response);

    const result = await addIronSprueBasketItemWithLiveStock({ ...toyota, productId: 'IS-AOS-05628', availableQuantity: 2 });

    expect(result).toEqual({ ok: true, message: 'Added to basket' });
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toEqual([{
      ...toyota,
      productId: 'IS-AOS-05628',
      availableQuantity: 2,
      imageAlt: toyota.productName,
      imageUrl: null,
    }]);
  });

  it('caps a stale storefront add to live available stock', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ ...toyota, availableQuantity: 1, inStock: true }],
      }),
    } as Response);

    const result = await addIronSprueBasketItemWithLiveStock({ ...toyota, quantity: 3, availableQuantity: 9 });

    expect(result).toEqual({ ok: true, message: 'Only 1 available. Basket quantity has been capped.' });
    expect(readIronSprueBasketCount()).toBe(1);
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toEqual([{ ...toyota, quantity: 1, availableQuantity: 1, imageAlt: toyota.productName, imageUrl: null }]);
  });

  it('caps basket quantity at the current available-to-sell quantity', () => {
    const limitedToyota = { ...toyota, availableQuantity: 1 };

    expect(addIronSprueBasketItem(limitedToyota).ok).toBe(true);
    const secondAdd = addIronSprueBasketItem(limitedToyota);

    expect(secondAdd).toEqual({ ok: true, message: 'Only 1 available. Basket quantity has been capped.' });
    expect(readIronSprueBasketCount()).toBe(1);
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toEqual([{ ...limitedToyota, quantity: 1 }]);
  });

  it('persists an order-review quantity decrease back to the basket', () => {
    addIronSprueBasketItem({ ...toyota, quantity: 2, availableQuantity: 3 });

    const result = updateIronSprueBasketItemQuantity({ productId: toyota.productId, availableQuantity: 3 }, 1);

    expect(result).toMatchObject({ quantity: 1, capped: false, limit: 3 });
    expect(readIronSprueBasketCount()).toBe(1);
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toEqual([{ ...toyota, quantity: 1, availableQuantity: 3 }]);
  });

  it('persists an order-review quantity increase and caps it at available stock', () => {
    addIronSprueBasketItem({ ...toyota, quantity: 1, availableQuantity: 2 });

    const increased = updateIronSprueBasketItemQuantity({ productId: toyota.productId, availableQuantity: 2 }, 2);
    const capped = updateIronSprueBasketItemQuantity({ productId: toyota.productId, availableQuantity: 2 }, 3);

    expect(increased).toMatchObject({ quantity: 2, capped: false, limit: 2 });
    expect(capped).toMatchObject({ quantity: 2, capped: true, limit: 2 });
    expect(readIronSprueBasketCount()).toBe(2);
    expect(JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]')).toEqual([{ ...toyota, quantity: 2, availableQuantity: 2 }]);
  });
});
