import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ShopShowcasePage from './page';

vi.mock('../../../lib/admin-storefront-controls', () => ({
  getIronSprueStorefrontProducts: vi.fn(async () => []),
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
});
