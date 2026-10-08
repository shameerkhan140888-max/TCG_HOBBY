import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import launchProducts from '../../../data/launch-products.json';
import type { IronSprueProduct } from '../../../lib/catalogue';
import ShopShowcasePage from './page';

const products = launchProducts as IronSprueProduct[];

vi.mock('../../../lib/admin-storefront-controls', () => ({
  getIronSprueStorefrontProducts: vi.fn(async () => products),
}));

vi.mock('../../../components/basket-client', () => ({
  AddToBasketButton: () => <button type="button">Add to basket</button>,
}));

describe('Iron Sprue shop showcase routes', () => {
  it('renders paints and weathering as a coming soon stock range', async () => {
    const markup = renderToStaticMarkup(await ShopShowcasePage({
      params: Promise.resolve({ slug: 'paints-weathering' }),
      searchParams: Promise.resolve({}),
    }));

    expect(markup).toContain('Paint and weathering stock range coming soon');
    expect(markup).toContain('Browse current stock');
    expect(markup).not.toContain('No products match those filters.');
  });

  it('keeps display-builds as a canonical 3D builds route alias', async () => {
    const markup = renderToStaticMarkup(await ShopShowcasePage({
      params: Promise.resolve({ slug: 'display-builds' }),
      searchParams: Promise.resolve({}),
    }));

    expect(markup).toContain('Display builds');
    expect(markup).toContain('29 products');
    expect(markup).toContain('Magic Box  London at Night');
    expect(markup).not.toContain('No products match those filters.');
  });

  it('keeps 3d-puzzles as a legacy alias for the live 3D builds route', async () => {
    const markup = renderToStaticMarkup(await ShopShowcasePage({
      params: Promise.resolve({ slug: '3d-puzzles' }),
      searchParams: Promise.resolve({}),
    }));

    expect(markup).toContain('3D puzzles and builds');
    expect(markup).toContain('29 products');
    expect(markup).toContain('Magic Box  London at Night');
    expect(markup).not.toContain('No products match those filters.');
  });
});
