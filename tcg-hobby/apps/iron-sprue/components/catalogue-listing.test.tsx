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

  it('renders one canonical filter form for responsive presentations', async () => {
    const markup = renderToStaticMarkup(await CatalogueListing({
      searchParams: { brand: 'Aoshima', scale: '1-32' },
      title: 'Shop',
    }));

    expect(markup.match(/id="brand-filter-/g) ?? []).toHaveLength(1);
    expect(markup.match(/id="scale-filter-/g) ?? []).toHaveLength(1);
    expect(markup).toContain('catalogue-filter-shell');
    expect(markup).not.toContain('mobile-filter-drawer');
    expect(markup).not.toContain('filter-panel');
  });

  it('uses architecture search for the 3D builds architecture view', async () => {
    const markup = renderToStaticMarkup(await CatalogueListing({
      fixedCategory: '3d-puzzles-and-builds',
      searchParams: { search: 'architecture' },
      title: '3D puzzles and builds',
    }));

    expect(markup).not.toContain('No products match those filters.');
    expect(markup).toContain('Burj Khalifa');
    expect(markup).toContain('Famous Architecture');
  });

  it('promotes Magic Boxes first on the default 3D display builds page', async () => {
    const markup = renderToStaticMarkup(await CatalogueListing({
      fixedCategory: '3d-puzzles-and-builds',
      searchParams: {},
      title: '3D puzzles and builds',
    }));

    const underwaterIndex = markup.indexOf('Magic Box  Underwater World');
    const londonIndex = markup.indexOf('Magic Box  London at Night');
    const architectureIndex = markup.indexOf('Basilica of the National Shrine');

    expect(londonIndex).toBeGreaterThanOrEqual(0);
    expect(underwaterIndex).toBeGreaterThanOrEqual(0);
    expect(architectureIndex).toBeGreaterThanOrEqual(0);
    expect(londonIndex).toBeLessThan(underwaterIndex);
    expect(underwaterIndex).toBeLessThan(architectureIndex);
  });
});
