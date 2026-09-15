import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import launchProducts from '../data/launch-products.json';
import type { IronSprueProduct } from '../lib/catalogue';
import { CatalogueListing } from './catalogue-listing';

const products = launchProducts as IronSprueProduct[];

vi.mock('../lib/admin-storefront-controls', () => ({
  getIronSprueStorefrontProducts: vi.fn(async () => products),
}));

vi.mock('./basket-client', () => ({
  AddToBasketButton: () => <button type="button">Add to basket</button>,
}));

describe('Iron Sprue catalogue listing filters', () => {
  it('scopes brand facets to the selected model-kit range', async () => {
    const markup = renderToStaticMarkup(await CatalogueListing({
      fixedCategory: 'model-kits',
      searchParams: {},
      title: 'Model kits',
    }));

    expect(markup).toContain('<option value="Aoshima">Aoshima</option>');
    expect(markup).not.toContain('<option value="CubicFun">CubicFun</option>');
    expect(markup).not.toContain('<option value="Pintoo">Pintoo</option>');
  });
});
