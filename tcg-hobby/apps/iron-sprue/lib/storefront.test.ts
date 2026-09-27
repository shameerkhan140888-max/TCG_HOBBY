import { describe, expect, it } from 'vitest';
import type { IronSprueProduct } from './catalogue';
import { productCardMobileFact, productCardOffer, promoPanels } from './storefront';

describe('Iron Sprue storefront showcase cards', () => {
  it('uses one stable page destination per homepage showcase card', () => {
    expect(promoPanels.map((panel) => panel.href)).toEqual([
      '/bundles',
      '/shop/cubicfun',
      '/shop/pintoo',
    ]);
  });

  it('uses the live CubicFun starting price on the display-build showcase card', () => {
    expect(promoPanels.find((panel) => panel.eyebrow === 'CubicFun display builds')?.title).toBe('From £5.99');
  });

  it('keeps homepage showcase copy balanced in length', () => {
    const copyLengths = promoPanels.map((panel) => panel.copy.length);
    const shortest = Math.min(...copyLengths);
    const longest = Math.max(...copyLengths);

    expect(longest - shortest).toBeLessThanOrEqual(12);
  });

  it('shows piece count ahead of finished size on product cards', () => {
    const product = {
      sku: 'IS-CUB-OM3606',
      slug: 'cubicfun-om3606-magic-box-london-at-night',
      name: 'Magic Box London at Night',
      brand: 'CubicFun',
      category: 'Magic Boxes',
      productType: '3D puzzle display build',
      stockQuantity: 1,
      shortDescription: 'Magic Box London at Night.',
      specifications: { pieces: '27', size: '16cm x 16cm x 26cm' },
    } satisfies IronSprueProduct;

    expect(productCardMobileFact(product)).toEqual({ category: 'Magic Boxes', fact: '27 pieces' });
  });

  it('derives the Magic Box launch offer for card display only', () => {
    const product = {
      sku: 'IS-CUB-OM3606',
      slug: 'cubicfun-om3606-magic-box-london-at-night',
      name: 'Magic Box London at Night',
      brand: 'CubicFun',
      category: 'Magic Boxes',
      productType: '3D puzzle display build',
      retailPriceMinor: 699,
    } as IronSprueProduct;

    expect(productCardOffer(product)).toEqual({
      currentPrice: '£6.99',
      compareAtPrice: '£10.49',
      saving: '£3.50',
      label: 'Save £3.50',
    });
  });

  it('derives bundle card savings from compare-at pricing', () => {
    const product = {
      sku: 'IS-BUN-CUB-LANDMARK-TRIO',
      slug: 'cubicfun-landmark-trio',
      name: 'CubicFun Landmark Trio',
      brand: 'Iron Sprue',
      category: 'Bundles',
      productType: 'Bundle',
      retailPriceMinor: 3199,
      compareAtPriceMinor: 3597,
    } as IronSprueProduct;

    expect(productCardOffer(product)).toMatchObject({
      currentPrice: '£31.99',
      compareAtPrice: '£35.97',
      saving: '£3.98',
      label: 'Save £3.98',
    });
  });

  it('derives crossed-out Basilica offer pricing from compare-at pricing', () => {
    const product = {
      sku: 'IS-CUB-C112H',
      slug: 'cubicfun-c112h-basilica-of-the-national-shrine',
      name: 'Basilica of the National Shrine',
      brand: 'CubicFun',
      category: 'Architecture',
      productType: '3D puzzle display build',
      retailPriceMinor: 599,
      compareAtPriceMinor: 749,
    } as IronSprueProduct;

    expect(productCardOffer(product)).toEqual({
      currentPrice: '£5.99',
      compareAtPrice: '£7.49',
      saving: '£1.50',
      label: 'Save £1.50',
    });
  });
});
