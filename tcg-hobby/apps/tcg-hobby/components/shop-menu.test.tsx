import { describe, expect, it } from 'vitest';
import { shopMenuGroups } from './shop-menu';

describe('ShopMenu navigation data', () => {
  it('keeps the desktop mega-menu links grouped in the approved order', () => {
    expect(shopMenuGroups.map((group) => group.title)).toEqual(['Games', 'Store']);
    expect(shopMenuGroups[0].links.map((link) => [link.label, link.href])).toEqual([
      ['Pokémon', '/shop/pokemon'],
      ['Magic: The Gathering', '/shop/magic-the-gathering'],
      ['Yu-Gi-Oh!', '/shop/yugioh'],
      ['One Piece', '/shop/one-piece'],
    ]);
    expect(shopMenuGroups[1].links.map((link) => [link.label, link.href])).toEqual([
      ['Sealed Products', '/shop?category=sealed-product'],
      ['Accessories', '/shop/accessories'],
      ['Pre-orders', '/releases'],
      ['Coming Soon', '/coming-soon'],
    ]);
  });
});
