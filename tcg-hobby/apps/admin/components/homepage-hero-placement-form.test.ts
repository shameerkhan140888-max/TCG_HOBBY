import { describe, expect, it } from 'vitest';
import { getRecommendedHeroDisplayMode, resolveHeroPreviewImage } from '../lib/hero-display';

describe('homepage hero display recommendation', () => {
  it('uses contained mode only when known product-image dimensions are portrait oriented', () => {
    expect(getRecommendedHeroDisplayMode(1500, 1071)).toBe('FULL_BLEED');
    expect(getRecommendedHeroDisplayMode(1000, 1000)).toBe('FULL_BLEED');
    expect(getRecommendedHeroDisplayMode(800, 1200)).toBe('CONTAINED');
    expect(getRecommendedHeroDisplayMode(null, null)).toBe('FULL_BLEED');
  });

  it('uses the same source order as the storefront and reports custom fallback', () => {
    const productImage = { url: '/products/primary.webp', altText: 'Primary product image' };
    expect(resolveHeroPreviewImage({
      imageSource: 'PRODUCT',
      customImageUrl: '/heroes/retained.webp',
      productImage,
    })).toEqual({
      url: '/products/primary.webp',
      alt: 'Primary product image',
      fallbackUsed: false,
    });
    expect(resolveHeroPreviewImage({
      imageSource: 'CUSTOM',
      customImageUrl: '/heroes/custom.webp',
      customImageAlt: 'Promotional artwork',
      productImage,
    })).toEqual({
      url: '/heroes/custom.webp',
      alt: 'Promotional artwork',
      fallbackUsed: false,
    });
    expect(resolveHeroPreviewImage({
      imageSource: 'CUSTOM',
      customImageUrl: '',
      productImage,
    })).toEqual({
      url: '/products/primary.webp',
      alt: 'Primary product image',
      fallbackUsed: true,
    });
    expect(resolveHeroPreviewImage({
      imageSource: 'CUSTOM',
      customImageUrl: '',
      productImage: null,
    })).toEqual({
      url: '',
      alt: 'Hero preview',
      fallbackUsed: true,
    });
  });
});
