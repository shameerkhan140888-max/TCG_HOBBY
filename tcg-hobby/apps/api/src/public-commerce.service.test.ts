import { describe, expect, it } from 'vitest';
import type { CatalogueProduct } from '@tcg-hobby/types';
import { publicStockState, toPublicProductSummary } from './public-commerce.service.js';

function product(overrides: Partial<CatalogueProduct> = {}): CatalogueProduct {
  return {
    id: 'product-1', slug: 'test-product', name: 'Test Product', brand: 'TCG Hobby', game: 'Pokemon TCG',
    productType: 'Booster Pack', description: 'Description', categoryName: 'Pokemon TCG', categorySlug: 'pokemon-tcg',
    price: { amountMinor: 499, currency: 'GBP' }, featured: false, inStock: true, stockOnHand: 3, reservedStock: 0,
    supplierName: 'Private Supplier', badge: 'Badge', imageLabel: 'Test', imageUrl: '/products/test.webp', imageAlt: 'Test product box',
    releaseStatus: 'RELEASED', ...overrides,
  };
}

describe('public commerce projection', () => {
  it('derives stable public stock states', () => {
    expect(publicStockState(0)).toBe('OUT_OF_STOCK');
    expect(publicStockState(3)).toBe('LOW_STOCK');
    expect(publicStockState(4)).toBe('IN_STOCK');
  });

  it('returns storefront-safe data without exact stock or supplier details', () => {
    const result = toPublicProductSummary(product());
    expect(result.stockState).toBe('LOW_STOCK');
    expect(result.image?.url).toBe('https://tcg-hobby.co.uk/products/test.webp');
    expect(result).not.toHaveProperty('stockOnHand');
    expect(result).not.toHaveProperty('reservedStock');
    expect(result).not.toHaveProperty('supplierName');
  });

  it('does not mark unreleased products as purchasable', () => {
    expect(toPublicProductSummary(product({ releaseStatus: 'COMING_SOON' })).purchasable).toBe(false);
  });
});
