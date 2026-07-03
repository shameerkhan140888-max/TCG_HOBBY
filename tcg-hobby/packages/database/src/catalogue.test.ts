import { afterEach, describe, expect, it } from 'vitest';
import { getCatalogueProducts, getCatalogueProductBySlug } from './catalogue';

const originalNodeEnv = process.env.NODE_ENV;
const originalDataSource = process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE;

afterEach(() => {
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

describe('catalogue queries', () => {
  it('filters products by category and search term', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE = 'seed';

    const result = await getCatalogueProducts({
      search: 'magic',
      category: 'events',
      sort: 'featured',
      page: 1,
      pageSize: 10,
    });

    expect(result.pagination.page).toBe(1);
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.products.every((product) => product.categorySlug === 'events')).toBe(true);
    expect(result.products.every((product) => product.game.toLowerCase().includes('magic'))).toBe(true);
  });

  it('sorts products by price ascending and descending', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE = 'seed';

    const ascending = await getCatalogueProducts({
      search: '',
      category: '',
      sort: 'price-asc',
      page: 1,
      pageSize: 10,
    });

    const descending = await getCatalogueProducts({
      search: '',
      category: '',
      sort: 'price-desc',
      page: 1,
      pageSize: 10,
    });

    const ascendingPrices = ascending.products.map((product) => product.price.amountMinor);
    const descendingPrices = descending.products.map((product) => product.price.amountMinor);

    expect([...ascendingPrices].sort((a, b) => a - b)).toEqual(ascendingPrices);
    expect([...descendingPrices].sort((a, b) => b - a)).toEqual(descendingPrices);
  });

  it('paginates results without overlapping pages', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE = 'seed';

    const pageOne = await getCatalogueProducts({
      search: '',
      category: '',
      sort: 'featured',
      page: 1,
      pageSize: 3,
    });

    const pageTwo = await getCatalogueProducts({
      search: '',
      category: '',
      sort: 'featured',
      page: 2,
      pageSize: 3,
    });

    expect(pageOne.pagination.page).toBe(1);
    expect(pageTwo.pagination.page).toBe(2);
    expect(pageOne.products.map((product) => product.id)).not.toEqual(pageTwo.products.map((product) => product.id));
  });

  it('returns product detail objects with related product objects', async () => {
    process.env.NODE_ENV = 'development';
    process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE = 'seed';

    const product = await getCatalogueProductBySlug('arcane-booster-box');

    expect(product).not.toBeNull();
    expect(product?.relatedProducts.length).toBeGreaterThan(0);
    expect(product?.relatedProducts.every((item) => typeof item.slug === 'string')).toBe(true);
  });
});
