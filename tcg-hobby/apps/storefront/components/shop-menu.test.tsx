import { describe, expect, it } from 'vitest';
import { shopMenuGroups } from './shop-menu';

describe('ShopMenu navigation data', () => {
  it('keeps the desktop mega-menu links grouped in the approved order', () => {
    expect(shopMenuGroups.map((group) => group.title)).toEqual(['Games', 'Store']);
    expect(shopMenuGroups[0].links.map((link) => [link.label, link.href])).toEqual([
      ['Pokémon', '/catalogue?q=Pokemon'],
      ['Magic: The Gathering', '/catalogue?q=Magic'],
      ['Yu-Gi-Oh!', '/catalogue?q=Yu-Gi-Oh'],
      ['One Piece', '/catalogue?q=One+Piece'],
    ]);
    expect(shopMenuGroups[1].links.map((link) => [link.label, link.href])).toEqual([
      ['Sealed Products', '/catalogue?category=sealed-product'],
      ['Accessories', '/catalogue?category=accessories'],
      ['Pre-orders', '/releases'],
      ['Coming Soon', '/coming-soon'],
    ]);
  });
});
