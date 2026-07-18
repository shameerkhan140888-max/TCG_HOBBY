import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCatalogueProducts: vi.fn(),
  getCatalogueMasterDataOptions: vi.fn(),
  getCurrentCustomerSession: vi.fn(async () => null),
  getCustomerNotificationSubscriptions: vi.fn(async () => []),
  getWishlistProductIds: vi.fn(async () => []),
}));

vi.mock('@tcg-hobby/database', () => ({
  getCatalogueMasterDataOptions: mocks.getCatalogueMasterDataOptions,
  getCatalogueProducts: mocks.getCatalogueProducts,
  getCustomerNotificationSubscriptions: mocks.getCustomerNotificationSubscriptions,
  getWishlistProductIds: mocks.getWishlistProductIds,
}));

vi.mock('../../lib/auth', () => ({
  getCurrentCustomerSession: mocks.getCurrentCustomerSession,
}));

vi.mock('../../components/site-header', () => ({
  SiteHeader: () => <header>Storefront Header</header>,
}));

vi.mock('../../components/cart-actions', () => ({
  AddToCartButton: ({ productId }: { productId: string }) => <button type="button">Add {productId}</button>,
}));

vi.mock('../../lib/wishlist', () => ({
  toggleWishlistAction: vi.fn(),
}));

vi.mock('../../lib/release-actions', () => ({
  toggleNotificationAction: vi.fn(),
}));

import CataloguePage from './page';

describe('CataloguePage', () => {
  it('renders catalogue results when filter master data is temporarily unavailable', async () => {
    mocks.getCatalogueProducts.mockResolvedValue({
      products: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
      },
      categories: [],
      filters: {},
    });
    mocks.getCatalogueMasterDataOptions.mockRejectedValue(new Error('database unavailable'));

    const markup = renderToStaticMarkup(await CataloguePage({ searchParams: Promise.resolve({ q: 'mega' }) }));

    expect(markup).toContain('Storefront Header');
    expect(markup).toContain('Browse products with search and filters');
    expect(markup).toContain('All games');
    expect(markup).toContain('No products match those filters');
    expect(mocks.getCatalogueProducts).toHaveBeenCalledWith(expect.objectContaining({ search: 'mega' }));
  });

  it('does not hide catalogue product query failures as empty results', async () => {
    mocks.getCatalogueProducts.mockRejectedValue(new Error('database unavailable'));
    mocks.getCatalogueMasterDataOptions.mockResolvedValue({
      games: [],
      brands: [],
      productTypes: [],
      languages: [],
      sets: [],
      categories: [],
    });

    await expect(CataloguePage({ searchParams: Promise.resolve({ q: 'mega' }) })).rejects.toThrow('database unavailable');
  });
});
