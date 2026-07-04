import { describe, expect, it } from 'vitest';
import { seedCategories, seedProducts, toCatalogueCategory, toMoney, isCatalogueProductVisible } from './seed-data';

describe('database seed data', () => {
  it('builds catalogue categories with product counts in the UI shape', () => {
    const category = toCatalogueCategory(seedCategories[0]!, 3);

    expect(category).toEqual({
      id: 'cat-sealed',
      name: 'Sealed Product',
      slug: 'sealed-product',
      description: 'Booster boxes, bundles, and collector products ready for shelf display.',
      sortOrder: 1,
      productCount: 3,
    });
  });

  it('creates money objects in minor units', () => {
    expect(toMoney(11999)).toEqual({ amountMinor: 11999, currency: 'GBP' });
  });

  it('marks seeded published products as visible', () => {
    expect(isCatalogueProductVisible(seedProducts[0]!)).toBe(true);
  });

  it('includes preorder release metadata in the seed set', () => {
    expect(seedProducts.some((product) => product.releaseStatus === 'PREORDER')).toBe(true);
  });
});
