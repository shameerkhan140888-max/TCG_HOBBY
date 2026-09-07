import { describe, expect, it } from 'vitest';
import { promoPanels } from './storefront';

describe('Iron Sprue storefront showcase cards', () => {
  it('uses one stable page destination per homepage showcase card', () => {
    expect(promoPanels.map((panel) => panel.href)).toEqual([
      '/bundles',
      '/shop/cubicfun',
      '/shop/pintoo',
    ]);
  });
});
